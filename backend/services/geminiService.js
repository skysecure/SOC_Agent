import axios from 'axios';

export async function analyzeIncident(incidentData) {
  try {
    const prompt = `As a Security Operations Center expert, analyze the following security incident and provide a comprehensive report.
    
    Incident Data:
    ${JSON.stringify(incidentData, null, 2)}
    
    Generate a Security Incident Report with the following structure:
    1. Executive Summary (brief overview)
    2. Incident Details
       - Timestamp
       - Affected Systems
       - Type of Incident
    3. Severity Assessment (Critical/High/Medium/Low with justification)
    4. Root Cause Analysis
       - Technical Analysis
       - Attack Vector
       - Contributing Factors
    5. Impact Assessment
    6. Recommended Actions
       - Immediate Actions
       - Long-term Remediation
    7. Prevention Measures
    
    Format the response as a structured JSON object with these keys: executiveSummary, incidentDetails, severityAssessment (with level and justification), rootCauseAnalysis, impactAssessment, recommendedActions (with immediate and longTerm arrays), preventionMeasures (array).`;

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
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
    }
    
    return {
      executiveSummary: "Analysis completed",
      incidentDetails: incidentData,
      severityAssessment: { level: "Medium", justification: "Automated assessment" },
      rootCauseAnalysis: { analysis: text },
      impactAssessment: "To be determined",
      recommendedActions: { immediate: [], longTerm: [] },
      preventionMeasures: []
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to analyze incident with Gemini');
  }
}