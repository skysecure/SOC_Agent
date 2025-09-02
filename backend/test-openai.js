import dotenv from 'dotenv';
dotenv.config();

// Test OpenAI configuration
console.log('OpenAI Configuration Test');
console.log('========================');
console.log('AI_PROVIDER:', process.env.AI_PROVIDER);
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `Set (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : 'Not set');
console.log('OPENAI_BASE_URL:', process.env.OPENAI_BASE_URL);
console.log('OPENAI_DEPLOYMENT:', process.env.OPENAI_DEPLOYMENT);
console.log('OPENAI_MODEL:', process.env.OPENAI_MODEL);

// Check if API key is the placeholder
if (process.env.OPENAI_API_KEY === '<your-azure-openai-key>') {
  console.error('\n❌ ERROR: API key is still the placeholder value!');
  console.error('Please update .env file with your actual Azure OpenAI API key');
  process.exit(1);
}

// Import the service
import { analyzeIncident } from './services/geminiService.js';

// Sample incident data
const testIncident = {
  "id": "test-123",
  "properties": {
    "id": "test-123",
    "title": "Suspicious PowerShell Activity Detected",
    "severity": "Medium",
    "createdTimeUtc": "2025-09-02T10:00:00Z",
    "owner": {
      "userPrincipalName": "test@example.com"
    },
    "status": "Active",
    "alertDisplayName": "Suspicious PowerShell Activity"
  },
  "entities": [
    {
      "type": "Account",
      "name": "testuser"
    }
  ]
};

async function testOpenAI() {
  try {
    console.log('\nTesting OpenAI Integration...');
    console.log('Sending test incident for analysis...\n');
    
    const result = await analyzeIncident(testIncident);
    
    console.log('✅ OpenAI Analysis Successful!');
    console.log('\nExecutive Summary:', result.executiveSummary);
    console.log('\nIncident Details:');
    console.log('- ID:', result.incidentDetails.id);
    console.log('- Type:', result.incidentDetails.typeOfIncident);
    console.log('- Severity (Initial):', result.severityAssessment.initialSeverity);
    console.log('- Severity (AI Assessed):', result.severityAssessment.aiAssessedSeverity);
    console.log('- Verdict:', result.verdict);
    
  } catch (error) {
    console.error('❌ OpenAI Test Failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('API key not configured')) {
      console.log('\nPlease update the .env file with your Azure OpenAI API key:');
      console.log('OPENAI_API_KEY="your-actual-api-key-here"');
    }
  }
}

// Run the test
testOpenAI();