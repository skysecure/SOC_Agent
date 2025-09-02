import { callAI } from './services/aiService.js';

async function testChatAssistant() {
  try {
    console.log('🧪 Testing CHAT_ASSISTANT...');
    
    const aiResponse = await callAI('CHAT_ASSISTANT', {
      chatMode: 'incident',
      incidentContext: 'Test context for chat assistant'
    }, {
      temperature: 0.7,
      maxTokens: 100
    });
    
    console.log('✅ AI call successful');
    console.log('Response length:', aiResponse.length);
    console.log('Response preview:', aiResponse.substring(0, 200));
    
  } catch (error) {
    console.error('❌ AI call failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testChatAssistant();
