// Provider-agnostic AI service
// This service automatically routes to the correct AI provider based on AI_PROVIDER env variable

import axios from 'axios';
import { buildPrompt } from '../utils/promptBuilder.js';

// Provider configurations from environment
const AI_PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    endpoint: process.env.GEMINI_ENDPOINT || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    apiKeyEnv: 'GEMINI_API_KEY',
    modelEnv: 'GEMINI_MODEL',
    type: 'gemini'
  },
  openai: {
    name: 'OpenAI',
    endpoint: process.env.OPENAI_BASE_URL,
    apiKeyEnv: 'OPENAI_API_KEY',
    deploymentEnv: 'OPENAI_DEPLOYMENT',
    type: 'openai'
  },
  anthropic: {
    name: 'Anthropic Claude',
    endpoint: process.env.ANTHROPIC_ENDPOINT || 'https://api.anthropic.com/v1/messages',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    modelEnv: 'ANTHROPIC_MODEL',
    type: 'anthropic'
  },
  custom: {
    name: process.env.CUSTOM_LLM_NAME || 'Custom LLM',
    endpoint: process.env.CUSTOM_LLM_ENDPOINT,
    apiKeyEnv: 'CUSTOM_LLM_API_KEY',
    modelEnv: 'CUSTOM_LLM_MODEL',
    type: process.env.CUSTOM_LLM_TYPE || 'openai' // Default to OpenAI-compatible
  }
};

/**
 * Call AI with provider-agnostic interface
 * @param {string} agentName - Agent type (RCA_ANALYST, EMAIL_VERIFIER, CHAT_ASSISTANT, etc.)
 * @param {Object} promptData - Data for prompt building (incidentData, htmlContent, rcaData, etc.)
 * @param {Object} options - Additional options
 * @param {number} options.temperature - Temperature for generation (default: 0.7)
 * @param {number} options.maxTokens - Max tokens for response (default: 8000)
 * @returns {Promise<string>} AI response text
 */
export async function callAI(agentName, promptData, options = {}) {
  const provider = process.env.AI_PROVIDER || 'gemini';
  let { temperature = 0.7, maxTokens = 8000 } = options;
  
  // Adjust maxTokens for GPT-5 models which need higher limits due to reasoning tokens
  if (provider === 'openai' || provider === 'custom') {
    const deployment = process.env.OPENAI_DEPLOYMENT || process.env.OPENAI_MODEL || 'gpt-4';
    if (/gpt-5/i.test(deployment)) {
      maxTokens = Math.max(maxTokens, 20000); // Ensure minimum 20k tokens for GPT-5
    }
  }
  
  // Log agent activation - START
  console.log('\n' + '='.repeat(60));
  console.log(`[AI Service] AGENT ACTIVATION - START`);
  console.log(`[AI Service] Agent: ${agentName}`);
  console.log(`[AI Service] Provider: ${provider}`);
  console.log(`[AI Service] Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  // Validate provider
  const providerConfig = AI_PROVIDERS[provider];
  if (!providerConfig) {
    throw new Error(`Unknown AI provider: ${provider}. Available: ${Object.keys(AI_PROVIDERS).join(', ')}`);
  }
  
  // Build prompt using centralized system
  const prompt = buildPrompt(agentName, {
    ...promptData,
    provider
  });
  
  console.log(`[AI Service] Prompt length: ${prompt.length} characters`);
  console.log(`[AI Service] Temperature: ${temperature}`);
  console.log(`[AI Service] Max tokens: ${maxTokens}`);
  
  try {
    // Route to appropriate provider handler
    let response;
    switch (providerConfig.type) {
      case 'gemini':
        response = await callGeminiProvider(providerConfig, prompt, temperature, maxTokens);
        break;
      case 'openai':
        response = await callOpenAIProvider(providerConfig, prompt, temperature, maxTokens);
        break;
      case 'anthropic':
        response = await callAnthropicProvider(providerConfig, prompt, temperature, maxTokens);
        break;
      default:
        response = await callOpenAIProvider(providerConfig, prompt, temperature, maxTokens); // Default to OpenAI-compatible
    }
    
    // Log agent completion - END
    console.log(`[AI Service] Response received, length: ${response.length} characters`);
    console.log(`[AI Service] AGENT ACTIVATION - END`);
    console.log(`[AI Service] Agent: ${agentName}`);
    console.log(`[AI Service] Duration: ${new Date().toISOString()}`);
    console.log('='.repeat(60) + '\n');
    
    return response;
  } catch (error) {
    console.error(`[AI Service] AGENT ACTIVATION - ERROR`);
    console.error(`[AI Service] Agent: ${agentName}`);
    console.error(`[AI Service] Error: ${error.message}`);
    console.log('='.repeat(60) + '\n');
    throw error;
  }
}

/**
 * Call Gemini-type provider
 */
async function callGeminiProvider(config, prompt, temperature, maxTokens) {
  try {
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) {
      throw new Error(`${config.name} API key not configured. Please set ${config.apiKeyEnv} in .env file`);
    }
    
    console.log(`[AI Service] Calling ${config.name} API...`);
    
    const response = await axios.post(
      config.endpoint,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey
        }
      }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    return text;
  } catch (error) {
    console.error(`[AI Service] ${config.name} API error:`, error.response?.data || error.message);
    throw new Error(`${config.name} API failed: ${error.message}`);
  }
}

/**
 * Call OpenAI-type provider
 */
async function callOpenAIProvider(config, prompt, temperature, maxTokens) {
  try {
    const apiKey = process.env[config.apiKeyEnv];
    const baseURL = config.endpoint;
    const deployment = process.env[config.deploymentEnv] || process.env[config.modelEnv] || 'gpt-4';
    
    if (!apiKey || apiKey.includes('<your')) {
      throw new Error(`${config.name} API key not configured. Please set ${config.apiKeyEnv} in .env file`);
    }
    
    if (!baseURL) {
      throw new Error(`${config.name} endpoint not configured. Please set endpoint in .env file`);
    }
    
    console.log(`[AI Service] Calling ${config.name} API...`);

    // Some models (e.g., GPT-5 family) only support default temperature of 1
    const supportsCustomTemp = !/gpt-5/i.test(deployment);

    const payload = {
      model: deployment,
      messages: [
        {
          role: "system",
          content: "You are an expert AI assistant. Follow the instructions precisely."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: supportsCustomTemp ? temperature : 1
    };

    // Add the appropriate token parameter based on model type
    if (/gpt-5/i.test(deployment)) {
      payload.max_completion_tokens = maxTokens;
    } else {
      payload.max_tokens = maxTokens;
    }

    let response;
    try {
      response = await axios.post(
        `${baseURL}chat/completions`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey, // Azure OpenAI uses 'api-key' header
            'Authorization': `Bearer ${apiKey}` // Standard OpenAI uses Bearer token
          }
        }
      );
    } catch (err) {
      const e = err.response?.data?.error;
      if (err.response?.status === 400 && e?.param === 'temperature' && e?.code === 'unsupported_value') {
        console.warn('[AI Service] Temperature unsupported for this model; retrying with default temperature 1');
        payload.temperature = 1;
        response = await axios.post(
          `${baseURL}chat/completions`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'api-key': apiKey,
              'Authorization': `Bearer ${apiKey}`
            }
          }
        );
      } else {
        throw err;
      }
    }
    
    if (!response.data.choices || response.data.choices.length === 0) {
      throw new Error('No choices in OpenAI response');
    }
    
    // Add comprehensive logging to debug empty responses
    console.log(`[AI Service] OpenAI API Response Structure:`, {
      hasData: !!response.data,
      hasChoices: !!response.data.choices,
      choicesLength: response.data.choices?.length || 0,
      firstChoice: response.data.choices?.[0] || null,
      firstChoiceMessage: response.data.choices?.[0]?.message || null,
      firstChoiceContent: response.data.choices?.[0]?.message?.content || null,
      contentLength: response.data.choices?.[0]?.message?.content?.length || 0
    });
    
    const text = response.data.choices[0].message?.content || '';
    
    if (!text || text.trim().length === 0) {
      console.error(`[AI Service] Empty content received from OpenAI API`);
      console.error(`[AI Service] Full response data:`, JSON.stringify(response.data, null, 2));
      
      // Check if this is due to token limits
      if (response.data.choices?.[0]?.finish_reason === 'length') {
        const usage = response.data.usage;
        const completionTokens = usage?.completion_tokens || 0;
        const reasoningTokens = usage?.completion_tokens_details?.reasoning_tokens || 0;
        
        console.error(`[AI Service] Response truncated due to token limits:`);
        console.error(`[AI Service] - Completion tokens used: ${completionTokens}`);
        console.error(`[AI Service] - Reasoning tokens used: ${reasoningTokens}`);
        console.error(`[AI Service] - Max tokens set: ${maxTokens}`);
        
        throw new Error(`Response truncated due to token limits. Increase maxTokens (current: ${maxTokens}, used: ${completionTokens + reasoningTokens})`);
      }
      
      throw new Error('OpenAI API returned empty content');
    }
    
    return text;
  } catch (error) {
    console.error(`[AI Service] ${config.name} API error:`, error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      throw new Error(`${config.name} API authentication failed. Please check your API key.`);
    } else if (error.response?.status === 404) {
      throw new Error(`${config.name} endpoint not found. Please check your configuration.`);
    }
    
    throw new Error(`${config.name} API failed: ${error.message}`);
  }
}

/**
 * Call Anthropic Claude provider
 */
async function callAnthropicProvider(config, prompt, temperature, maxTokens) {
  try {
    const apiKey = process.env[config.apiKeyEnv];
    const model = process.env[config.modelEnv] || 'claude-3-opus-20240229';
    
    if (!apiKey) {
      throw new Error(`${config.name} API key not configured. Please set ${config.apiKeyEnv} in .env file`);
    }
    
    console.log(`[AI Service] Calling ${config.name} API...`);
    
    const response = await axios.post(
      config.endpoint,
      {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [{
          role: 'user',
          content: prompt
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      }
    );
    
    return response.data.content[0].text;
  } catch (error) {
    console.error(`[AI Service] ${config.name} API error:`, error.response?.data || error.message);
    throw new Error(`${config.name} API failed: ${error.message}`);
  }
}

// Export direct provider access for testing
export { callGeminiProvider, callOpenAIProvider, callAnthropicProvider };