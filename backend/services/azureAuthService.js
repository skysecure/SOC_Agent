import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Token cache to minimize API calls
let tokenCache = {
  accessToken: null,
  expiresAt: null
};

// Validate required environment variables
const requiredEnvVars = [
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID', 
  'AZURE_CLIENT_SECRET',
  'AZURE_LOGIN_URL',
  'AZURE_MANAGEMENT_API_URL'
];

// Debug mode flag
const DEBUG = process.env.SENTINEL_DEBUG === 'true';

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
  } else if (DEBUG) {
    console.log(`✅ Environment variable ${varName} is configured`);
  }
});

if (DEBUG) {
  console.log('🔍 Azure Auth Service Debug Mode Enabled');
  console.log('Configured Azure endpoints:', {
    loginUrl: process.env.AZURE_LOGIN_URL,
    tenantId: process.env.AZURE_TENANT_ID ? '***' + process.env.AZURE_TENANT_ID.slice(-4) : 'NOT SET',
    clientId: process.env.AZURE_CLIENT_ID ? '***' + process.env.AZURE_CLIENT_ID.slice(-4) : 'NOT SET',
    managementUrl: process.env.AZURE_MANAGEMENT_API_URL
  });
}

export async function getAzureToken() {
  // Return cached token if still valid
  if (tokenCache.accessToken && tokenCache.expiresAt > Date.now()) {
    const remainingTime = Math.round((tokenCache.expiresAt - Date.now()) / 1000);
    if (DEBUG) {
      console.log(`🔐 Using cached Azure token (expires in ${remainingTime} seconds)`);
    }
    return tokenCache.accessToken;
  }

  try {
    const tokenUrl = `${process.env.AZURE_LOGIN_URL}/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
    const scope = `${process.env.AZURE_MANAGEMENT_API_URL}/.default`;
    
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      scope: scope
    });

    console.log('🔄 Requesting new Azure access token...');
    
    if (DEBUG) {
      console.log('Token request details:', {
        url: tokenUrl,
        grant_type: 'client_credentials',
        client_id: process.env.AZURE_CLIENT_ID ? '***' + process.env.AZURE_CLIENT_ID.slice(-4) : 'NOT SET',
        scope: scope
      });
    }
    
    const startTime = Date.now();
    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    const requestTime = Date.now() - startTime;

    // Cache token with buffer time
    tokenCache.accessToken = response.data.access_token;
    tokenCache.expiresAt = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min early
    
    console.log(`✅ Azure token obtained successfully (${requestTime}ms), expires in: ${response.data.expires_in} seconds`);
    
    if (DEBUG) {
      console.log('Token response details:', {
        token_type: response.data.token_type,
        expires_in: response.data.expires_in,
        ext_expires_in: response.data.ext_expires_in,
        token_preview: response.data.access_token ? '***' + response.data.access_token.slice(-10) : 'NO TOKEN'
      });
    }
    
    return tokenCache.accessToken;
  } catch (error) {
    console.error('❌ Azure authentication failed');
    
    if (DEBUG) {
      console.error('Detailed error information:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        error: error.response?.data?.error,
        error_description: error.response?.data?.error_description,
        correlation_id: error.response?.data?.correlation_id,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('Error:', error.response?.data || error.message);
    }
    
    throw new Error(`Azure authentication failed: ${error.response?.data?.error_description || error.message}`);
  }
}

// Function to clear cached token (useful for error recovery)
export function clearTokenCache() {
  if (DEBUG) {
    console.log('🔄 Clearing Azure token cache');
  }
  tokenCache.accessToken = null;
  tokenCache.expiresAt = null;
}