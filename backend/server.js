import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyzeIncident } from './services/geminiService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Simple in-memory storage for incidents (in production, use a database)
const incidents = [];

// Helper function to extract incident type from report
function extractIncidentType(report) {
  // First check the direct incidentDetails field
  if (report.incidentDetails?.typeOfIncident && report.incidentDetails.typeOfIncident !== 'Unknown') {
    return report.incidentDetails.typeOfIncident;
  }
  
  // Check fullRCAReport for typeOfIncident
  if (report.fullRCAReport?.incidentOverview?.typeOfIncident) {
    return report.fullRCAReport.incidentOverview.typeOfIncident;
  }
  
  // Check fullRCAReport title as fallback
  if (report.fullRCAReport?.incidentOverview?.title) {
    return report.fullRCAReport.incidentOverview.title;
  }
  
  // Try to extract from string if incidentDetails is a string
  if (typeof report.incidentDetails === 'string') {
    const match = report.incidentDetails.match(/type[:\s]+([^,\n]+)/i);
    if (match) return match[1].trim();
  }
  
  // Check executive summary for incident type keywords
  if (report.executiveSummary) {
    const summary = report.executiveSummary.toLowerCase();
    if (summary.includes('ransomware')) return 'Ransomware Attack';
    if (summary.includes('data exfiltration')) return 'Data Exfiltration';
    if (summary.includes('brute force') || summary.includes('brute-force')) return 'Brute Force Attack';
    if (summary.includes('phishing')) return 'Phishing Campaign';
    if (summary.includes('malware')) return 'Malware Infection';
    if (summary.includes('unauthorized access')) return 'Unauthorized Access';
    if (summary.includes('privilege escalation')) return 'Privilege Escalation';
    if (summary.includes('logic app')) return 'Logic App Modification';
    if (summary.includes('insider threat')) return 'Insider Threat';
  }
  
  return 'Security Incident';
}

// Helper function to extract affected users
function extractAffectedUsers(report) {
  // Check multiple possible locations for affected users
  const users = [];
  
  if (report.fullRCAReport?.incidentOverview?.affectedUPNUsers) {
    users.push(...report.fullRCAReport.incidentOverview.affectedUPNUsers);
  }
  
  if (report.fullRCAReport?.incidentOverview?.['affectedUPN/Users']) {
    users.push(...report.fullRCAReport.incidentOverview['affectedUPN/Users']);
  }
  
  if (report.incidentDetails?.affectedUsers && Array.isArray(report.incidentDetails.affectedUsers)) {
    users.push(...report.incidentDetails.affectedUsers);
  }
  
  if (report.affectedUsers && Array.isArray(report.affectedUsers)) {
    users.push(...report.affectedUsers);
  }
  
  // Remove duplicates
  return [...new Set(users)];
}

// Helper function to calculate response time
function calculateResponseTime(incidentData) {
  try {
    // Try multiple possible timestamp fields
    const createdTime = new Date(
      incidentData.properties?.createdTimeUtc || 
      incidentData.properties?.['Created Time Utc'] ||
      incidentData.createdTimeUtc ||
      incidentData.timestamp ||
      new Date()
    );
    
    const lastModified = new Date(
      incidentData.properties?.lastModifiedTimeUtc || 
      incidentData.properties?.['Last Modified Time Utc'] ||
      new Date()
    );
    
    // Calculate difference in minutes
    const diffInMinutes = Math.floor((lastModified - createdTime) / (1000 * 60));
    
    // Return at least 1 minute, max reasonable value
    return Math.min(Math.max(diffInMinutes, 1), 10080); // Max 1 week
  } catch (error) {
    console.error('Error calculating response time:', error);
    return 15; // Default fallback
  }
}

app.post('/analyse', async (req, res) => {
  try {
    const incidentData = req.body;
    const report = await analyzeIncident(incidentData);
    
    // Store the incident with metadata
    const incidentRecord = {
      id: Date.now().toString(),
      timestamp: new Date(),
      originalData: incidentData,
      report: report,
      severity: report.severityAssessment?.aiAssessedSeverity || report.severityAssessment?.initialSeverity || 'UNKNOWN',
      status: report?.incidentDetails?.status || 'UNKNOWN',
      type: extractIncidentType(report),
      executiveSummary: report.executiveSummary,
      affectedUsers: extractAffectedUsers(report),
      responseTime: calculateResponseTime(incidentData)
    };
    
    incidents.unshift(incidentRecord); // Add to beginning of array
    
    res.json(report);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze incident' });
  }
});

// Get all incidents
app.get('/incidents', async (req, res) => {

  try {
    // Return simplified incident data for dashboard including severity assessment
    const simplifiedIncidents = incidents.map(inc => ({
      id: inc.id,
      timestamp: inc.timestamp,
      severity: inc.severity,
      status: inc.status,
      type: inc.type,
      executiveSummary: inc.executiveSummary,
      affectedUsers: inc.affectedUsers,
      responseTime: inc.responseTime,
      // Include severity assessment data for the dashboard
      severityAssessment: inc.report?.severityAssessment || null
    }));
    res.json(simplifiedIncidents);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// Get single incident details
app.get('/incidents/:id', async (req, res) => {
  try {
    const incident = incidents.find(inc => inc.id === req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(incident);
  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
});

// Update incident status
app.patch('/incidents/:id', async (req, res) => {
  try {
    const incident = incidents.find(inc => inc.id === req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    
    if (req.body.status) {
      incident.status = req.body.status;
    }
    
    res.json(incident);
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

// AI-Powered Threat Intelligence endpoint
app.get('/api/threat-intelligence/:incidentId', async (req, res) => {
  try {
    const incident = incidents.find(inc => inc.id === req.params.incidentId);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    console.log(`Processing threat intelligence for incident ${incident.id}`);

    // Extract existing IOCs and incident details for analysis
    const incidentData = {
      id: incident.id,
      type: incident.type,
      severity: incident.severity,
      severityAssessment: incident.report?.severityAssessment,
      executiveSummary: incident.executiveSummary,
      evidenceAndArtifacts: incident.report?.evidenceAndArtifacts,
      attackVectorAndTechniques: incident.report?.attackVectorAndTechniques,
      detectionDetails: incident.report?.detectionDetails
    };

    // Create AI prompt for threat intelligence analysis
    const threatPrompt = `You are a cybersecurity threat intelligence analyst. Analyze this security incident and provide threat intelligence in JSON format.

INCIDENT DATA:
${JSON.stringify(incidentData, null, 2)}

TASK: Generate comprehensive threat intelligence analysis based on the actual incident data. Extract real indicators, calculate meaningful threat scores, and provide actionable intelligence.

Return ONLY a JSON object with this exact structure:
{
  "threatScore": <number between 1-100 based on severity and indicators>,
  "confidence": "<High/Medium/Low based on available evidence>",
  "relatedThreats": [
    {
      "id": <number>,
      "name": "<specific threat name based on incident type>",
      "similarity": <percentage based on actual matching patterns>,
      "lastSeen": "<realistic timeframe>",
      "tactics": ["<MITRE ATT&CK tactics relevant to this incident>"]
    }
  ],
  "indicators": {
    "ipAddresses": [
      {
        "ip": "<extracted from incident data or 'None found'>",
        "reputation": "<analyzed reputation>",
        "geoLocation": "<location if available>",
        "confidence": <percentage based on evidence>
      }
    ],
    "domains": [
      {
        "domain": "<extracted from incident data or 'None found'>",
        "status": "<analyzed status>",
        "firstSeen": "<timeframe if available>"
      }
    ],
    "hashes": [
      {
        "hash": "<extracted file hashes or 'None found'>",
        "type": "<hash type>",
        "malware": "<associated malware if known>"
      }
    ]
  },
  "predictions": {
    "escalationProbability": <percentage based on severity and incident type>,
    "estimatedImpact": "<High/Medium/Low based on severity assessment>",
    "timeToContainment": "<realistic estimate based on incident complexity>",
    "recommendedPriority": "<priority based on threat score and impact>"
  }
}

Guidelines:
- Base threat score on actual severity (Critical: 80-95, High: 60-80, Medium: 30-60, Low: 10-30)
- Extract real IOCs from evidenceAndArtifacts if available
- Match related threats to actual incident type (ransomware, phishing, etc.)
- Make predictions based on incident complexity and severity
- If no IOCs found, indicate clearly rather than showing placeholder data`;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: threatPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;

    try {
      // Extract JSON from response
      let jsonString = aiResponse;
      const codeBlockMatch = aiResponse.match(/```json\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
      } else {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
      }

      const threatIntelligence = JSON.parse(jsonString);
      res.json(threatIntelligence);

    } catch (parseError) {
      console.error('Failed to parse threat intelligence response:', parseError);
      console.error('AI Response preview:', aiResponse.substring(0, 500));
      // Return fallback data structure
      res.json({
        threatScore: incident.severity === 'high' ? 75 : incident.severity === 'medium' ? 50 : 25,
        confidence: 'Medium',
        relatedThreats: [{
          id: 1,
          name: `${incident.type} Pattern`,
          similarity: 65,
          lastSeen: '1 week ago',
          tactics: ['Initial Access', 'Discovery']
        }],
        indicators: {
          ipAddresses: incident.report?.evidenceAndArtifacts?.entityAppendices?.ipAddresses || 
            [{ ip: 'No IPs extracted from incident data', reputation: 'N/A', geoLocation: 'N/A', confidence: 0 }],
          domains: [{ domain: 'No domains found in incident data', status: 'N/A', firstSeen: 'N/A' }],
          hashes: [{ hash: 'No file hashes available', type: 'N/A', malware: 'N/A' }]
        },
        predictions: {
          escalationProbability: incident.severity === 'high' ? 70 : 35,
          estimatedImpact: incident.severity === 'high' ? 'High' : 'Medium',
          timeToContainment: incident.severity === 'high' ? '2-4 hours' : '4-8 hours',
          recommendedPriority: incident.severity === 'high' ? 'Critical' : 'High'
        }
      });
    }

  } catch (error) {
    console.error('Threat intelligence analysis error:', error);
    // Return valid fallback data structure instead of error
    res.json({
      threatScore: incident.severity === 'high' ? 75 : incident.severity === 'medium' ? 50 : 25,
      confidence: 'Medium',
      relatedThreats: [{
        id: 1,
        name: `${incident.type} Analysis`,
        similarity: 65,
        lastSeen: '1 week ago',
        tactics: ['Discovery', 'Collection']
      }],
      indicators: {
        ipAddresses: incident.report?.evidenceAndArtifacts?.entityAppendices?.ipAddresses?.map(ip => ({
          ip: ip.address || ip.ip || 'Unknown',
          reputation: ip.reputation || 'Unknown',
          geoLocation: ip.geolocation || ip.geoLocation || 'Unknown',
          confidence: 75
        })) || [{ ip: 'No IPs found in incident data', reputation: 'N/A', geoLocation: 'N/A', confidence: 0 }],
        domains: [{ domain: 'AI analysis temporarily unavailable', status: 'N/A', firstSeen: 'N/A' }],
        hashes: [{ hash: 'AI analysis temporarily unavailable', type: 'N/A', malware: 'N/A' }]
      },
      predictions: {
        escalationProbability: incident.severity === 'high' ? 70 : 35,
        estimatedImpact: incident.severity === 'high' ? 'High' : 'Medium',
        timeToContainment: incident.severity === 'high' ? '2-4 hours' : '4-8 hours',
        recommendedPriority: incident.severity === 'high' ? 'Critical' : 'High'
      },
      _fallback: true,
      _error: error.message
    });
  }
});

// AI Chat endpoint
app.post('/ai/chat', async (req, res) => {
  try {
    const { query, currentIncident, chatMode, allIncidents, conversationHistory } = req.body;
    
    // Create a context-aware prompt for Gemini
    const incidentContext = currentIncident ? `
Current Incident Being Analyzed:
- ID: ${currentIncident.id}
- Type: ${currentIncident.type}
- Severity: ${currentIncident.severityAssessment?.aiAssessedSeverity || currentIncident.severity}
- Status: ${currentIncident.status}
- Executive Summary: ${currentIncident.executiveSummary}
- Root Cause: ${currentIncident.rootCauseAnalysis?.primaryCause || 'Under investigation'}
- Affected Users: ${currentIncident.affectedUsers?.join(', ') || 'None'}

Full Incident Report Available: ${currentIncident.report ? 'Yes' : 'No'}
` : 'No specific incident selected.';

    const dbContext = `
Total Incidents in Database: ${allIncidents.length}
Incident Types: ${[...new Set(allIncidents.map(i => i.type))].join(', ')}
Severity Distribution: 
- High: ${allIncidents.filter(i => (i.severityAssessment?.aiAssessedSeverity || i.severity) === 'high').length}
- Medium: ${allIncidents.filter(i => (i.severityAssessment?.aiAssessedSeverity || i.severity) === 'medium').length}
- Low: ${allIncidents.filter(i => (i.severityAssessment?.aiAssessedSeverity || i.severity) === 'low').length}
`;

    const conversationContext = conversationHistory.slice(-5).map(msg => 
      `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.text}`
    ).join('\n');

    const prompt = `You are an AI Security Assistant ${chatMode === 'incident' ? 'focusing on a specific incident' : 'providing general security analysis'}. Use the provided data to give accurate, specific responses.

${incidentContext}

${dbContext}

Recent Conversation:
${conversationContext}

User Query: ${query}

Instructions:
1. Provide specific answers based on the actual incident data
2. Reference real values from the incident (IDs, severity levels, etc.)
3. If information is not available, say so clearly
4. Keep responses concise but informative
5. For recommendations, base them on the actual incident type and severity
6. Use security best practices in your advice

Response:`;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response',
      response: 'I apologize, but I encountered an error processing your request. Please try again or check the incident details directly.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});