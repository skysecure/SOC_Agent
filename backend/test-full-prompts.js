// Test that OpenAI now uses full prompt (same as Gemini)
import { buildPrompt, estimateTokenCount } from './utils/promptBuilder.js';

console.log('🔍 Testing OpenAI Full Prompt Implementation\n');

const testIncidentData = {
  id: 'TEST-OPENAI-001',
  properties: {
    severity: 'high',
    createdTimeUtc: '2024-01-20T15:30:00Z',
    title: 'Advanced Ransomware Attack'
  }
};

console.log('1️⃣ Building prompts for both providers:');
console.log('=========================================');

// Build Gemini prompt
const geminiPrompt = buildPrompt('RCA_ANALYST', {
  incidentData: testIncidentData,
  provider: 'gemini'
});

// Build OpenAI prompt
const openaiPrompt = buildPrompt('RCA_ANALYST', {
  incidentData: testIncidentData,
  provider: 'openai'
});

console.log('\n📊 Prompt Comparison:');
console.log('--------------------');
console.log(`Gemini prompt length: ${geminiPrompt.length} characters`);
console.log(`OpenAI prompt length: ${openaiPrompt.length} characters`);
console.log(`\nAre prompts identical? ${geminiPrompt === openaiPrompt ? '✅ YES' : '❌ NO'}`);

if (geminiPrompt !== openaiPrompt) {
  console.log('\n⚠️  Prompts differ! Showing differences:');
  console.log('Gemini length:', geminiPrompt.length);
  console.log('OpenAI length:', openaiPrompt.length);
} else {
  console.log('\n✅ SUCCESS: Both providers now use the exact same full prompt!');
}

console.log('\n2️⃣ Verifying prompt content:');
console.log('=============================');
console.log(`Contains full instructions: ${openaiPrompt.includes('THREAT SOPHISTICATION-BASED SEVERITY ASSESSMENT')}`);
console.log(`Contains incident data: ${openaiPrompt.includes('TEST-OPENAI-001')}`);
console.log(`Contains RCA structure: ${openaiPrompt.includes('10. additionalDataRequirements')}`);

console.log('\n3️⃣ Token estimation:');
console.log('===================');
console.log(`Gemini estimated tokens: ${estimateTokenCount(geminiPrompt)}`);
console.log(`OpenAI estimated tokens: ${estimateTokenCount(openaiPrompt)}`);

console.log('\n4️⃣ Testing with useShortVersion flag (should be ignored):');
console.log('=========================================================');
const openaiWithFlag = buildPrompt('RCA_ANALYST', {
  incidentData: testIncidentData,
  provider: 'openai',
  useShortVersion: true  // This should be ignored now
});

console.log(`Prompt with useShortVersion=true: ${openaiWithFlag.length} characters`);
console.log(`Still uses full prompt? ${openaiWithFlag === openaiPrompt ? '✅ YES' : '❌ NO'}`);

console.log('\n✨ Test complete! OpenAI now uses the same full prompt as Gemini.');