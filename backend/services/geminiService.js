import axios from 'axios';
import { Agent1_instructions } from './agentInstructions.js';

// Normalize severity levels to allowed values
function normalizeSeverity(severity) {
  if (!severity) {
    console.log('WARNING: Severity normalization fallback - no severity provided');
    return null; // Don't assume medium
  }
  const normalized = severity.toLowerCase().trim();
  const severityMap = {
    'high': 'high',
    'medium': 'medium',
    'low': 'low',
    'unknown': 'informational',
    'info': 'informational',
    'informational': 'informational'
  };
  
  if (!severityMap[normalized]) {
    console.log(`WARNING: Severity normalization fallback - unknown severity "${severity}"`);
    return null; // Don't assume medium
  }
  
  return severityMap[normalized];
}

export async function analyzeIncident(incidentData) {
  try {
    const prompt = `${Agent1_instructions}
    
    INCIDENT DATA TO ANALYZE:
    ${JSON.stringify(incidentData, null, 2)}
    
    IMPORTANT: You must analyze this incident following the exact 9-section RCA format specified in your instructions. Remember to:
    1. Perform independent severity assessment (ignore any provided severity)
    2. Provide detailed analysis (minimum 3-5 sentences per section)
    3. Include specific evidence and metrics
    4. Generate the response as a structured JSON object
    
    The JSON response must include these keys:
    - incidentOverview (including id, owner, openedUTC, status, detectionSource, analyticsRuleName, environment, affectedService, timestamp, typeOfIncident, users, initialSeverity, aiAssessedSeverity, severityAssessment, executiveSummary, initialIndicators, attackProgression)
    - timelineOfEvents (structured array with timestamp, source, eventAction, notes, confidence)
    - detectionDetails (primaryDetection, secondaryDetections, sourceAnalysis, effectiveness, correlation)
    - attackVectorAndTechniques (accessVector, mitreMapping, tools, sophistication, evasion)
    - rootCauseAnalysis (primaryCause, contributingFactors, controlFailures, vulnerabilityTimeline, previousIncidents, riskAcceptance)
    - scopeAndImpact (systems, users, data, business, compliance, duration)
    - containmentAndRemediation (immediate, shortTerm, eradication, recovery, validation)
    - recommendationsActionsFollowUp (verdict, verdictRationale, actionsTaken, immediateActions, shortTermImprovements, longTermStrategic, followUpTasks, lessonsLearned)
    - evidenceAndArtifacts (primaryEvidence, logFieldInterpretation, iocs, behavioralIndicators, forensicArtifacts, entityAppendices, queries)
    - additionalDataRequirements (critical, high, medium priority needs)
    
    CRITICAL: The incidentOverview MUST include a specific "typeOfIncident" field with a clear, industry-standard incident classification.`;

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': process.env.GEMINI_API_KEY
        }
      }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    console.log('Raw Gemini response length:', text.length);
    console.log('Raw Gemini response preview:', text.substring(0, 200) + '...');
    
    try {
      // Extract JSON from markdown code blocks or raw JSON
      let jsonString = text;
      
      // First try to extract from markdown code blocks
      const codeBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        console.log('Found JSON in code block');
        jsonString = codeBlockMatch[1].trim();
      } else {
        console.log('No code block found, looking for raw JSON');
        // Try to extract raw JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('Found raw JSON');
          jsonString = jsonMatch[0];
        } else {
          console.log('ERROR: No JSON found in response');
          console.log('Full response:', text);
          throw new Error('No JSON found in Gemini response');
        }
      }
      
      console.log('Attempting to parse JSON string length:', jsonString.length);
      // Parse the JSON
      const parsedResponse = JSON.parse(jsonString);
      console.log('Successfully parsed RCA response');
      console.log('Parsed severity values:', {
        initial: parsedResponse.incidentOverview?.initialSeverity,
        aiAssessed: parsedResponse.incidentOverview?.aiAssessedSeverity,
        validatedSeverity: parsedResponse.incidentOverview?.validatedSeverity
      });
        
        // Transform the response to match the expected frontend structure
        const transformedResponse = {
          executiveSummary: parsedResponse.incidentOverview?.executiveSummary || 
                          parsedResponse.executiveSummary || 
                          "Analysis completed",
          
          incidentDetails: {
            id: parsedResponse.incidentOverview?.incidentId || 
                parsedResponse.incidentOverview?.id || 
                incidentData.id || 
                incidentData.properties?.id,
            owner: parsedResponse.incidentOverview?.owner || 
                   parsedResponse.incidentOverview?.analyst || 
                   incidentData.properties?.owner?.userPrincipalName || 
                   "Unassigned",
            openedUTC: parsedResponse.incidentOverview?.openedUTC || 
                       parsedResponse.incidentOverview?.createdTimeUtc || 
                       incidentData.properties?.createdTimeUtc || 
                       incidentData.createdTimeUtc,
            status: parsedResponse.incidentOverview?.status || 
                    incidentData.properties?.status || 
                    "Active",
            detectionSource: parsedResponse.incidentOverview?.detectionSource || 
                            "Unknown",
            analyticsRuleName: parsedResponse.incidentOverview?.analyticsRuleName || 
                              incidentData.properties?.alertDisplayName || 
                              "N/A",
            environment: parsedResponse.incidentOverview?.environment || 
                        parsedResponse.incidentOverview?.tenant || 
                        "Production",
            affectedService: parsedResponse.incidentOverview?.affectedService || 
                            "Unknown",
            timestamp: parsedResponse.incidentOverview?.createdTimeUtc || 
                      incidentData.properties?.createdTimeUtc || 
                      incidentData.createdTimeUtc,
            affectedSystems: parsedResponse.scopeAndImpact?.systemsImpact?.countAndListOfAffectedServers || 
                           parsedResponse.scopeAndImpact?.systems || 
                           incidentData.entities || [],
            typeOfIncident: parsedResponse.incidentOverview?.typeOfIncident || 
                           parsedResponse.incidentOverview?.title || 
                           "Security Incident",
            affectedUsers: parsedResponse.incidentOverview?.affectedUPN || 
                          parsedResponse.incidentOverview?.affectedUsers || []
          },
          
          severityAssessment: {
            initialSeverity: normalizeSeverity(
              parsedResponse.incidentOverview?.initialSeverity || 
              incidentData.properties?.severity
            ) || 'informational', // Use informational instead of medium as fallback
            aiAssessedSeverity: normalizeSeverity(
              parsedResponse.incidentOverview?.aiAssessedSeverity || 
              parsedResponse.incidentOverview?.validatedSeverity || 
              parsedResponse.severityAssessment?.level
            ) || 'informational', // Default to informational if parsing fails
            severityParsingNote: !parsedResponse.incidentOverview?.aiAssessedSeverity ? 'AI severity not found in response - defaulted to informational' : null,
            severityMatch: parsedResponse.incidentOverview?.severityAssessment?.includes('Match') || 
                          (parsedResponse.incidentOverview?.initialSeverity === parsedResponse.incidentOverview?.aiAssessedSeverity),
            justification: parsedResponse.incidentOverview?.severityAssessment || 
                          parsedResponse.incidentOverview?.severityJustification || 
                          parsedResponse.severityAssessment?.justification || 
                          "Automated assessment based on incident analysis"
          },
          
          rootCauseAnalysis: parsedResponse.rootCauseAnalysis || { 
            primaryCause: parsedResponse.rootCauseAnalysis?.['PRIMARY ROOT CAUSE'] || "To be determined",
            contributingFactors: parsedResponse.rootCauseAnalysis?.['Contributing Factors'] || [],
            controlFailureAnalysis: parsedResponse.rootCauseAnalysis?.controlFailureAnalysis || {},
            vulnerabilityTimeline: parsedResponse.rootCauseAnalysis?.vulnerabilityTimeline || "",
            previousIncidents: parsedResponse.rootCauseAnalysis?.previousIncidents || "",
            riskAcceptance: parsedResponse.rootCauseAnalysis?.riskAcceptance || ""
          },
          
          impactAssessment: parsedResponse.scopeAndImpact || {
            systemsImpact: {},
            userImpact: {},
            dataImpact: {},
            businessImpact: {},
            complianceImpact: {},
            attackDuration: ""
          },
          
          recommendedActions: {
            immediate: parsedResponse.recommendationsActionsFollowUp?.immediateActions || 
                      parsedResponse.recommendations?.immediateActions || 
                      parsedResponse.containmentAndRemediation?.immediateContainment || [],
            shortTerm: parsedResponse.recommendationsActionsFollowUp?.shortTermImprovements || 
                      parsedResponse.recommendations?.shortTermImprovements || [],
            longTerm: parsedResponse.recommendationsActionsFollowUp?.longTermStrategic || 
                     parsedResponse.recommendations?.longTermStrategic || []
          },
          
          verdict: parsedResponse.recommendationsActionsFollowUp?.verdict || "Under Investigation",
          verdictRationale: parsedResponse.recommendationsActionsFollowUp?.verdictRationale || "",
          actionsTaken: parsedResponse.recommendationsActionsFollowUp?.actionsTaken || {},
          followUpTasks: parsedResponse.recommendationsActionsFollowUp?.followUpTasks || [],
          
          preventionMeasures: parsedResponse.recommendationsActionsFollowUp?.lessonsLearned || 
                             parsedResponse.recommendations?.lessonsLearned || [],
          
          // Store all parsed sections
          timelineOfEvents: parsedResponse.timelineOfEvents || [],
          detectionDetails: parsedResponse.detectionDetails || {},
          attackVectorAndTechniques: parsedResponse.attackVectorAndTechniques || {},
          containmentAndRemediation: parsedResponse.containmentAndRemediation || {},
          evidenceAndArtifacts: {
            ...parsedResponse.evidenceAndArtifacts,
            logFieldInterpretation: parsedResponse.evidenceAndArtifacts?.logFieldInterpretation || [],
            entityAppendices: parsedResponse.evidenceAndArtifacts?.entityAppendices || {
              ipAddresses: [],
              urls: [],
              domains: []
            }
          },
          additionalDataRequirements: parsedResponse.additionalDataRequirements || {},
          
          // Additional detailed RCA data
          fullRCAReport: parsedResponse
        };
        
        console.log('Transformed response with incident type:', transformedResponse.incidentDetails.typeOfIncident);
        return transformedResponse;
    } catch (parseError) {
      console.error('JSON PARSING FAILED - This is likely why you\'re getting medium severity!');
      console.error('Parse error details:', parseError.message);
      console.error('Raw Gemini response (first 1000 chars):', text.substring(0, 1000));
      console.error('Raw Gemini response (last 500 chars):', text.substring(Math.max(0, text.length - 500)));
      
      // Don't return a fallback - throw error to surface the issue
      throw new Error(`JSON parsing failed: ${parseError.message}. Raw response length: ${text.length}`);
    }
    
    // This fallback should never be reached now
    console.error('CRITICAL: Reached unexpected fallback in geminiService');
    throw new Error('Unexpected code path - investigation needed');
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to analyze incident with Gemini');
  }
}