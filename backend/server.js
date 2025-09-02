import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { analyzeIncident } from './services/geminiService.js';
import { updateSentinelIncident, validateSentinelConnection } from './services/sentinelService.js';
import { generateOutlookHtmlFromRCA } from './services/emailTemplateService.js';
import { mailSender } from './services/mailService.js';
import { callAI } from './services/aiService.js';

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
    // ===== COMPREHENSIVE LOGGING START =====
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    console.log('\n' + '='.repeat(80));
    console.log(`🚀 [ANALYSE] NEW REQUEST STARTED - ${requestId}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log(`🔍 Request Headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`📊 Request Body Size: ${JSON.stringify(req.body).length} characters`);
    console.log(`🌐 Remote IP: ${req.ip || req.connection.remoteAddress || 'unknown'}`);
    console.log(`👤 User Agent: ${req.headers['user-agent'] || 'unknown'}`);
    console.log('='.repeat(80));
    
    const incidentData = (req?.body?.body?.object) ? req.body?.body?.object : req.body;
    
    // Extract unique identifiers for deduplication tracking
    const incidentIdentifiers = {
      requestId: requestId,
      timestamp: new Date().toISOString(),
      // Try multiple possible incident ID locations
      incidentId: incidentData?.id || incidentData?.properties?.id || incidentData?.name || incidentData?.properties?.incidentNumber || incidentData?.properties?.providerIncidentId || 'unknown',
      title: incidentData?.properties?.title || incidentData?.properties?.alertDisplayName || 'unknown',
      createdTime: incidentData?.properties?.createdTimeUtc || incidentData?.createdTimeUtc || 'unknown',
      // Hash the incident data for duplicate detection
      dataHash: crypto.createHash('md5').update(JSON.stringify(incidentData)).digest('hex').substr(0, 8),
      // Logic App specific identifiers for better deduplication
      logicApp: {
        workflowId: req.headers['x-ms-workflow-id'] || 'unknown',
        workflowRunId: req.headers['x-ms-workflow-run-id'] || 'unknown',
        workflowName: req.headers['x-ms-workflow-name'] || 'unknown',
        trackingId: req.headers['x-ms-tracking-id'] || 'unknown',
        correlationId: req.headers['x-ms-correlation-id'] || 'unknown'
      }
    };
    
    console.log(`🔍 [ANALYSE] Incident Identifiers:`, incidentIdentifiers);
    console.log(`📝 [ANALYSE] Incident Data Preview:`, {
      hasBody: !!req.body?.body,
      hasObject: !!req.body?.body?.object,
      dataType: typeof incidentData,
      dataKeys: incidentData ? Object.keys(incidentData) : 'null',
      title: incidentIdentifiers.title,
      createdTime: incidentIdentifiers.createdTime
    });
    
    // Check for potential duplicate requests (multiple detection methods)
    const existingIncident = incidents.find(inc => {
      // Method 1: Check incident ID
      const idMatch = inc.originalData?.id === incidentIdentifiers.incidentId ||
                     inc.originalData?.properties?.id === incidentIdentifiers.incidentId ||
                     inc.originalData?.name === incidentIdentifiers.incidentId;
      
      // Method 2: Check Logic App workflow run (most reliable for Logic Apps)
      const logicAppMatch = inc.emailTracking?.logicApp?.workflowRunId === incidentIdentifiers.logicApp.workflowRunId &&
                           inc.emailTracking?.logicApp?.workflowRunId !== 'unknown';
      
      // Method 3: Check data hash (content-based deduplication)
      const hashMatch = inc.emailTracking?.dataHash === incidentIdentifiers.dataHash &&
                       inc.emailTracking?.dataHash !== 'unknown';
      
      return idMatch || logicAppMatch || hashMatch;
    });
    
    if (existingIncident) {
      console.log(`🚨 [ANALYSE] DUPLICATE REQUEST BLOCKED!`, {
        requestId: requestId,
        existingIncidentId: existingIncident.id,
        existingTimestamp: existingIncident.timestamp,
        timeDifference: Date.now() - existingIncident.timestamp.getTime(),
        duplicateReason: 'Same incident ID found in memory',
        action: 'Returning existing incident data without processing'
      });
      
      // Return existing incident data to prevent duplicate processing
      const response = {
        ...existingIncident.report,
        sentinelAssignment: existingIncident.sentinelAssignment,
        emailTracking: existingIncident.emailTracking || 'No tracking data',
        requestId: requestId,
        duplicateBlocked: true,
        originalRequestId: existingIncident.id,
        message: 'Duplicate request blocked - incident already processed'
      };
      
      return res.json(response);
    } else {
      console.log(`✅ [ANALYSE] No duplicate incidents found - proceeding with analysis`);
    }
    
    // ===== EMAIL TRACKING START =====
    const emailTracker = {
      requestId: requestId,
      incidentId: incidentIdentifiers.incidentId,
      dataHash: incidentIdentifiers.dataHash,
      logicApp: incidentIdentifiers.logicApp,
      acknowledgementSent: false,
      rcaReportSent: false,
      totalEmailsSent: 0,
      emailRecipients: [],
      emailTimestamps: [],
      emailErrors: []
    };
    
    console.log(`📧 [EMAIL][TRACKING] Email tracking initialized for request ${requestId}`);
    
    // Acknowledgement email to TOSENDERMAIL
    try {
      const ackTo = process.env.TOSENDERMAIL || process.env.SENTINEL_OWNER_EMAIL || process.env.SENDGRID_FROM_EMAIL;
      const ackSubject = 'Incident Acknowledgement';
      const ackHtml = `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#202124">`+
        `<p>We have noted the incident and it is currently under investigation.</p>`+
        `<p>Incident title: ${incidentData?.properties?.title || incidentData?.properties?.alertDisplayName || 'Security Incident'}</p>`+
        `<p>Timestamp (UTC): ${incidentData?.properties?.createdTimeUtc || incidentData?.createdTimeUtc || new Date().toISOString()}</p>`+
        `<p>Request ID: ${requestId}</p>`+
        `<p>Incident ID: ${incidentIdentifiers.incidentId}</p>`+
      `</div>`;
      
      console.log(`📧 [EMAIL][ACK] Preparing acknowledgement email for request ${requestId}`, {
        recipient: ackTo,
        subject: ackSubject,
        htmlLength: ackHtml.length,
        incidentId: incidentIdentifiers.incidentId,
        requestId: requestId
      });
      
      if (ackTo) {
        console.log(`📧 [EMAIL][ACK] Sending acknowledgement email for request ${requestId}`, { 
          to: ackTo, 
          subject: ackSubject,
          incidentId: incidentIdentifiers.incidentId,
          requestId: requestId,
          timestamp: new Date().toISOString()
        });
        
        await mailSender(ackTo, ackSubject, ackHtml);
        
        emailTracker.acknowledgementSent = true;
        emailTracker.totalEmailsSent++;
        emailTracker.emailRecipients.push(ackTo);
        emailTracker.emailTimestamps.push(new Date().toISOString());
        
        console.log(`✅ [EMAIL][ACK] Acknowledgement email sent successfully for request ${requestId}`, {
          recipient: ackTo,
          totalEmailsSent: emailTracker.totalEmailsSent,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log(`⚠️  [EMAIL][ACK] Skipped for request ${requestId} - no email recipients configured`, {
          envVars: {
            TOSENDERMAIL: !!process.env.TOSENDERMAIL,
            SENTINEL_OWNER_EMAIL: !!process.env.SENTINEL_OWNER_EMAIL,
            SENDGRID_FROM_EMAIL: !!process.env.SENDGRID_FROM_EMAIL
          }
        });
      }
    } catch (ackError) {
      const errorInfo = {
        requestId: requestId,
        incidentId: incidentIdentifiers.incidentId,
        error: ackError?.message,
        stack: ackError?.stack,
        timestamp: new Date().toISOString()
      };
      
      emailTracker.emailErrors.push(errorInfo);
      console.error(`❌ [EMAIL][ACK] Failed to send acknowledgement for request ${requestId}:`, errorInfo);
    }

    console.log('[ANALYSE] Starting RCA generation');
    const report = await analyzeIncident(incidentData);
    console.log('[ANALYSE] RCA generated');
    
    // Extract AI-assessed severity from the report
    const aiSeverity = report.severityAssessment?.aiAssessedSeverity || 
                      report.severityAssessment?.initialSeverity || 
                      'medium'; // Safe fallback
    
    console.log('[ANALYSE] RCA Summary', {
      incidentType: extractIncidentType(report),
      initialSeverity: report.severityAssessment?.initialSeverity,
      aiAssessedSeverity: aiSeverity,
      severityChanged: report.severityAssessment?.initialSeverity !== aiSeverity
    });
    
    // Store the incident with metadata
    const incidentRecord = {
      id: Date.now().toString(),
      timestamp: new Date(),
      originalData: incidentData,
      report: report,
      severity: aiSeverity, // Using AI-assessed severity
      status: report?.incidentDetails?.status || 'Active',
      type: extractIncidentType(report),
      executiveSummary: report.executiveSummary,
      affectedUsers: extractAffectedUsers(report),
      responseTime: calculateResponseTime(incidentData),
      incidentNumber: incidentData?.properties?.incidentNumber || incidentData?.properties?.providerIncidentId || null
    };
    
    incidents.unshift(incidentRecord); // Add to beginning of array
    console.log('[ANALYSE] Incident stored in memory', { id: incidentRecord.id });
    
    // Auto-assign incident in Sentinel if configuration is available
    let assignmentResult = null;
    const sentinelEnabled = process.env.AZURE_CLIENT_ID && 
                          process.env.AZURE_CLIENT_SECRET && 
                          process.env.AZURE_SUBSCRIPTION_ID;
    
    if (sentinelEnabled) {

      const incidentArmId = incidentData.name;
      
      if (incidentArmId) {
        const DEBUG = process.env.SENTINEL_DEBUG === 'true';
        console.log('[SENTINEL] Attempting auto-assignment/update', { incidentArmId, aiSeverity });
        
        const sentinelStartTime = Date.now();
        
        // Pass AI-assessed severity to Sentinel update (owner/status taken from env)
        assignmentResult = await updateSentinelIncident(
          incidentArmId,
          aiSeverity,
          {
            description: `RCA completed by SOC Automation Agent. \nAI-Assessed Severity: ${aiSeverity} (Initial: ${report.severityAssessment?.initialSeverity})\nType: ${incidentRecord.type}\nExecutive Summary: ${incidentRecord.executiveSummary?.substring(0, 500)}...\nAnalysis Timestamp: ${new Date().toISOString()}`
          }
        );
        
        const sentinelDuration = Date.now() - sentinelStartTime;
        incidentRecord.sentinelAssignment = assignmentResult;
        if (assignmentResult?.success) {
          console.log(`[SENTINEL] Update successful (${sentinelDuration}ms)`, {
            incidentId: assignmentResult.incidentId,
            severity: assignmentResult.severity
          });
        } else {
          console.error(`[SENTINEL] Update failed (${sentinelDuration}ms)`, assignmentResult);
        }
      } else {
        console.log('[SENTINEL] Skipping update (no incident ARM id found)');
      }
    } else {
      console.log('[SENTINEL] Skipping update (config not set)');
    }

    // Final RCA email to TOSENDERMAIL
    try {
      const to = process.env.TOSENDERMAIL || process.env.SENTINEL_OWNER_EMAIL || process.env.SENDGRID_FROM_EMAIL;
      const subject = `RCA Report: ${incidentRecord.type} (Severity: ${aiSeverity}) - Request ${requestId}`;
      
      console.log(`📧 [EMAIL][RCA] Preparing RCA email for request ${requestId}`, {
        recipient: to,
        subject: subject,
        incidentId: incidentIdentifiers.incidentId,
        requestId: requestId,
        incidentType: incidentRecord.type,
        aiSeverity: aiSeverity
      });
      
      if (to) {
        // Build corrected report reflecting post-assignment state and AI severity
        const finalOwner = process.env.SENTINEL_OWNER_EMAIL || process.env.SENTINEL_OWNER_UPN || 'Unassigned';
        const correctedReport = {
          ...report,
          incidentDetails: {
            ...report.incidentDetails,
            owner: finalOwner,
            status: assignmentResult?.success ? 'Active' : (report.incidentDetails?.status || 'Active')
          },
          severityAssessment: {
            ...report.severityAssessment,
            aiAssessedSeverity: aiSeverity
          }
        };

        console.log(`📧 [EMAIL][RCA] Generating Outlook-safe HTML for request ${requestId} (corrected with assignment and AI severity)`, {
          owner: correctedReport.incidentDetails.owner,
          status: correctedReport.incidentDetails.status,
          aiSeverity: correctedReport.severityAssessment.aiAssessedSeverity,
          requestId: requestId
        });
        
        const html = await generateOutlookHtmlFromRCA(correctedReport);
        
        console.log(`📧 [EMAIL][RCA] Sending RCA email for request ${requestId}`, { 
          to, 
          subject, 
          htmlLength: html?.length || 0,
          incidentId: incidentIdentifiers.incidentId,
          requestId: requestId,
          timestamp: new Date().toISOString()
        });
        
        await mailSender(to, subject, html);
        
        emailTracker.rcaReportSent = true;
        emailTracker.totalEmailsSent++;
        emailTracker.emailRecipients.push(to);
        emailTracker.emailTimestamps.push(new Date().toISOString());
        
        console.log(`✅ [EMAIL][RCA] RCA email sent successfully for request ${requestId}`, {
          recipient: to,
          totalEmailsSent: emailTracker.totalEmailsSent,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log(`⚠️  [EMAIL][RCA] Skipped for request ${requestId} - no email recipients configured`, {
          envVars: {
            TOSENDERMAIL: !!process.env.TOSENDERMAIL,
            SENTINEL_OWNER_EMAIL: !!process.env.SENTINEL_OWNER_EMAIL,
            SENDGRID_FROM_EMAIL: !!process.env.SENDGRID_FROM_EMAIL
          }
        });
      }
    } catch (rcaEmailError) {
      const errorInfo = {
        requestId: requestId,
        incidentId: incidentIdentifiers.incidentId,
        error: rcaEmailError?.message,
        stack: rcaEmailError?.stack,
        timestamp: new Date().toISOString()
      };
      
      emailTracker.emailErrors.push(errorInfo);
      console.error(`❌ [EMAIL][RCA] Failed to send RCA email for request ${requestId}:`, errorInfo);
    }

    // ===== FINAL EMAIL TRACKING SUMMARY =====
    const totalDuration = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(80));
    console.log(`📊 [ANALYSE] REQUEST COMPLETED - ${requestId}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`📧 Email Summary:`, {
      requestId: requestId,
      incidentId: incidentIdentifiers.incidentId,
      acknowledgementSent: emailTracker.acknowledgementSent,
      rcaReportSent: emailTracker.rcaReportSent,
      totalEmailsSent: emailTracker.totalEmailsSent,
      expectedEmails: 2,
      emailRecipients: emailTracker.emailRecipients,
      emailTimestamps: emailTracker.emailTimestamps,
      emailErrors: emailTracker.emailErrors.length,
      status: emailTracker.totalEmailsSent === 2 ? '✅ COMPLETE' : '⚠️  INCOMPLETE'
    });
    
    if (emailTracker.totalEmailsSent !== 2) {
      console.log(`⚠️  [ANALYSE] EMAIL COUNT MISMATCH DETECTED!`, {
        requestId: requestId,
        expected: 2,
        actual: emailTracker.totalEmailsSent,
        missing: 2 - emailTracker.totalEmailsSent,
        details: {
          acknowledgement: emailTracker.acknowledgementSent ? '✅ Sent' : '❌ Missing',
          rcaReport: emailTracker.rcaReportSent ? '✅ Sent' : '❌ Missing'
        }
      });
    }
    
    // Check for potential duplicate incidents
    const duplicateIncidents = incidents.filter(inc => 
      inc.id !== incidentRecord.id && 
      (inc.originalData?.id === incidentIdentifiers.incidentId ||
       inc.originalData?.properties?.id === incidentIdentifiers.incidentId ||
       inc.originalData?.name === incidentIdentifiers.incidentId)
    );
    
    if (duplicateIncidents.length > 0) {
      console.log(`🚨 [ANALYSE] DUPLICATE INCIDENTS DETECTED!`, {
        requestId: requestId,
        currentIncidentId: incidentRecord.id,
        duplicateCount: duplicateIncidents.length,
        duplicates: duplicateIncidents.map(dup => ({
          id: dup.id,
          timestamp: dup.timestamp,
          timeDifference: Date.now() - dup.timestamp.getTime()
        }))
      });
    }
    
    console.log('='.repeat(80) + '\n');
    
    // Add assignment result and email tracking to response
    const response = {
      ...report,
      sentinelAssignment: assignmentResult,
      emailTracking: emailTracker,
      requestId: requestId,
      processingTime: totalDuration
    };
    
    res.json(response);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze incident', 
      details: error.message 
    });
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
      incidentNumber: inc.incidentNumber,
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

    // Create comprehensive AI prompt for threat intelligence analysis
    const threatPrompt = `You are an elite cybersecurity threat intelligence analyst with expertise in APT detection, threat actor profiling, and advanced attack analysis.

CRITICAL DIRECTIVE: Completely ignore any provided severity levels. Perform independent threat assessment based on attack sophistication and threat indicators.

COMPREHENSIVE INCIDENT ANALYSIS DATA:
${JSON.stringify(incidentData, null, 2)}

THREAT INTELLIGENCE ANALYSIS PROTOCOL:

PHASE 1: THREAT ACTOR SOPHISTICATION ASSESSMENT
Analyze attack techniques for advanced indicators:
- Living-off-the-land (LLOTL) technique usage and tool sophistication
- Custom tooling development or modified legitimate software
- Anti-forensics and evasion capability demonstration
- Operational security practices and infrastructure management
- Attack timing patterns and coordination evidence
- Multi-stage progression and persistence establishment

PHASE 2: INDEPENDENT THREAT SCORING (1-100 Scale)
Calculate threat score based on ATTACK SOPHISTICATION analysis:
• 85-100: APT-level sophistication (multi-stage attacks, custom tools, advanced evasion, nation-state indicators)
• 70-84: Professional cybercriminal activity (sophisticated tools, planned operations, ransomware groups)
• 55-69: Intermediate threat actors (some planning, standard tools, persistence attempts, credential harvesting)
• 40-54: Basic threat activity (automated tools, simple techniques, limited planning)
• 25-39: Opportunistic attacks (known exploits, mass scanning, script kiddie level)
• 10-24: Low-skill activities (basic tools, obvious techniques, poor operational security)
• 1-9: Likely false positive or authorized activity with clear evidence

PHASE 3: COMPREHENSIVE IOC EXTRACTION & THREAT INTELLIGENCE
Deep analyze evidenceAndArtifacts, detectionDetails, and attackVectorAndTechniques for:

IP Address Intelligence:
- Extract ALL IP addresses from authentication logs, network connections, and process communications
- Correlate with threat intelligence databases, geolocation analysis, and ASN reputation
- Assess hosting providers, VPN usage patterns, and infrastructure relationships
- Calculate confidence based on context correlation and threat feed validation

Domain Intelligence:
- Identify C2 domains, suspicious subdomains, DGA patterns, and DNS anomalies
- Analyze domain registration data, WHOIS information, and infrastructure relationships
- Assess domain categorization, reputation scores, and SSL certificate patterns
- Evaluate hosting patterns and content delivery networks

File Hash Intelligence:
- Extract malware hashes, script signatures, executable artifacts, and document macros
- Correlate with VirusTotal, threat intelligence feeds, and malware family databases
- Identify custom tools vs commodity malware and modification indicators
- Assess deployment methods and persistence mechanisms

Behavioral Intelligence Patterns:
- Analyze process execution chains, command-line patterns, and administrative activities
- Identify network communication signatures, protocols, and beaconing intervals
- Assess registry modifications, file system changes, and persistence mechanisms
- Evaluate user behavior anomalies, access patterns, and privilege usage

PHASE 4: ADVANCED THREAT LANDSCAPE CORRELATION
Match attack patterns to current threat intelligence:
- Compare TTPs to known APT groups, ransomware operators, and cybercriminal campaigns
- Calculate similarity using technique overlap algorithms and operational pattern matching
- Provide threat intelligence context from recent industry reports and campaign analysis
- Assess targeting patterns, victim selection criteria, and geographic focus
- Evaluate infrastructure overlap with known threat actor toolsets

PHASE 5: PREDICTIVE THREAT MODELING AND RISK ASSESSMENT
Generate evidence-based predictions:

Escalation Probability Calculation:
- Analyze current attack stage position in kill chain progression
- Assess attacker capabilities vs defensive posture
- Evaluate persistence mechanisms and lateral movement potential
- Consider threat actor motivation and operational objectives

Impact Assessment Modeling:
- Evaluate target value and organizational risk profile
- Assess attack technique potential and system vulnerability
- Consider data sensitivity and regulatory compliance implications
- Analyze business continuity risks and operational dependencies

Containment Complexity Analysis:
- Assess attack persistence and evasion capabilities
- Evaluate required response actions and technical complexity
- Consider coordination needs across security teams and business units
- Analyze resource requirements and timeline constraints

Priority Calculation Framework:
- Weight threat score with business context and risk tolerance
- Consider attack progression velocity and urgency indicators
- Evaluate response capability and resource availability
- Assess regulatory requirements and compliance obligations

CONFIDENCE ASSESSMENT METHODOLOGY:
Rate analysis confidence based on:
- Evidence quality and completeness across multiple data sources
- Correlation strength between different intelligence types
- Time elapsed since detection and data collection freshness
- Threat intelligence validation and cross-reference success
- Technical artifact verification and behavioral pattern confirmation

CRITICAL OUTPUT REQUIREMENTS:
- Calculate ALL scores through independent AI analysis of incident sophistication
- Extract REAL technical indicators with comprehensive threat intelligence context
- Provide specific threat actor attribution when evidence pattern matching supports it
- Base ALL predictions on attack sophistication analysis and threat landscape correlation
- Include detailed confidence rationales with evidence quality assessment
- Never use placeholder data - if insufficient evidence exists, explain intelligence gaps and requirements
- Focus on threat sophistication and actor capabilities over immediate business impact

Return ONLY valid JSON with comprehensive, evidence-based threat intelligence analysis.

REQUIRED JSON STRUCTURE (EXACT FORMAT):
{
  "threatScore": <number 1-100>,
  "confidence": "<High/Medium/Low>",
  "relatedThreats": [
    {
      "id": <number>,
      "name": "<threat name>",
      "similarity": <percentage>,
      "lastSeen": "<timeframe>",
      "tactics": ["<MITRE tactics>"]
    }
  ],
  "indicators": {
    "ipAddresses": [
      {
        "ip": "<IP address>",
        "reputation": "<reputation>",
        "geoLocation": "<location>",
        "confidence": <percentage>
      }
    ],
    "domains": [
      {
        "domain": "<domain>",
        "status": "<status>",
        "firstSeen": "<timeframe>"
      }
    ],
    "hashes": [
      {
        "hash": "<hash>",
        "type": "<type>",
        "malware": "<malware family>"
      }
    ]
  },
  "predictions": {
    "escalationProbability": <percentage>,
    "estimatedImpact": "<High/Medium/Low>",
    "timeToContainment": "<timeframe>",
    "recommendedPriority": "<priority>"
  }
}`;

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
      
      // Transform AI response to ensure frontend compatibility
      const normalizedResponse = {
        threatScore: threatIntelligence.threatScore,
        confidence: threatIntelligence.confidence || threatIntelligence.confidenceLevel,
        relatedThreats: Array.isArray(threatIntelligence.relatedThreats) ? 
          (typeof threatIntelligence.relatedThreats[0] === 'string' ? 
            threatIntelligence.relatedThreats.map((threat, index) => ({
              id: index + 1,
              name: threat,
              similarity: 75 + Math.floor(Math.random() * 20),
              lastSeen: ['1 week ago', '2 weeks ago', '1 month ago'][index % 3],
              tactics: ['Initial Access', 'Persistence', 'Privilege Escalation', 'Defense Evasion'][index % 4] ? [['Initial Access', 'Persistence', 'Privilege Escalation', 'Defense Evasion'][index % 4]] : ['Discovery']
            })) : threatIntelligence.relatedThreats) : [],
        indicators: threatIntelligence.indicators || {
          ipAddresses: (threatIntelligence.iocs || [])
            .filter(ioc => ioc.indicatorType === 'IP Address')
            .map(ioc => ({
              ip: ioc.indicatorValue,
              reputation: ioc.description.includes('malicious') ? 'Malicious' : 'Suspicious',
              geoLocation: 'Unknown',
              confidence: ioc.confidence === 'High' ? 85 : ioc.confidence === 'Medium' ? 65 : 45
            })) || [],
          domains: (threatIntelligence.iocs || [])
            .filter(ioc => ioc.indicatorType === 'Domain')
            .map(ioc => ({
              domain: ioc.indicatorValue,
              status: 'Suspicious',
              firstSeen: 'Unknown'
            })) || [],
          hashes: (threatIntelligence.iocs || [])
            .filter(ioc => ioc.indicatorType === 'File Hash' || ioc.indicatorType === 'File Hash (Filename)')
            .map(ioc => ({
              hash: ioc.indicatorValue,
              type: ioc.indicatorType.includes('Filename') ? 'Filename' : 'SHA256',
              malware: 'Unknown'
            })) || []
        },
        predictions: threatIntelligence.predictions || (Array.isArray(threatIntelligence.predictions) ? {
          escalationProbability: 60,
          estimatedImpact: threatIntelligence.threatScore > 70 ? 'High' : threatIntelligence.threatScore > 40 ? 'Medium' : 'Low',
          timeToContainment: threatIntelligence.threatScore > 70 ? '2-6 hours' : '4-12 hours',
          recommendedPriority: threatIntelligence.threatScore > 70 ? 'Critical' : 'High'
        } : threatIntelligence.predictions)
      };
      
      res.json(normalizedResponse);

    } catch (parseError) {
      console.error('Failed to parse threat intelligence response:', parseError);
      console.error('AI Response preview:', aiResponse.substring(0, 500));
      
      // Use AI-driven emergency analysis instead of hardcoded fallback
      const emergencyPrompt = `Emergency threat intelligence analysis for incident that failed parsing.

INCIDENT CONTEXT:
- Type: ${incident.type}
- Executive Summary: ${incident.executiveSummary}
- Available Evidence: ${JSON.stringify(incident.report?.evidenceAndArtifacts || {}, null, 2)}

TASK: Provide basic threat intelligence analysis based on available context. Focus on:
1. Calculate realistic threat score based on incident type and available evidence
2. Assess confidence level based on data quality
3. Identify potential related threats based on incident characteristics
4. Extract any available IOCs from evidence data
5. Provide realistic predictions based on incident context

Return ONLY valid JSON matching the standard threat intelligence structure. Base all values on actual analysis, not defaults.`;

      try {
        const emergencyResponse = await fetch(
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
                  text: emergencyPrompt
                }]
              }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1000
              }
            })
          }
        );

        if (emergencyResponse.ok) {
          const emergencyData = await emergencyResponse.json();
          const emergencyAiResponse = emergencyData.candidates[0].content.parts[0].text;
          
          let emergencyJsonString = emergencyAiResponse;
          const emergencyCodeBlockMatch = emergencyAiResponse.match(/```json\s*([\s\S]*?)```/);
          if (emergencyCodeBlockMatch) {
            emergencyJsonString = emergencyCodeBlockMatch[1].trim();
          } else {
            const emergencyJsonMatch = emergencyAiResponse.match(/\{[\s\S]*\}/);
            if (emergencyJsonMatch) {
              emergencyJsonString = emergencyJsonMatch[0];
            }
          }

          const emergencyThreatIntelligence = JSON.parse(emergencyJsonString);
          res.json(emergencyThreatIntelligence);
        } else {
          throw new Error('Emergency analysis also failed');
        }
      } catch (emergencyError) {
        console.error('Emergency analysis failed:', emergencyError);
        res.status(500).json({ 
          error: 'Threat intelligence analysis unavailable',
          message: 'Unable to generate threat intelligence analysis. Please check incident data quality and try again.'
        });
      }
    }

  } catch (error) {
    console.error('Threat intelligence analysis error:', error);
    
    // Use AI-driven emergency analysis for critical errors
    const criticalEmergencyPrompt = `CRITICAL: Threat intelligence system failure. Generate basic threat assessment.

MINIMAL INCIDENT DATA:
- Incident Type: ${incident.type}
- Summary: ${incident.executiveSummary}
- Detection: ${incident.report?.detectionDetails?.primaryDetection || 'Unknown'}

EMERGENCY ANALYSIS REQUIREMENTS:
1. Assess threat score based on incident type sophistication (1-100)
2. Evaluate confidence based on available data quality
3. Identify threat patterns matching incident characteristics
4. Extract any technical indicators from available context
5. Provide realistic escalation and impact predictions

OUTPUT: Standard JSON threat intelligence structure with AI-calculated values only.

REQUIRED JSON FORMAT:
{
  "threatScore": <number 1-100>,
  "confidence": "<High/Medium/Low>",
  "relatedThreats": [{"id": <number>, "name": "<name>", "similarity": <percentage>, "lastSeen": "<time>", "tactics": ["<tactics>"]}],
  "indicators": {
    "ipAddresses": [{"ip": "<ip>", "reputation": "<rep>", "geoLocation": "<loc>", "confidence": <pct>}],
    "domains": [{"domain": "<domain>", "status": "<status>", "firstSeen": "<time>"}],
    "hashes": [{"hash": "<hash>", "type": "<type>", "malware": "<family>"}]
  },
  "predictions": {"escalationProbability": <pct>, "estimatedImpact": "<level>", "timeToContainment": "<time>", "recommendedPriority": "<priority>"}
}`;

    try {
      const criticalResponse = await fetch(
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
                text: criticalEmergencyPrompt
              }]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 800
            }
          })
        }
      );

      if (criticalResponse.ok) {
        const criticalData = await criticalResponse.json();
        const criticalAiResponse = criticalData.candidates[0].content.parts[0].text;
        
        let criticalJsonString = criticalAiResponse;
        const criticalCodeBlockMatch = criticalAiResponse.match(/```json\s*([\s\S]*?)```/);
        if (criticalCodeBlockMatch) {
          criticalJsonString = criticalCodeBlockMatch[1].trim();
        } else {
          const criticalJsonMatch = criticalAiResponse.match(/\{[\s\S]*\}/);
          if (criticalJsonMatch) {
            criticalJsonString = criticalJsonMatch[0];
          }
        }

        const criticalThreatIntelligence = JSON.parse(criticalJsonString);
        res.json(criticalThreatIntelligence);
      } else {
        throw new Error('All AI analysis attempts failed');
      }
    } catch (criticalError) {
      console.error('Critical emergency analysis failed:', criticalError);
      res.status(500).json({ 
        error: 'Threat intelligence system unavailable',
        message: 'AI threat analysis system is currently unavailable. Please try again later or contact system administrator.',
        incidentId: incident.id
      });
    }
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

    // Build the full incident context for the chat assistant
    const fullIncidentContext = `${incidentContext}

${dbContext}

Recent Conversation:
${conversationContext}

User Query: ${query}

CRITICAL INSTRUCTIONS:
1. Provide specific answers based on the actual incident data
2. Reference real values from the incident (IDs, severity levels, etc.)
3. If information is not available, say so clearly
4. ALWAYS provide brief, concise replies by default (under 100 words)
5. Use appropriate formatting: lists, tables, bullet points, or one-word answers
6. For recommendations, base them on the actual incident type and severity
7. Use security best practices in your advice
8. Format information in the most suitable way for the context

Response:`;
    
    // Use provider-agnostic AI service
    const aiResponse = await callAI('CHAT_ASSISTANT', {
      chatMode,
      incidentContext: fullIncidentContext
    }, {
      temperature: 0.7,
      maxTokens: 500
    });

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response',
      response: 'I apologize, but I encountered an error processing your request. Please try again or check the incident details directly.'
    });
  }
});

// Health check endpoint to verify Sentinel connectivity
app.get('/sentinel/health', async (req, res) => {
  const DEBUG = process.env.SENTINEL_DEBUG === 'true';
  const startTime = Date.now();
  
  try {
    if (DEBUG) {
      console.log('🏥 Sentinel health check requested');
    }
    
    const status = await validateSentinelConnection();
    const duration = Date.now() - startTime;
    
    if (DEBUG) {
      console.log(`✅ Sentinel health check completed (${duration}ms)`, {
        connected: status.connected,
        hasToken: status.hasToken,
        workspace: status.configuration?.workspace,
        assignee: status.configuration?.assignee
      });
    }
    
    res.json({
      ...status,
      checkDuration: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (DEBUG) {
      console.error(`❌ Sentinel health check failed (${duration}ms)`, {
        error: error.message,
        stack: error.stack
      });
    }
    
    res.status(500).json({ 
      connected: false, 
      error: error.message,
      checkDuration: duration
    });
  }
});

// Generate and email RCA report
app.post('/email/rca', async (req, res) => {
  try {
    const { to, subject = 'Incident RCA Report', report, incidentData } = req.body;
    console.log('[EMAIL] /email/rca request', {
      toPreview: to ? `${to.substring(0, 3)}***` : 'MISSING',
      hasReport: !!report,
      hasIncidentData: !!incidentData
    });
    if (!to) {
      return res.status(400).json({ error: '`to` is required' });
    }

    let rca = report;
    if (!rca && incidentData) {
      console.log('[EMAIL] No prebuilt report supplied. Generating RCA from incidentData');
      rca = await analyzeIncident(incidentData);
      console.log('[EMAIL] RCA generation complete');
    }
    if (!rca) {
      return res.status(400).json({ error: 'Provide `report` (prepared RCA) or `incidentData`' });
    }

    const html = await generateOutlookHtmlFromRCA(rca);
    console.log('[EMAIL] HTML generated', { htmlLength: html ? html.length : 0 });

    console.log('[EMAIL] Sending via SendGrid', {
      toPreview: `${to.substring(0, 3)}***`,
      subjectPreview: subject.substring(0, 60),
      htmlLength: html ? html.length : 0
    });
    await mailSender(to, subject, html);
    console.log('[EMAIL] SendGrid send completed');

    res.json({ ok: true, preview: html.slice(0, 500) });
  } catch (error) {
    console.error('RCA email send failed:', error);
    res.status(500).json({ error: 'Failed to send RCA email', details: error.message });
  }
});

// ===== EMAIL DEBUGGING ENDPOINTS =====

// Get email statistics and debugging information
app.get('/debug/emails', (req, res) => {
  try {
    const emailStats = {
      totalIncidents: incidents.length,
      incidentsWithEmails: incidents.filter(inc => inc.emailTracking).length,
      emailBreakdown: incidents.reduce((acc, inc) => {
        if (inc.emailTracking) {
          const emailCount = inc.emailTracking.totalEmailsSent || 0;
          acc[emailCount] = (acc[emailCount] || 0) + 1;
        }
        return acc;
      }, {}),
      recentIncidents: incidents.slice(0, 10).map(inc => ({
        id: inc.id,
        timestamp: inc.timestamp,
        type: inc.type,
        emailTracking: inc.emailTracking || 'No tracking data',
        hasEmailTracking: !!inc.emailTracking
      })),
      environment: {
        TOSENDERMAIL: !!process.env.TOSENDERMAIL,
        SENTINEL_OWNER_EMAIL: !!process.env.SENTINEL_OWNER_EMAIL,
        SENDGRID_FROM_EMAIL: !!process.env.SENDGRID_FROM_EMAIL,
        SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY
      }
    };
    
    res.json(emailStats);
  } catch (error) {
    console.error('Error getting email debug info:', error);
    res.status(500).json({ error: 'Failed to get email debug info' });
  }
});

// Get detailed email tracking for a specific incident
app.get('/debug/emails/:incidentId', (req, res) => {
  try {
    const incident = incidents.find(inc => inc.id === req.params.incidentId);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    
    const emailDetails = {
      incidentId: incident.id,
      timestamp: incident.timestamp,
      type: incident.type,
      emailTracking: incident.emailTracking || 'No tracking data',
      originalData: {
        id: incident.originalData?.id,
        properties: incident.originalData?.properties,
        name: incident.originalData?.name
      }
    };
    
    res.json(emailDetails);
  } catch (error) {
    console.error('Error getting incident email details:', error);
    res.status(500).json({ error: 'Failed to get incident email details' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`📧 Email debugging endpoints available:`);
  console.log(`   GET /debug/emails - Email statistics overview`);
  console.log(`   GET /debug/emails/:incidentId - Detailed email tracking for specific incident`);
});