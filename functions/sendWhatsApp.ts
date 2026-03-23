import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { phone, message, fileUrl, fileName } = await req.json();
  if (!phone || (!message && !fileUrl)) return Response.json({ error: 'Missing phone, message, or fileUrl' }, { status: 400 });

  // Try to get credentials from Settings entity first, fallback to env secrets
  let instanceId = Deno.env.get('GREEN_API_INSTANCE_ID');
  let token = Deno.env.get('GREEN_API_TOKEN');
  try {
    const settingsList = await base44.asServiceRole.entities.Settings.list();
    if (settingsList.length > 0) {
      const s = settingsList[0];
      if (s.greenApiInstanceId) instanceId = s.greenApiInstanceId;
      if (s.greenApiToken) token = s.greenApiToken;
    }
  } catch { /* fallback to env */ }
  if (!instanceId || !token) return Response.json({ error: 'Green API credentials not configured' }, { status: 500 });

  // Normalize Israeli phone number to international format
  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('0')) normalized = '972' + normalized.slice(1);
  if (!normalized.startsWith('972')) normalized = '972' + normalized;
  const chatId = normalized + '@c.us';

  // Send file if attached
  if (fileUrl) {
    const fileRes = await fetch(`https://api.green-api.com/waInstance${instanceId}/sendFileByUrl/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, urlFile: fileUrl, fileName: fileName || 'file', caption: message }),
    });
    const fileRawText = await fileRes.text();
    let fileData;
    try { fileData = JSON.parse(fileRawText); } catch {
      return Response.json({ error: `Green API error (${fileRes.status}): ${fileRawText.slice(0, 200)}` }, { status: 502 });
    }
    if (!fileRes.ok) return Response.json({ error: fileData }, { status: fileRes.status });
    return Response.json({ success: true, idMessage: fileData.idMessage });
  }

  // Send text message only
  const res = await fetch(`https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  });

  const rawText = await res.text();
  let data;
  try { data = JSON.parse(rawText); } catch { 
    console.error('Green API parse error:', rawText);
    return Response.json({ error: `Green API error (${res.status}): ${rawText.slice(0, 200)}` }, { status: 502 });
  }
  if (!res.ok) {
    console.error('Green API error response:', data, 'Status:', res.status);
    return Response.json({ error: data, chatId, message }, { status: res.status });
  }
  return Response.json({ success: true, idMessage: data.idMessage });
});