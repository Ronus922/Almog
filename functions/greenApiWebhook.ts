Deno.serve(async (req) => {
  try {
    const body = await req.text();
    console.log('[WEBHOOK RAW HIT] Request received');
    console.log('[WEBHOOK RAW HIT] Body:', body);
    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[WEBHOOK RAW HIT] Error:', error.message);
    return Response.json({ success: true }, { status: 200 });
  }
});