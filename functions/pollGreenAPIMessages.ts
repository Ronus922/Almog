/**
 * DISABLED - Polling is not active when webhookUrl is configured in Green API Dashboard.
 * 
 * STATUS: MANUAL/DEBUG ONLY
 * This function may be called manually via dashboard if webhook delivery fails.
 * It must NOT run automatically while webhook is active (causes conflicts).
 * 
 * To use: Manually invoke via dashboard. Do NOT schedule or automate.
 */

Deno.serve(async (req) => {
  return Response.json({ 
    error: 'Polling disabled - webhook is the active inbound mechanism',
    status: 'disabled',
    note: 'Primary inbound is greenApiWebhook endpoint. This is debug/manual only.'
  }, { status: 403 });
});