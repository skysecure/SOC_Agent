import axios from 'axios';
import { getAzureToken, clearTokenCache } from './azureAuthService.js';
import dotenv from 'dotenv';

dotenv.config();

// Debug mode flag
const DEBUG = process.env.SENTINEL_DEBUG === 'true';

// Validate Sentinel configuration
const requiredSentinelVars = [
  'AZURE_SUBSCRIPTION_ID',
  'AZURE_RESOURCE_GROUP',
  'AZURE_WORKSPACE_NAME',
  'SENTINEL_OWNER_EMAIL',
  'SENTINEL_OWNER_UPN',
  'SENTINEL_OWNER_OBJECT_ID',
  'SENTINEL_OWNER_NAME',
  'AZURE_MANAGEMENT_API_URL',
  'SENTINEL_API_VERSION'
];

requiredSentinelVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required Sentinel configuration: ${varName}`);
  } else if (DEBUG) {
    console.log(`✅ Sentinel config ${varName} is set`);
  }
});

if (DEBUG) {
  console.log('🔍 Sentinel Service Debug Mode Enabled');
  console.log('Configured Sentinel workspace:', {
    subscription: process.env.AZURE_SUBSCRIPTION_ID ? '***' + process.env.AZURE_SUBSCRIPTION_ID.slice(-4) : 'NOT SET',
    resourceGroup: process.env.AZURE_RESOURCE_GROUP,
    workspace: process.env.AZURE_WORKSPACE_NAME,
    apiVersion: process.env.SENTINEL_API_VERSION,
    assignTo: process.env.SENTINEL_OWNER_EMAIL
  });
}

export async function updateSentinelIncident(incidentId, severity, additionalDetails = {}) {
  console.log('\n🚀 Starting Sentinel incident update process');
  console.log('Input parameters:', {
    incidentId: incidentId,
    severity: severity,
    hasAdditionalDetails: Object.keys(additionalDetails).length > 0
  });

  try {
    const token = await getAzureToken();
    
    // Extract incident name from various ID formats
    let incidentName = incidentId;
    if (incidentId.includes('/')) {
      // Handle full ARM resource ID
      incidentName = incidentId.split('/').pop();
      console.log(`📝 Extracted incident name from ARM ID: ${incidentName}`);
    }
    
    const apiUrl = buildSentinelApiUrl(incidentName);

    // Fetch existing incident to preserve immutable fields like title
    const tokenPreview = DEBUG ? '(token preview hidden)' : '';
    if (DEBUG) {
      console.log('📥 Fetching existing incident to preserve title');
    }
    const existingIncident = await fetchExistingIncident(apiUrl, token);
    const existingTitle = existingIncident?.properties?.title;
    if (DEBUG) {
      console.log('Existing Sentinel incident fields:', {
        hasTitle: !!existingTitle,
        titlePreview: existingTitle ? existingTitle.substring(0, 80) : 'N/A'
      });
    }

    if (!existingTitle || (typeof existingTitle === 'string' && existingTitle.trim().length === 0)) {
      throw new Error('Existing Sentinel incident title not found; aborting update to avoid changing title/description');
    }

    const updatePayload = buildUpdatePayload(severity, additionalDetails, existingTitle);

    console.log(`🎯 Updating Sentinel incident: ${incidentName}`);
    
    if (DEBUG) {
      console.log('API Request Details:', {
        method: 'PUT',
        url: apiUrl,
        headers: {
          'Authorization': `Bearer ${token ? '***' + token.slice(-10) : 'NO TOKEN'}`,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(updatePayload, null, 2)
      });
    } else {
      console.log(`API URL: ${apiUrl}`);
    }
    
    const startTime = Date.now();
    const response = await axios.put(apiUrl, updatePayload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const requestTime = Date.now() - startTime;

    console.log(`✅ Sentinel incident updated successfully (${requestTime}ms)`);
    
    if (DEBUG) {
      console.log('Response details:', {
        status: response.status,
        statusText: response.statusText,
        incidentId: response.data?.name,
        etag: response.data?.etag,
        lastModified: response.data?.properties?.lastModifiedTimeUtc
      });
    }
    
    // After successful update, add a comment with changes and brief RCA (do not modify description/title)
    try {
      const commentMessage = buildIncidentComment(severity, additionalDetails);
      if (commentMessage) {
        await addIncidentComment(incidentName, token, commentMessage);
        if (DEBUG) {
          console.log('🗒️  Added incident comment with RCA summary');
        }
      } else if (DEBUG) {
        console.log('No comment content provided; skipping comment creation');
      }
    } catch (commentError) {
      console.error('⚠️  Failed to add incident comment:', commentError.message);
    }

    return {
      success: true,
      incidentId: incidentName,
      assignedTo: process.env.SENTINEL_OWNER_EMAIL,
      severity: updatePayload.properties.severity,
      timestamp: new Date().toISOString(),
      response: response.data,
      requestDuration: requestTime
    };

  } catch (error) {
    // Handle token expiration
    if (error.response?.status === 401) {
      console.log('🔄 Token expired, clearing cache and retrying...');
      clearTokenCache();
      // Retry once with fresh token
      return updateSentinelIncident(incidentId, severity, additionalDetails);
    }
    
    console.error('❌ Sentinel update failed');
    
    if (DEBUG) {
      console.error('Detailed error information:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        error: error.response?.data?.error,
        message: error.response?.data?.error?.message || error.message,
        code: error.response?.data?.error?.code,
        correlation_id: error.response?.headers?.['x-ms-correlation-request-id'],
        timestamp: new Date().toISOString(),
        requestUrl: error.config?.url,
        requestMethod: error.config?.method
      });
      
      if (error.response?.data) {
        console.error('Full error response:', JSON.stringify(error.response.data, null, 2));
      }
    } else {
      console.error('Error details:', {
        status: error.response?.status,
        message: error.response?.data?.error?.message || error.message
      });
    }
    
    // Provide specific guidance based on error
    if (error.response?.status === 404) {
      console.error('💡 Hint: Check if the incident ID exists in Sentinel and the resource path is correct');
    } else if (error.response?.status === 403) {
      console.error('💡 Hint: Verify the app registration has "Microsoft Sentinel Contributor" role');
    } else if (error.response?.status === 400) {
      console.error('💡 Hint: Check the request payload format and required fields');
    }
    
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
      status: error.response?.status,
      incidentId: incidentId,
      timestamp: new Date().toISOString()
    };
  }
}

function buildSentinelApiUrl(incidentName) {
  const baseUrl = process.env.AZURE_MANAGEMENT_API_URL;
  const subscription = process.env.AZURE_SUBSCRIPTION_ID;
  const resourceGroup = process.env.AZURE_RESOURCE_GROUP;
  const workspace = process.env.AZURE_WORKSPACE_NAME;
  const apiVersion = process.env.SENTINEL_API_VERSION;
  
  const url = `${baseUrl}/subscriptions/${subscription}/resourceGroups/${resourceGroup}/providers/Microsoft.OperationalInsights/workspaces/${workspace}/providers/Microsoft.SecurityInsights/incidents/${incidentName}?api-version=${apiVersion}`;
  
  if (DEBUG) {
    console.log('🔗 Built Sentinel API URL:', {
      baseUrl,
      subscription: subscription ? '***' + subscription.slice(-4) : 'NOT SET',
      resourceGroup,
      workspace,
      incidentName,
      apiVersion,
      fullUrl: url
    });
  }
  
  return url;
}

function buildUpdatePayload(severity, additionalDetails, existingTitle) {
  const normalizedSeverity = normalizeSeverityForSentinel(severity);
  
  // Determine safe, non-empty title (prefer explicit values, ignore empty/whitespace)
  // Always use existing title provided by Sentinel; never synthesize or change
  const candidateTitle = existingTitle;
  const safeTitle = (typeof candidateTitle === 'string' && candidateTitle.trim().length > 0)
    ? candidateTitle.trim()
    : existingTitle;

  // Determine description with sensible fallback; trim if provided
  // Do not modify description per requirements; omit from payload so Sentinel keeps existing

  // Remove forbidden fields from extra properties to avoid accidental overrides
  const extraProperties = { ...(additionalDetails.properties || {}) };
  if (extraProperties && typeof extraProperties === 'object') {
    delete extraProperties.title;
    delete extraProperties.description;
  }

  return {
    properties: {
      // Allow callers to pass extra properties, but do not let them blank out required fields
      ...extraProperties,

      // Enforce required/controlled fields LAST so they cannot be overridden by spread
      title: safeTitle,
      severity: normalizedSeverity,
      status: 'Active',
      owner: {
        objectId: process.env.SENTINEL_OWNER_OBJECT_ID,
        email: process.env.SENTINEL_OWNER_EMAIL,
        userPrincipalName: process.env.SENTINEL_OWNER_UPN,
        assignedTo: process.env.SENTINEL_OWNER_NAME
      }
    }
  };
}

async function fetchExistingIncident(apiUrl, token) {
  try {
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    if (process.env.SENTINEL_DEBUG === 'true') {
      console.error('Failed to fetch existing incident:', error.response?.status, error.response?.data?.error || error.message);
    }
    return null;
  }
}

function buildIncidentComment(severity, additionalDetails) {
  // Use provided comment if any; otherwise build a concise summary
  const lines = [];
  if (additionalDetails.comment && typeof additionalDetails.comment === 'string' && additionalDetails.comment.trim().length > 0) {
    lines.push(additionalDetails.comment.trim());
  }
  // Use description as the primary RCA body if provided by caller
  if (additionalDetails.description && typeof additionalDetails.description === 'string' && additionalDetails.description.trim().length > 0) {
    lines.push(additionalDetails.description.trim());
  }
  
  if (additionalDetails.rcaBrief && typeof additionalDetails.rcaBrief === 'string' && additionalDetails.rcaBrief.trim().length > 0) {
    lines.push(`RCA: ${additionalDetails.rcaBrief.trim()}`);
  }

  if (additionalDetails.changes && typeof additionalDetails.changes === 'string' && additionalDetails.changes.trim().length > 0) {
    lines.push(`Changes: ${additionalDetails.changes.trim()}`);
  }

  // Always include severity change note if available in context
  if (severity) {
    lines.push(`AI-assessed severity: ${severity}`);
  }

  const message = lines.join('\n');
  return message.trim().length > 0 ? message : null;
}

async function addIncidentComment(incidentName, token, message) {
  const baseUrl = process.env.AZURE_MANAGEMENT_API_URL;
  const subscription = process.env.AZURE_SUBSCRIPTION_ID;
  const resourceGroup = process.env.AZURE_RESOURCE_GROUP;
  const workspace = process.env.AZURE_WORKSPACE_NAME;
  const apiVersion = process.env.SENTINEL_API_VERSION;

  // Use PUT with a generated comment ID per Sentinel API
  const commentId = `auto-${Date.now()}`;
  const commentsUrl = `${baseUrl}/subscriptions/${subscription}/resourceGroups/${resourceGroup}/providers/Microsoft.OperationalInsights/workspaces/${workspace}/providers/Microsoft.SecurityInsights/incidents/${incidentName}/comments/${commentId}?api-version=${apiVersion}`;

  await axios.put(commentsUrl, { properties: { message: message } }, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}

function normalizeSeverityForSentinel(severity) {
  // Sentinel expects specific casing: Low, Medium, High, Informational
  const severityMap = {
    'low': 'Low',
    'medium': 'Medium', 
    'high': 'High',
    'informational': 'Informational',
    'critical': 'High', // Map critical to High as Sentinel doesn't have Critical
    'unknown': 'Medium' // Default fallback
  };
  
  const normalized = severityMap[severity.toLowerCase()] || 'Medium';
  
  if (DEBUG) {
    console.log(`🔄 Normalizing severity: "${severity}" → "${normalized}"`);
    if (!severityMap[severity.toLowerCase()]) {
      console.log(`⚠️  Warning: Unknown severity "${severity}", defaulting to "Medium"`);
    }
  }
  
  return normalized;
}

// Export helper to validate Sentinel connectivity
export async function validateSentinelConnection() {
  try {
    const token = await getAzureToken();
    return {
      connected: true,
      hasToken: !!token,
      configuration: {
        subscription: process.env.AZURE_SUBSCRIPTION_ID,
        resourceGroup: process.env.AZURE_RESOURCE_GROUP,
        workspace: process.env.AZURE_WORKSPACE_NAME,
        assignee: process.env.SENTINEL_OWNER_EMAIL
      }
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}