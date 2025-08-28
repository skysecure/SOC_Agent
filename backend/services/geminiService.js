import axios from 'axios';
import { Agent1_instructions } from './agentInstructions.js';

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
    - incidentOverview (including id, timestamp, users, validatedSeverity, severityJustification, executiveSummary, initialIndicators, attackProgression)
    - timelineOfEvents (array of events with timestamps and descriptions)
    - detectionDetails (primaryDetection, secondaryDetections, sourceAnalysis, effectiveness, correlation)
    - attackVectorAndTechniques (accessVector, mitreMapping, tools, sophistication, evasion)
    - rootCauseAnalysis (primaryCause, contributingFactors, controlFailures, vulnerabilityTimeline, previousIncidents, riskAcceptance)
    - scopeAndImpact (systems, users, data, business, compliance, duration)
    - containmentAndRemediation (immediate, shortTerm, eradication, recovery, validation)
    - recommendations (immediateActions, shortTermImprovements, longTermStrategic, lessonsLearned)
    - evidenceAndArtifacts (primaryEvidence, iocs, behavioralIndicators, forensicArtifacts, queries)
    - additionalDataRequirements (critical, high, medium priority needs)`;

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
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        
        // Transform the response to match the expected frontend structure
        return {
          executiveSummary: parsedResponse.incidentOverview?.executiveSummary || "Analysis completed",
          incidentDetails: {
            id: parsedResponse.incidentOverview?.id || incidentData.id,
            timestamp: parsedResponse.incidentOverview?.timestamp || incidentData.createdTimeUtc,
            affectedSystems: parsedResponse.scopeAndImpact?.systems || incidentData.entities,
            typeOfIncident: parsedResponse.attackVectorAndTechniques?.accessVector || "Unknown"
          },
          severityAssessment: {
            level: parsedResponse.incidentOverview?.validatedSeverity || "Medium",
            justification: parsedResponse.incidentOverview?.severityJustification || "Automated assessment based on incident analysis"
          },
          rootCauseAnalysis: parsedResponse.rootCauseAnalysis || { 
            primaryCause: "To be determined",
            contributingFactors: [],
            analysis: text 
          },
          impactAssessment: parsedResponse.scopeAndImpact || "To be determined",
          recommendedActions: {
            immediate: parsedResponse.recommendations?.immediateActions || [],
            longTerm: parsedResponse.recommendations?.longTermStrategic || []
          },
          preventionMeasures: parsedResponse.recommendations?.lessonsLearned || [],
          
          // Additional detailed RCA data
          fullRCAReport: parsedResponse
        };
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
    }
    
    // Fallback response if parsing fails
    return {
      executiveSummary: "Analysis completed with errors",
      incidentDetails: incidentData,
      severityAssessment: { 
        level: "Medium", 
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