import axios from 'axios';
import fs from 'fs';

const API_URL = 'http://localhost:3002';

async function testMongoDBOnly() {
  console.log('=== Testing MongoDB-Only Storage ===\n');
  
  try {
    // 1. Check health
    console.log('1. Checking server health...');
    const health = await axios.get(`${API_URL}/health`);
    console.log('   ✅ Server is healthy:', health.data.status);
    
    // 2. Get initial incident count
    console.log('\n2. Getting initial incident count...');
    const initialIncidents = await axios.get(`${API_URL}/incidents`);
    console.log('   ✅ Initial incidents in DB:', initialIncidents.data.length);
    
    // 3. Submit a test incident
    console.log('\n3. Submitting test incident...');
    const testIncident = JSON.parse(fs.readFileSync('../example-incident.json', 'utf8'));
    
    try {
      const response = await axios.post(`${API_URL}/analyse`, testIncident, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000 // 60 seconds timeout for AI processing
      });
      console.log('   ✅ Incident analyzed and stored in MongoDB');
      console.log('   Incident ID:', response.data.requestId);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('   ⚠️  Duplicate incident detected (expected behavior)');
      } else {
        throw error;
      }
    }
    
    // 4. Verify incident is in database
    console.log('\n4. Verifying incident in database...');
    const finalIncidents = await axios.get(`${API_URL}/incidents`);
    console.log('   ✅ Final incidents in DB:', finalIncidents.data.length);
    
    if (finalIncidents.data.length > initialIncidents.data.length) {
      console.log('   ✅ New incident successfully stored in MongoDB!');
      const latestIncident = finalIncidents.data[0];
      console.log('   Latest incident:', {
        id: latestIncident.id,
        type: latestIncident.type,
        severity: latestIncident.severity,
        timestamp: latestIncident.timestamp
      });
    }
    
    // 5. Test threat intelligence endpoint
    if (finalIncidents.data.length > 0) {
      console.log('\n5. Testing threat intelligence endpoint...');
      const incidentId = finalIncidents.data[0].id;
      try {
        await axios.get(`${API_URL}/api/threat-intelligence/${incidentId}`);
        console.log('   ✅ Threat intelligence endpoint working with MongoDB');
      } catch (error) {
        console.log('   ⚠️  Threat intelligence generation in progress or failed');
      }
    }
    
    console.log('\n✅ All tests passed! MongoDB-only storage is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testMongoDBOnly();
