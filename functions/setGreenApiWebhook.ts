Deno.serve(async (req) => {
  const instanceId = Deno.env.get('GREEN_API_INSTANCE_ID');
  const token = Deno.env.get('GREEN_API_TOKEN');

  if (!instanceId || !token) {
    return Response.json({ error: 'GREEN_API_INSTANCE_ID or GREEN_API_TOKEN not set' }, { status: 500 });
  }

  const WEBHOOK_URL = 'https://even-piranha-94-d6ej5fqpy72q.deno.dev/whatsappWebhook';

  // קודם בדוק מה ה-webhook URL הנוכחי
  const getRes = await fetch(`https://api.green-api.com/waInstance${instanceId}/getSettings/${token}`);
  const getText = await getRes.text();
  console.log('[GreenAPI] getSettings raw response:', getText);
  let settings = {};
  try { settings = JSON.parse(getText); } catch(e) { return Response.json({ error: 'getSettings failed', raw: getText }, { status: 500 }); }

  console.log('[GreenAPI] Current webhookUrl:', settings.webhookUrl);
  console.log('[GreenAPI] Current webhookUrlToken:', settings.webhookUrlToken);
  console.log('[GreenAPI] All settings:', JSON.stringify(settings));

  // עדכן את ה-webhook URL
  const setRes = await fetch(`https://api.green-api.com/waInstance${instanceId}/setSettings/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      webhookUrl: WEBHOOK_URL,
      incomingWebhook: 'yes',
      outgoingWebhook: 'no',
      outgoingAPIMessageWebhook: 'no',
    }),
  });
  const setData = await setRes.json();
  console.log('[GreenAPI] setSettings response:', JSON.stringify(setData));

  return Response.json({
    previousWebhookUrl: settings.webhookUrl,
    newWebhookUrl: WEBHOOK_URL,
    setResult: setData,
    allCurrentSettings: settings,
  });
});