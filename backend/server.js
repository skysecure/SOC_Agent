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
  if (typeof report.incidentDetails === 'string') {
    // Extract type from string if it contains patterns like "Type: XYZ"
    const match = report.incidentDetails.match(/type[:\s]+([^,\n]+)/i);
    return match ? match[1].trim() : 'Unknown Type';
  }
  
  if (report.incidentDetails?.typeOfIncident) {
    return report.incidentDetails.typeOfIncident;
  }
  
  // Try to extract from fullRCAReport
  if (report.fullRCAReport?.incidentOverview?.title) {
    return report.fullRCAReport.incidentOverview.title;
  }
  
  return 'Unknown Type';
}

// Helper function to extract affected users
function extractAffectedUsers(report) {
  // Check multiple possible locations for affected users
  const users = [];
  
  if (report.fullRCAReport?.incidentOverview?.affectedUPNUsers) {
    users.push(...report.fullRCAReport.incidentOverview.affectedUPNUsers);
  }
  
  if (report.affectedUsers && Array.isArray(report.affectedUsers)) {
    users.push(...report.affectedUsers);
  }
  
  // Remove duplicates
  return [...new Set(users)];
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
      responseTime: Math.floor(Math.random() * 60) + 10 // Mock response time
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