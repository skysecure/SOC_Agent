// Prompt Builder Utility
// Assembles prompts from centralized configuration for different providers

import { getPromptWithData } from '../config/prompts.js';

/**
 * Build a prompt for a specific agent and provider
 * @param {string} agentName - Name of the agent (e.g., 'RCA_ANALYST', 'EMAIL_VERIFIER')
 * @param {Object} options - Options for prompt building
 * @param {Object} options.incidentData - Incident data for RCA analysis
 * @param {string} options.htmlContent - HTML content for email verification
 * @param {Object} options.rcaData - RCA data for email verification
 * @param {string} options.chatMode - Chat mode for assistant
 * @param {string} options.incidentContext - Context for chat assistant
 * @param {boolean} options.useShortVersion - DEPRECATED - Now all providers use full prompts
 * @param {string} options.provider - AI provider ('gemini' or 'openai')
 * @returns {string} Assembled prompt ready for the AI provider
 */
export function buildPrompt(agentName, options = {}) {
  const {
    incidentData,
    htmlContent,
    rcaData,
    ackData,
    chatMode,
    incidentContext,
    useShortVersion = false,
    provider = 'gemini'
  } = options;

  // All providers now use the same full prompt
  // Short version logic has been removed

  // Build full prompt based on agent type
  try {
    switch (agentName) {
      case 'RCA_ANALYST':
        return buildRCAPrompt(incidentData, provider);
      
      case 'EMAIL_VERIFIER':
        return getPromptWithData('EMAIL_VERIFIER', { htmlContent, rcaData });
      
      case 'EMAIL_ACK_FORMATTER':
        return getPromptWithData('EMAIL_ACK_FORMATTER', { htmlContent, ackData });
      
      case 'CHAT_ASSISTANT':
        return getPromptWithData('CHAT_ASSISTANT', { chatMode, incidentContext });
      
      case 'EVIDENCE_COLLECTOR':
      case 'DATA_COLLECTOR':
        return getPromptWithData(agentName);
      
      default:
        throw new Error(`Unknown agent: ${agentName}`);
    }
  } catch (error) {
    console.error(`Error building prompt for ${agentName}:`, error);
    throw error;
  }
}

// DEPRECATED: Short prompt functionality removed
// All providers now use the same full prompts

/**
 * Build RCA analysis prompt with incident data
 */
function buildRCAPrompt(incidentData, provider) {
  const basePrompt = getPromptWithData('RCA_ANALYST');
  
  // Both providers now use the same full prompt
  return `${basePrompt}

INCIDENT DATA TO ANALYZE:
${JSON.stringify(incidentData, null, 2)}

IMPORTANT: You must analyze this incident following the exact 9-section RCA format specified in your instructions. Remember to:
1. Perform independent severity assessment (ignore any provided severity)
2. Provide detailed analysis (minimum 3-5 sentences per section)
3. Include specific evidence and metrics
4. Generate the response as a structured JSON object

The JSON response must include these keys:
1. incidentOverview (including typeOfIncident field)
2. timelineOfEvents 
3. detectionDetails
4. attackVectorAndTechniques
5. rootCauseAnalysis
6. scopeAndImpact
7. containmentAndRemediation
8. recommendationsActionsFollowUp
9. evidenceAndArtifacts
10. additionalDataRequirements

CRITICAL: The incidentOverview MUST include a specific "typeOfIncident" field with a clear, industry-standard incident classification.`;
}

/**
 * Get token count estimation for a prompt
 * Rough estimation: 1 token ≈ 4 characters
 */
export function estimateTokenCount(prompt) {
  return Math.ceil(prompt.length / 4);
}

/**
 * DEPRECATED: All providers now use full prompts
 * This function is kept for backward compatibility but always returns false
 */
export function shouldUseShortVersion(prompt, provider) {
  return false; // Always use full prompts
}

/**
 * Validate that all required data is present for a given agent
 */
export function validatePromptData(agentName, data) {
  const requirements = {
    RCA_ANALYST: ['incidentData'],
    EMAIL_VERIFIER: ['htmlContent', 'rcaData'],
    CHAT_ASSISTANT: ['chatMode', 'incidentContext'],
    EVIDENCE_COLLECTOR: [],
    DATA_COLLECTOR: []
  };
  
  const required = requirements[agentName] || [];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required data for ${agentName}: ${missing.join(', ')}`);
  }
  
  return true;
}

/**
 * Get a prompt by name (for backward compatibility)
 */
export function getPrompt(promptName) {
  // Map old names to new structure
  const mapping = {
    'Agent1_instructions': 'RCA_ANALYST',
    'Agent2_instructions': 'EVIDENCE_COLLECTOR',
    'datacollector_Agent_instructions': 'DATA_COLLECTOR'
  };
  
  const agentName = mapping[promptName] || promptName;
  return getPromptWithData(agentName);
}