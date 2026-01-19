import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();
    
    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }
    
    // Invite user to Base44 system
    await base44.users.inviteUser(email, 'user');
    
    console.log(`[INVITE] Successfully invited ${email} to Base44`);
    
    return Response.json({ 
      success: true, 
      message: `User ${email} invited to Base44 successfully` 
    });
    
  } catch (error) {
    console.error('Invite error:', error);
    return Response.json({ 
      error: error.message || 'Failed to invite user' 
    }, { status: 500 });
  }
});