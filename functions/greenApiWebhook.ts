Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const headers = Object.fromEntries(req.headers.entries());
    console.log('[WEBHOOK RAW HIT] Request received');
    console.log('[WEBHOOK RAW HIT] Headers:', JSON.stringify(headers, null, 2));
    console.log('[WEBHOOK RAW HIT] Body:', body);
    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[WEBHOOK RAW HIT] Error:', error.message);
    return Response.json({ success: true }, { status: 200 });
  }
});