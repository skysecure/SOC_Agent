import axios from 'axios';
import OpenAI from 'openai';
import { buildPrompt } from '../utils/promptBuilder.js';

// Normalize severity levels to allowed values
function normalizeSeverity(severity) {
  if (!severity) {
    console.log('WARNING: Severity normalization fallback - no severity provided');
    return null; // Don't assume medium
  }
  const normalized = severity.toLowerCase().trim();
  const severityMap = {
    'high': 'high',
    'medium': 'medium',
    'low': 'low',
    'unknown': 'informational',
    'info': 'informational',
    'informational': 'informational'
  };
  
  if (!severityMap[normalized]) {
    console.log(`WARNING: Severity normalization fallback - unknown severity "${severity}"`);
    return null; // Don't assume medium
  }
  
  return severityMap[normalized];
}

export async function analyzeIncident(incidentData) {
  const aiProvider = process.env.AI_PROVIDER || 'gemini';
  console.log(`Using AI Provider: ${aiProvider}`);
  
  if (aiProvider === 'openai') {
    return analyzeWithOpenAI(incidentData);
  } else {
    return analyzeWithGemini(incidentData);
  }
}

async function analyzeWithOpenAI(incidentData) {
  console.log('[OPENAI] Analyzing incident with OpenAI');
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_BASE_URL;
    const deployment = process.env.OPENAI_DEPLOYMENT;
    
    if (!apiKey || apiKey === '<your-azure-openai-key>') {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in .env file');
    }
    
    console.log('Using OpenAI with deployment:', deployment);
    
    // Build prompt using centralized system
    const prompt = buildPrompt('RCA_ANALYST', {
      incidentData,
      provider: 'openai'
    });
    
    console.log('Prompt length:', prompt.length, 'characters');
    
    // Using axios for Azure OpenAI compatibility
    console.log('Making request to:', `${baseURL}chat/completions`);
    console.log('With deployment:', deployment);
    
    const response = await axios.post(
      `${baseURL}chat/completions`,
      {
        model: deployment,
        messages: [
          {
            role: "system",
            content: "You are an expert cybersecurity analyst. Respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 1,  // GPT-5-mini only supports default value of 1
        max_completion_tokens: 20000  // Increased for GPT-5-mini
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey // Azure OpenAI uses 'api-key' header
        }
      }
    );
    
    console.log('Full OpenAI response status:', response.status);
    console.log('Full OpenAI response data:', JSON.stringify(response.data, null, 2));
    
    if (!response.data.choices || response.data.choices.length === 0) {
      throw new Error('No choices in OpenAI response');
    }
    
    const text = response.data.choices[0].message?.content || '';
    console.log('Raw OpenAI response length:', text.length);
    console.log('Raw OpenAI response preview:', text.substring(0, 200) + '...');
    
    if (!text) {
      throw new Error('Empty content in OpenAI response');
    }
    
    try {
      // Parse the JSON response
      let parsedResponse;
      
      // Try to fix common JSON issues
      let jsonText = text.trim();
      
      // Check if response is truncated (common with large responses)
      if (!jsonText.endsWith('}')) {
        console.log('Response appears truncated, attempting to fix...');
        // Count opening and closing braces
        const openBraces = (jsonText.match(/{/g) || []).length;
        const closeBraces = (jsonText.match(/}/g) || []).length;
        const openBrackets = (jsonText.match(/\[/g) || []).length;
        const closeBrackets = (jsonText.match(/\]/g) || []).length;
        
        // Add missing closing braces/brackets
        jsonText += ']'.repeat(openBrackets - closeBrackets);
        jsonText += '}'.repeat(openBraces - closeBraces);
      }
      
      parsedResponse = JSON.parse(jsonText);
      console.log('Successfully parsed OpenAI RCA response');
      console.log('Parsed severity values:', {
        initial: parsedResponse.incidentOverview?.initialSeverity,
        aiAssessed: parsedResponse.incidentOverview?.aiAssessedSeverity
      });
      
      // Use the same transformation logic
      return transformResponse(parsedResponse, incidentData);
      
    } catch (parseError) {
      console.error('OpenAI JSON parsing failed');
      console.error('Parse error details:', parseError.message);
      console.error('First 500 chars of response:', text.substring(0, 500));
      console.error('Last 500 chars of response:', text.substring(text.length - 500));
      
      // Try to create a minimal valid response
      try {
        const minimalResponse = {
          incidentOverview: {
            id: incidentData.id,
            executiveSummary: "Analysis completed but response was truncated.",
            aiAssessedSeverity: "high",
            initialSeverity: incidentData.properties?.severity || "medium"
          }
        };
        return transformResponse(minimalResponse, incidentData);
      } catch (fallbackError) {
        throw new Error(`OpenAI JSON parsing failed: ${parseError.message}`);
      }
    }
    
  } catch (error) {
    console.error('OpenAI API error details:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Error message:', error.message);
    
    if (error.response?.status === 401) {
      throw new Error('OpenAI API authentication failed. Please check your API key.');
    } else if (error.response?.status === 404) {
      throw new Error('OpenAI endpoint not found. Please check your base URL and deployment name.');
    } else if (error.response?.status === 400) {
      throw new Error(`OpenAI bad request: ${JSON.stringify(error.response?.data)}`);
    }
    
    throw new Error(`Failed to analyze incident with OpenAI: ${error.message}`);
  }
}

async function analyzeWithGemini(incidentData) {
  try {
    // Build prompt using centralized system
    const prompt = buildPrompt('RCA_ANALYST', {
      incidentData,
      provider: 'gemini'
    });

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': process.env.GEMINI_API_KEY
        }
      }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    console.log('Raw Gemini response length:', text.length);
    console.log('Raw Gemini response preview:', text.substring(0, 200) + '...');
    
    try {
      // Extract JSON from markdown code blocks or raw JSON
      let jsonString = text;
      
      // First try to extract from markdown code blocks
      const codeBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        console.log('Found JSON in code block');
        jsonString = codeBlockMatch[1].trim();
      } else {
        console.log('No code block found, looking for raw JSON');
        // Try to extract raw JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('Found raw JSON');
          jsonString = jsonMatch[0];
        } else {
          console.log('ERROR: No JSON found in response');
          console.log('Full response:', text);
          throw new Error('No JSON found in Gemini response');
        }
      }
      
      console.log('Attempting to parse JSON string length:', jsonString.length);
      // Parse the JSON
      const parsedResponse = JSON.parse(jsonString);
      console.log('Successfully parsed RCA response');
      console.log('Parsed severity values:', {
        initial: parsedResponse.incidentOverview?.initialSeverity,
        aiAssessed: parsedResponse.incidentOverview?.aiAssessedSeverity,
        validatedSeverity: parsedResponse.incidentOverview?.validatedSeverity
      });
        
        // Use the common transformation function
        const transformedResponse = transformResponse(parsedResponse, incidentData);
        console.log('Transformed response with incident type:', transformedResponse.incidentDetails.typeOfIncident);
        return transformedResponse;
    } catch (parseError) {
      console.error('JSON PARSING FAILED - This is likely why you\'re getting medium severity!');
      console.error('Parse error details:', parseError.message);
      console.error('Raw Gemini response (first 1000 chars):', text.substring(0, 1000));
      console.error('Raw Gemini response (last 500 chars):', text.substring(Math.max(0, text.length - 500)));
      
      // Don't return a fallback - throw error to surface the issue
      throw new Error(`JSON parsing failed: ${parseError.message}. Raw response length: ${text.length}`);
    }
    
    // This fallback should never be reached now
    console.error('CRITICAL: Reached unexpected fallback in geminiService');
    throw new Error('Unexpected code path - investigation needed');
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to analyze incident with Gemini');
  }
}

// Common transformation function for both providers
function transformResponse(parsedResponse, incidentData) {
  return {
    executiveSummary: parsedResponse.incidentOverview?.executiveSummary || 
                    parsedResponse.executiveSummary || 
                    "Analysis completed",
    
    incidentDetails: {
      id: parsedResponse.incidentOverview?.incidentId || 
          parsedResponse.incidentOverview?.id || 
          incidentData.id || 
          incidentData.properties?.id,
      owner: parsedResponse.incidentOverview?.owner || 
             parsedResponse.incidentOverview?.analyst || 
             incidentData.properties?.owner?.userPrincipalName || 
             "Unassigned",
      openedUTC: parsedResponse.incidentOverview?.openedUTC || 
                 parsedResponse.incidentOverview?.createdTimeUtc || 
                 incidentData.properties?.createdTimeUtc || 
                 incidentData.createdTimeUtc,
      status: parsedResponse.incidentOverview?.status || 
              incidentData.properties?.status || 
              "Active",
      detectionSource: parsedResponse.incidentOverview?.detectionSource || 
                      "Unknown",
      analyticsRuleName: parsedResponse.incidentOverview?.analyticsRuleName || 
                        incidentData.properties?.alertDisplayName || 
                        "N/A",
      environment: parsedResponse.incidentOverview?.environment || 
                  parsedResponse.incidentOverview?.tenant || 
                  "Production",
      affectedService: parsedResponse.incidentOverview?.affectedService || 
                      "Unknown",
      timestamp: parsedResponse.incidentOverview?.createdTimeUtc || 
                incidentData.properties?.createdTimeUtc || 
                incidentData.createdTimeUtc,
      affectedSystems: parsedResponse.scopeAndImpact?.systemsImpact?.countAndListOfAffectedServers || 
                     parsedResponse.scopeAndImpact?.systems || 
                     incidentData.entities || [],
      typeOfIncident: parsedResponse.incidentOverview?.typeOfIncident || 
                     parsedResponse.incidentOverview?.title || 
                     "Security Incident",
      affectedUsers: parsedResponse.incidentOverview?.affectedUPN || 
                    parsedResponse.incidentOverview?.affectedUsers || []
    },
    
    severityAssessment: {
      initialSeverity: normalizeSeverity(
        parsedResponse.incidentOverview?.initialSeverity || 
        incidentData.properties?.severity
      ) || 'informational',
      aiAssessedSeverity: normalizeSeverity(
        parsedResponse.incidentOverview?.aiAssessedSeverity || 
        parsedResponse.incidentOverview?.validatedSeverity || 
        parsedResponse.severityAssessment?.level
      ) || 'informational',
      severityParsingNote: !parsedResponse.incidentOverview?.aiAssessedSeverity ? 'AI severity not found in response - defaulted to informational' : null,
      severityMatch: parsedResponse.incidentOverview?.severityAssessment?.includes('Match') || 
                    (parsedResponse.incidentOverview?.initialSeverity === parsedResponse.incidentOverview?.aiAssessedSeverity),
      justification: parsedResponse.incidentOverview?.severityAssessment || 
                    parsedResponse.incidentOverview?.severityJustification || 
                    parsedResponse.severityAssessment?.justification || 
                    "Automated assessment based on incident analysis"
    },
    
    rootCauseAnalysis: parsedResponse.rootCauseAnalysis || { 
      primaryCause: parsedResponse.rootCauseAnalysis?.['PRIMARY ROOT CAUSE'] || "To be determined",
      contributingFactors: parsedResponse.rootCauseAnalysis?.['Contributing Factors'] || [],
      controlFailureAnalysis: parsedResponse.rootCauseAnalysis?.controlFailureAnalysis || {},
      vulnerabilityTimeline: parsedResponse.rootCauseAnalysis?.vulnerabilityTimeline || "",
      previousIncidents: parsedResponse.rootCauseAnalysis?.previousIncidents || "",
      riskAcceptance: parsedResponse.rootCauseAnalysis?.riskAcceptance || ""
    },
    
    impactAssessment: parsedResponse.scopeAndImpact || {
      systemsImpact: {},
      userImpact: {},
      dataImpact: {},
      businessImpact: {},
      complianceImpact: {},
      attackDuration: ""
    },
    
    recommendedActions: {
      immediate: parsedResponse.recommendationsActionsFollowUp?.immediateActions || 
                parsedResponse.recommendations?.immediateActions || 
                parsedResponse.containmentAndRemediation?.immediateContainment || [],
      shortTerm: parsedResponse.recommendationsActionsFollowUp?.shortTermImprovements || 
                parsedResponse.recommendations?.shortTermImprovements || [],
      longTerm: parsedResponse.recommendationsActionsFollowUp?.longTermStrategic || 
               parsedResponse.recommendations?.longTermStrategic || []
    },
    
    verdict: parsedResponse.recommendationsActionsFollowUp?.verdict || "Under Investigation",
    verdictRationale: parsedResponse.recommendationsActionsFollowUp?.verdictRationale || "",
    actionsTaken: parsedResponse.recommendationsActionsFollowUp?.actionsTaken || {},
    followUpTasks: parsedResponse.recommendationsActionsFollowUp?.followUpTasks || [],
    
    preventionMeasures: parsedResponse.recommendationsActionsFollowUp?.lessonsLearned || 
                       parsedResponse.recommendations?.lessonsLearned || [],
    
    // Store all parsed sections
    timelineOfEvents: parsedResponse.timelineOfEvents || [],
    detectionDetails: parsedResponse.detectionDetails || {},
    attackVectorAndTechniques: parsedResponse.attackVectorAndTechniques || {},
    containmentAndRemediation: parsedResponse.containmentAndRemediation || {},
    evidenceAndArtifacts: {
      ...parsedResponse.evidenceAndArtifacts,
      logFieldInterpretation: parsedResponse.evidenceAndArtifacts?.logFieldInterpretation || [],
      entityAppendices: parsedResponse.evidenceAndArtifacts?.entityAppendices || {
        ipAddresses: [],
        urls: [],
        domains: []
      }
    },
    additionalDataRequirements: parsedResponse.additionalDataRequirements || {},
    
    // Additional detailed RCA data
    fullRCAReport: parsedResponse
  };
}