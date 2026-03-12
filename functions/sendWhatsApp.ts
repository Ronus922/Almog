import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { phone, message, fileUrl, fileName } = await req.json();
  if (!phone || !message) return Response.json({ error: 'Missing phone or message' }, { status: 400 });

  const instanceId = Deno.env.get('GREEN_API_INSTANCE_ID');
  const token = Deno.env.get('GREEN_API_TOKEN');

  // Normalize Israeli phone number to international format
  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('0')) normalized = '972' + normalized.slice(1);
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
    return Response.json({ error: `Green API error (${res.status}): ${rawText.slice(0, 200)}` }, { status: 502 });
  }
  if (!res.ok) return Response.json({ error: data }, { status: res.status });
  return Response.json({ success: true, idMessage: data.idMessage });
});