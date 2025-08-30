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
      severity: report.severityAssessment?.level || 'UNKNOWN',
      status: 'new',
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
    // Return simplified incident data for dashboard
    const simplifiedIncidents = incidents.map(inc => ({
      id: inc.id,
      timestamp: inc.timestamp,
      severity: inc.severity,
      status: inc.status,
      type: inc.type,
      executiveSummary: inc.executiveSummary,
      affectedUsers: inc.affectedUsers,
      responseTime: inc.responseTime
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});