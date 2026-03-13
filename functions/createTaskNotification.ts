import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    if (!data || !data.assigned_to) {
      return Response.json({ ok: true, skip: 'no assigned_to' });
    }

    const isCreate = event.type === 'create';
    const assigneeChanged = event.type === 'update' && old_data?.assigned_to !== data.assigned_to;

    if (!isCreate && !assigneeChanged) {
      return Response.json({ ok: true, skip: 'no relevant change' });
    }

    const taskLabel = data.task_type || 'משימה';
    const ownerPart = data.owner_name ? ` – ${data.owner_name}` : '';

    // Try to get assigner's display name from AppUser (by email or username)
    let assignerName = data.assigned_by || 'מנהל';
    if (data.assigned_by) {
      try {
        const allUsers = await base44.asServiceRole.entities.AppUser.list();
        const match = allUsers.find(u =>
          u.email === data.assigned_by || u.username === data.assigned_by
        );
        if (match) {
          assignerName = [match.first_name, match.last_name].filter(Boolean).join(' ') || data.assigned_by;
        }
      } catch (_) { /* fallback to email */ }
    }

    const message = isCreate
      ? `הוקצתה לך משימה חדשה על ידי ${assignerName}: ${taskLabel}${ownerPart}`
      : `המשימה "${taskLabel}${ownerPart}" הועברה אליך על ידי ${assignerName}`;

    const notif = {
      user_username: data.assigned_to,
      type: 'task_assigned',
      message,
      task_id: event.entity_id,
      task_type: data.task_type,
      assigner_name: assignerName,
      is_read: false,
    };

    // Use fetch directly to avoid SDK overhead and CPU limit issues
    const appId = Deno.env.get('BASE44_APP_ID');
    const serviceToken = req.headers.get('x-base44-service-token') || req.headers.get('authorization')?.replace('Bearer ', '');

    await base44.asServiceRole.entities.Notification.create(notif);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});