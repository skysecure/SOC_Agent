import sgMail from '@sendgrid/mail';

const { SENDGRID_API_KEY, SENDGRID_FROM_EMAIL } = process.env;
sgMail.setApiKey(SENDGRID_API_KEY);

export const mailSender = async (to, subject, template) => {
  try {
    const msg = { to, from: SENDGRID_FROM_EMAIL, subject, html: template };
    console.log('[MAIL] Sending email', {
      toPreview: to ? `${to.substring(0, 3)}***` : 'MISSING',
      from: SENDGRID_FROM_EMAIL,
      subjectPreview: subject ? subject.substring(0, 60) : 'MISSING',
      htmlLength: template ? template.length : 0
    });
    const mail = await sgMail.send(msg);
    console.log('[MAIL] SendGrid response', {
      statusCode: mail?.[0]?.statusCode,
      headersPreview: mail?.[0]?.headers ? Object.keys(mail[0].headers).slice(0, 5) : []
    });
  } catch (error) {
    console.error('[MAIL] Send error', {
      toPreview: to ? `${to.substring(0, 3)}***` : 'MISSING',
      message: error?.message,
      code: error?.code,
      responseStatus: error?.response?.statusCode,
      responseBody: error?.response?.body
    });
    throw error;
  }
};


