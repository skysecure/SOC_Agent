// Test file to verify prompt consolidation
import { buildPrompt, estimateTokenCount, shouldUseShortVersion } from './utils/promptBuilder.js';
import { PROMPTS, getPromptWithData } from './config/prompts.js';

console.log('🧪 Testing Prompt Consolidation System\n');

// Test 1: Verify RCA Analyst prompt for both providers
console.log('1️⃣ Testing RCA Analyst Prompts:');
console.log('================================');

const sampleIncidentData = {
  id: 'INC-001',
  properties: {
    severity: 'medium',
    createdTimeUtc: '2024-01-15T10:30:00Z'
  }
};

// Test Gemini version
try {
  const geminiPrompt = buildPrompt('RCA_ANALYST', {
    incidentData: sampleIncidentData,
    provider: 'gemini'
  });
  console.log('✅ Gemini prompt built successfully');
  console.log(`   Length: ${geminiPrompt.length} characters`);
  console.log(`   Estimated tokens: ${estimateTokenCount(geminiPrompt)}`);
  console.log(`   Contains incident data: ${geminiPrompt.includes('INC-001')}`);
} catch (error) {
  console.error('❌ Failed to build Gemini prompt:', error.message);
}

// Test OpenAI version
try {
  const openaiPrompt = buildPrompt('RCA_ANALYST', {
    incidentData: sampleIncidentData,
    provider: 'openai',
    useShortVersion: true
  });
  console.log('✅ OpenAI prompt built successfully');
  console.log(`   Length: ${openaiPrompt.length} characters`);
  console.log(`   Estimated tokens: ${estimateTokenCount(openaiPrompt)}`);
  console.log(`   Contains incident data: ${openaiPrompt.includes('INC-001')}`);
} catch (error) {
  console.error('❌ Failed to build OpenAI prompt:', error.message);
}

// Test 2: Verify Email Verifier prompt
console.log('\n2️⃣ Testing Email Verifier Prompt:');
console.log('==================================');

const sampleHtml = '<div>Sample HTML Report</div>';
const sampleRcaData = {
  incidentDetails: {
    typeOfIncident: 'Brute Force Attack',
    affectedService: 'Azure AD'
  }
};

try {
  const emailPrompt = buildPrompt('EMAIL_VERIFIER', {
    htmlContent: sampleHtml,
    rcaData: sampleRcaData,
    provider: 'gemini'
  });
  console.log('✅ Email verifier prompt built successfully');
  console.log(`   Length: ${emailPrompt.length} characters`);
  console.log(`   Contains HTML: ${emailPrompt.includes('Sample HTML Report')}`);
  console.log(`   Contains RCA data: ${emailPrompt.includes('Brute Force Attack')}`);
} catch (error) {
  console.error('❌ Failed to build Email verifier prompt:', error.message);
}

// Test 3: Verify Chat Assistant prompt
console.log('\n3️⃣ Testing Chat Assistant Prompt:');
console.log('=================================');

const chatContext = 'Current incident: High severity ransomware attack';

try {
  const chatPrompt = buildPrompt('CHAT_ASSISTANT', {
    chatMode: 'incident',
    incidentContext: chatContext,
    provider: 'gemini'
  });
  console.log('✅ Chat assistant prompt built successfully');
  console.log(`   Length: ${chatPrompt.length} characters`);
  console.log(`   Contains context: ${chatPrompt.includes('ransomware attack')}`);
} catch (error) {
  console.error('❌ Failed to build Chat assistant prompt:', error.message);
}

// Test 4: Verify backward compatibility
console.log('\n4️⃣ Testing Backward Compatibility:');
console.log('===================================');

try {
  const agent1 = PROMPTS.AGENTS.RCA_ANALYST.getFullPrompt();
  console.log('✅ Agent1_instructions accessible via PROMPTS');
  console.log(`   Length: ${agent1.length} characters`);
} catch (error) {
  console.error('❌ Failed to access Agent1_instructions:', error.message);
}

// Test 5: Verify token counting
console.log('\n5️⃣ Testing Token Counting:');
console.log('==========================');

const longPrompt = 'a'.repeat(40000); // ~10k tokens
console.log(`Should use short version for OpenAI (40k chars): ${shouldUseShortVersion(longPrompt, 'openai')}`);
console.log(`Should use short version for Gemini (40k chars): ${shouldUseShortVersion(longPrompt, 'gemini')}`);

// Test 6: Verify all agents are configured
console.log('\n6️⃣ Verifying All Agents:');
console.log('========================');

const agents = ['RCA_ANALYST', 'EVIDENCE_COLLECTOR', 'DATA_COLLECTOR', 'EMAIL_VERIFIER', 'CHAT_ASSISTANT'];
agents.forEach(agent => {
  try {
    const agentConfig = PROMPTS.AGENTS[agent];
    console.log(`✅ ${agent}: ${agentConfig ? 'Configured' : 'Missing'}`);
  } catch (error) {
    console.error(`❌ ${agent}: Error - ${error.message}`);
  }
});

console.log('\n✨ Prompt consolidation testing complete!');