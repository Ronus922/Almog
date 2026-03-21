import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { phoneNumber } = await req.json();
    if (!phoneNumber) return Response.json({ error: 'phoneNumber required' }, { status: 400 });

    const instanceId = Deno.env.get('GREEN_API_INSTANCE_ID');
    const apiToken = Deno.env.get('GREEN_API_TOKEN');

    if (!instanceId || !apiToken) {
      return Response.json({ error: 'Green API credentials not configured' }, { status: 500 });
    }

    // נרמול מספר הטלפון לפורמט בינלאומי
    const digits = phoneNumber.replace(/\D/g, '');
    const chatId = digits.startsWith('972')
      ? digits + '@c.us'
      : digits.startsWith('0')
      ? '972' + digits.substring(1) + '@c.us'
      : '972' + digits + '@c.us';

    // קריאה ל-GetAvatar API של Green API
    const response = await fetch(
      `https://api.green-api.com/waInstance${instanceId}/getAvatar/${apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
      }
    );

    if (!response.ok) {
      return Response.json({ available: false, error: `Green API error: ${response.status}` });
    }

    const data = await response.json();
    // Green API מחזיר: { available: true/false, urlAvatar: "...", reason: "..." }
    return Response.json({
      available: data.available === true,
      urlAvatar: data.urlAvatar || null,
      reason: data.reason || null
    });

  } catch (error) {
    return Response.json({ available: false, error: error.message }, { status: 500 });
  }
});