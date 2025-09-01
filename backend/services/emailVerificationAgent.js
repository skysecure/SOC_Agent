import axios from 'axios';

export async function verifyAndFixEmailReport(htmlContent, fullRCAData) {
  try {
    const verificationPrompt = createDynamicVerificationPrompt(htmlContent, fullRCAData);
    
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        contents: [{
          parts: [{ text: verificationPrompt }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8000
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': process.env.GEMINI_API_KEY
        }
      }
    );

    const fixedHtml = extractHtmlFromResponse(response.data);
    console.log('[VERIFICATION] Successfully fixed email report');
    return fixedHtml;
  } catch (error) {
    console.error('[VERIFICATION] Failed to verify email:', error);
    throw error;
  }
}

function createDynamicVerificationPrompt(html, rca) {
  return `You are a security analyst enhancing an incident report. Your task is to fix ALL empty fields and [object Object] issues.

CURRENT HTML REPORT:
${html}

RCA DATA FOR REFERENCE:
${JSON.stringify(rca, null, 2)}

CRITICAL FIXES REQUIRED:

1. EMPTY IMPACT FIELDS:
   - If Systems Impact is empty: Based on "${rca.incidentDetails?.typeOfIncident}", describe which systems are affected
   - If User Impact is empty: Based on "${rca.incidentDetails?.affectedService}", assess user implications
   - If Data Impact is empty: Analyze data risks for this incident type
   - If Business Impact is empty: Determine business process disruption
   - If Compliance Impact is empty: Consider regulatory implications

2. [object Object] IN CONTRIBUTING FACTORS:
   - Look in rca.rootCauseAnalysis.contributingFactors array
   - Extract the actual text from each object
   - Format as comma-separated list

3. EMPTY CONTROL FAILURES:
   - Analyze what security controls should have prevented this incident
   - Provide meaningful assessment

4. STRUCTURE FIXES:
   - Remove Executive Summary section completely
   - In Containment & Remediation: Remove time labels, use "Actions Taken", "Eradication Steps", "Recovery Process"
   - In Recommended Next Steps: Remove time categories, use numbered list (1, 2, 3...)

5. EXTRACTION RULES:
   - For {primaryDetection: {rule: "X", source: "Y"}}, extract as "X (Y)"
   - For [{id:1, task:"X"}, {id:2, task:"Y"}], format as numbered list
   - For empty fields, provide intelligent analysis based on incident context

OUTPUT REQUIREMENTS:
- Return the COMPLETE HTML report
- NO empty table cells
- NO [object Object] strings
- NO Executive Summary section
- NO time-based categories
- Start with <div style="max-width:700px;margin:0 auto">
- End with </div>
- Maintain all table styling exactly as in the input`;
}

function extractHtmlFromResponse(responseData) {
  try {
    const text = responseData.candidates[0].content.parts[0].text;
    
    // Try to extract HTML from markdown code blocks
    const codeBlockMatch = text.match(/```html\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    
    // If no code block, assume the entire response is HTML
    if (text.trim().startsWith('<')) {
      return text.trim();
    }
    
    // Try to find HTML content
    const htmlMatch = text.match(/<div[\s\S]*<\/div>/);
    if (htmlMatch) {
      return htmlMatch[0];
    }
    
    throw new Error('Could not extract valid HTML from response');
  } catch (error) {
    console.error('[VERIFICATION] Failed to extract HTML:', error);
    throw error;
  }
}

export default { verifyAndFixEmailReport };