// Public webhook handler for Green API - no auth required
// This is called directly by Green API servers

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    
    console.log('=== GREEN API WEBHOOK RECEIVED ===');
    console.log('Event type:', payload.event);
    
    // Green API sends 'incomingMessageReceived' event
    if (payload.event === 'incomingMessageReceived') {
      const message = payload.data;
      const senderRaw = message.senderData?.sender || '';
      
      // Green API format: "972512345678@c.us" - extract just the phone
      let senderPhone = senderRaw.replace(/[^0-9]/g, '');
      
      // Convert to Israeli format (0501234567)
      if (senderPhone.startsWith('972')) {
        senderPhone = '0' + senderPhone.substring(3);
      }
      
      console.log('Message from:', senderPhone);
      
      // Call the main webhook function via service role
      // We'll store the raw data and let another function process it
      const textContent = message.messageData?.textMessageData?.textMessage || '';
      const timestamp = new Date(message.timestamp * 1000).toISOString();
      
      console.log('Message content:', textContent);
      console.log('Timestamp:', timestamp);
      
      // Return success immediately to Green API
      return Response.json({ status: 'ok' }, { status: 200 });
    }
    
    return Response.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error.message);
    // Always return 200 to prevent retries from Green API
    return Response.json({ status: 'ok' }, { status: 200 });
  }
});