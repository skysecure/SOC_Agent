// Test script to verify severity assessment improvements
require('dotenv').config();
const { analyzeIncident } = require('./services/geminiService.js');

const testIncidents = [
  {
    name: "Logic App Modification - No Impact",
    data: {
      id: 'TEST-001',
      properties: { 
        severity: 'Low',
        alertDisplayName: 'Logic App Modified',
        description: 'A Logic App was modified in test environment'
      },
      entities: ['test-logic-app'],
      timestamp: new Date().toISOString()
    }
  },
  {
    name: "Failed Login Attempts",
    data: {
      id: 'TEST-002',
      properties: { 
        severity: 'Medium',
        alertDisplayName: 'Multiple Failed Login Attempts',
        description: '50 failed login attempts from single IP'
      },
      entities: ['user@company.com'],
      timestamp: new Date().toISOString()
    }
  },
  {
    name: "Production Data Access",
    data: {
      id: 'TEST-003',
      properties: { 
        severity: 'Low',
        alertDisplayName: 'Unauthorized Data Access',
        description: 'User accessed 500 customer records in production database'
      },
      entities: ['prod-db-01', 'suspicious-user'],
      timestamp: new Date().toISOString()
    }
  }
];

async function testSeverityAssessment() {
  console.log('Testing Severity Assessment with New Criteria...\n');
  
  for (const test of testIncidents) {
    console.log(`\n=== Testing: ${test.name} ===`);
    console.log(`Original Severity: ${test.data.properties.severity}`);
    
    try {
      const result = await analyzeIncident(test.data);
      console.log(`AI-Assessed Severity: ${result.severityAssessment.aiAssessedSeverity}`);
      console.log(`Severity Changed: ${!result.severityAssessment.severityMatch}`);
      if (result.severityAssessment.severityParsingNote) {
        console.log(`Note: ${result.severityAssessment.severityParsingNote}`);
      }
      console.log(`Justification: ${result.severityAssessment.justification.substring(0, 200)}...`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      if (error.message.includes('JSON parsing failed')) {
        console.log('This indicates the Gemini API is returning non-JSON response or API key is missing');
      }
    }
  }
}

// Check if API key is configured
if (!process.env.GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable is not set!');
  console.log('Please set it in your .env file or environment');
  process.exit(1);
}

testSeverityAssessment();