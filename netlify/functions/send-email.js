const { Resend } = require('resend');

exports.handler = async (event, context) => {
  // Handle CORS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Check if Resend API key is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    console.log('RESEND_API_KEY configured:', resendApiKey ? 'Yes' : 'No');
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable is not configured');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'Email service not configured', 
          details: 'RESEND_API_KEY environment variable is missing' 
        }),
      };
    }

    const resend = new Resend(resendApiKey);
    const { emailData } = JSON.parse(event.body);
    
    console.log('Email data received:', JSON.stringify(emailData, null, 2));
    
    if (!emailData) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Email data is required' }),
      };
    }

    const { to, subject, html } = emailData;

    // Validate required fields
    if (!to || !subject || !html) {
      console.error('Missing required fields:', { to: !!to, subject: !!subject, html: !!html });
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing required fields: to, subject, or html' }),
      };
    }

    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    console.log('Sending email from:', fromEmail, 'to:', to);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: to,
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Resend API error:', JSON.stringify(error, null, 2));
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Failed to send email', details: error }),
      };
    }

    console.log('Email sent successfully:', data);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ success: true, data }),
    };
  } catch (error) {
    console.error('Serverless function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
};
