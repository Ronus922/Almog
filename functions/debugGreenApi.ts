import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const instanceId = Deno.env.get('GREEN_API_INSTANCE_ID');
    const apiToken = Deno.env.get('GREEN_API_TOKEN');

    // בדיקת מצב המופע
    const stateRes = await fetch(
      `https://api.green-api.com/waInstance${instanceId}/getStateInstance/${apiToken}`
    );
    const stateData = await stateRes.json();

    // בדיקת GetAvatar עם מספר ספציפי
    const avatarRes = await fetch(
      `https://api.green-api.com/waInstance${instanceId}/getAvatar/${apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: '972508779989@c.us' })
      }
    );

    const avatarStatus = avatarRes.status;
    let avatarData = null;
    try { avatarData = await avatarRes.json(); } catch(e) { avatarData = { parseError: e.message }; }

    return Response.json({
      instanceId,
      instanceState: stateData,
      avatarTestStatus: avatarStatus,
      avatarTestData: avatarData
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});