import sgMail from '@sendgrid/mail';

const { SENDGRID_API_KEY, SENDGRID_FROM_EMAIL } = process.env;
sgMail.setApiKey(SENDGRID_API_KEY);

export const mailSender = async (to, subject, template) => {
  const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  try {
    const msg = { to, from: SENDGRID_FROM_EMAIL, subject, html: template };
    
    console.log(`📧 [MAIL] Starting email send - ${emailId}`, {
      emailId: emailId,
      toPreview: to ? `${to.substring(0, 3)}***` : 'MISSING',
      from: SENDGRID_FROM_EMAIL,
      subjectPreview: subject ? subject.substring(0, 60) : 'MISSING',
      htmlLength: template ? template.length : 0,
      timestamp: new Date().toISOString()
    });
    
    const mail = await sgMail.send(msg);
    const sendDuration = Date.now() - startTime;
    
    console.log(`✅ [MAIL] Email sent successfully - ${emailId}`, {
      emailId: emailId,
      statusCode: mail?.[0]?.statusCode,
      sendDuration: sendDuration,
      headersPreview: mail?.[0]?.headers ? Object.keys(mail[0].headers).slice(0, 5) : [],
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      emailId: emailId,
      sendDuration: sendDuration,
      statusCode: mail?.[0]?.statusCode
    };
    
  } catch (error) {
    const errorDuration = Date.now() - startTime;
    
    const errorInfo = {
      emailId: emailId,
      toPreview: to ? `${to.substring(0, 3)}***` : 'MISSING',
      subjectPreview: subject ? subject.substring(0, 60) : 'MISSING',
      message: error?.message,
      code: error?.code,
      responseStatus: error?.response?.statusCode,
      responseBody: error?.response?.body,
      errorDuration: errorDuration,
      timestamp: new Date().toISOString()
    };
    
    console.error(`❌ [MAIL] Email send failed - ${emailId}:`, errorInfo);
    throw error;
  }
};


