import axios from 'axios';
import { Agent1_instructions } from './agentInstructions.js';

// Normalize severity levels to allowed values
function normalizeSeverity(severity) {
  if (!severity) return 'medium';
  const normalized = severity.toLowerCase().trim();
  const severityMap = {
    'critical': 'high',
    'high': 'high',
    'medium': 'medium',
    'low': 'low',
    'unknown': 'informational',
    'info': 'informational',
    'informational': 'informational'
  };
  return severityMap[normalized] || 'medium';
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
    - incidentOverview (including id, timestamp, typeOfIncident, users, validatedSeverity, severityJustification, executiveSummary, initialIndicators, attackProgression)
    - timelineOfEvents (array of events with timestamps and descriptions)
    - detectionDetails (primaryDetection, secondaryDetections, sourceAnalysis, effectiveness, correlation)
    - attackVectorAndTechniques (accessVector, mitreMapping, tools, sophistication, evasion)
    - rootCauseAnalysis (primaryCause, contributingFactors, controlFailures, vulnerabilityTimeline, previousIncidents, riskAcceptance)
    - scopeAndImpact (systems, users, data, business, compliance, duration)
    - containmentAndRemediation (immediate, shortTerm, eradication, recovery, validation)
    - recommendations (immediateActions, shortTermImprovements, longTermStrategic, lessonsLearned)
    - evidenceAndArtifacts (primaryEvidence, iocs, behavioralIndicators, forensicArtifacts, queries)
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
    
    try {
      // Extract JSON from markdown code blocks or raw JSON
      let jsonString = text;
      
      // First try to extract from markdown code blocks
      const codeBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
      } else {
        // Try to extract raw JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
      }
      
      // Parse the JSON
      const parsedResponse = JSON.parse(jsonString);
      console.log('Successfully parsed RCA response');
        
        // Transform the response to match the expected frontend structure
        const transformedResponse = {
          executiveSummary: parsedResponse.incidentOverview?.executiveSummary || 
                          parsedResponse.executiveSummary || 
                          "Analysis completed",
          
          incidentDetails: {
            id: parsedResponse.incidentOverview?.id || 
                incidentData.id || 
                incidentData.properties?.id,
            timestamp: parsedResponse.incidentOverview?.createdTimeUtc || 
                      incidentData.properties?.createdTimeUtc || 
                      incidentData.createdTimeUtc,
            affectedSystems: parsedResponse.scopeAndImpact?.systemsImpact?.countAndListOfAffectedServers || 
                           parsedResponse.scopeAndImpact?.systems || 
                           incidentData.entities || [],
            typeOfIncident: parsedResponse.incidentOverview?.typeOfIncident || 
                           parsedResponse.incidentOverview?.title || 
                           "Security Incident",
            affectedUsers: parsedResponse.incidentOverview?.['affectedUPN/Users'] || 
                          parsedResponse.incidentOverview?.affectedUsers || []
          },
          
          severityAssessment: {
            level: normalizeSeverity(
              parsedResponse.incidentOverview?.['VALIDATED Severity Level'] || 
              parsedResponse.incidentOverview?.validatedSeverity || 
              parsedResponse.severityAssessment?.level || 
              incidentData.properties?.severity ||
              'medium'
            ),
            justification: parsedResponse.incidentOverview?.severityJustification || 
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
            immediate: parsedResponse.recommendations?.immediateActions || 
                      parsedResponse.containmentAndRemediation?.immediateContainment || [],
            longTerm: parsedResponse.recommendations?.longTermStrategic || 
                     parsedResponse.recommendations?.['long-TermStrategic'] || []
          },
          
          preventionMeasures: parsedResponse.recommendations?.lessonsLearned || [],
          
          // Store all parsed sections
          timelineOfEvents: parsedResponse.timelineOfEvents || [],
          detectionDetails: parsedResponse.detectionDetails || {},
          attackVectorAndTechniques: parsedResponse.attackVectorAndTechniques || {},
          containmentAndRemediation: parsedResponse.containmentAndRemediation || {},
          evidenceAndArtifacts: parsedResponse.evidenceAndArtifacts || {},
          additionalDataRequirements: parsedResponse.additionalDataRequirements || {},
          
          // Additional detailed RCA data
          fullRCAReport: parsedResponse
        };
        
        console.log('Transformed response with incident type:', transformedResponse.incidentDetails.typeOfIncident);
        return transformedResponse;
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw text received:', text.substring(0, 500) + '...');
    }
    
    // Fallback response if parsing fails
    return {
      executiveSummary: "Analysis completed with errors",
      incidentDetails: incidentData,
      severityAssessment: { 
        level: "medium", 
        justification: "Unable to perform detailed analysis - using default assessment" 
      },
      rootCauseAnalysis: { 
        analysis: text,
        error: "Failed to parse detailed RCA response"
      },
      impactAssessment: "To be determined",
      recommendedActions: { immediate: [], longTerm: [] },
      preventionMeasures: []
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to analyze incident with Gemini');
  }
}