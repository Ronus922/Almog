import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { email } = await req.json();
    
    console.log('Starting email test...');
    console.log('Recipient:', email);
    
    const result = await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: 'בדיקת מערכת מייל',
      body: '<div dir="rtl"><h1>זהו מייל בדיקה</h1><p>אם אתה רואה את זה, המייל עובד!</p></div>'
    });
    
    console.log('SendEmail result:', JSON.stringify(result));
    
    return Response.json({ 
      success: true,
      result,
      message: 'Email sent successfully'
    });
    
  } catch (error) {
    console.error('Email test error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});