import { callAI } from './aiService.js';

export async function verifyAndFixEmailReport(htmlContent, fullRCAData) {
  try {
    // Use provider-agnostic AI service
    const aiResponse = await callAI('EMAIL_VERIFIER', {
      htmlContent,
      rcaData: fullRCAData
    }, {
      temperature: 0.1,
      maxTokens: 8000
    });

    const fixedHtml = extractHtmlFromResponse(aiResponse);
    console.log('[VERIFICATION] Successfully fixed email report');
    return fixedHtml;
  } catch (error) {
    console.error('[VERIFICATION] Failed to verify email:', error);
    throw error;
  }
}

export async function verifyAndEnhanceAckEmail(htmlContent, ackData) {
  try {
    const aiResponse = await callAI('EMAIL_ACK_FORMATTER', {
      htmlContent,
      ackData
    }, {
      temperature: 0.1,
      maxTokens: 4000
    });

    const fixedHtml = extractHtmlFromResponse(aiResponse);
    console.log('[VERIFICATION] Successfully enhanced acknowledgement email');
    return fixedHtml;
  } catch (error) {
    console.error('[VERIFICATION] Failed to enhance acknowledgement email:', error);
    throw error;
  }
}

// Deprecated - now using centralized prompt from config/prompts.js
// function createDynamicVerificationPrompt is no longer needed

function extractHtmlFromResponse(text) {
  try {
    
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