import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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

    const taskId = event.entity_id;
    const assignee = data.assigned_to;
    const type = isCreate ? 'task_assigned' : 'task_reassigned';
    const dedupeKey = `${type}:${taskId}:${assignee}`;

    // בדיקת כפילות
    const existing = await base44.asServiceRole.entities.Notification.filter({
      user_username: assignee,
      dedupe_key: dedupeKey,
    });
    if (existing && existing.length > 0) {
      return Response.json({ ok: true, skip: 'duplicate' });
    }

    // שם המקצה
    let assignerName = data.assigned_by || 'מנהל';
    if (data.assigned_by) {
      try {
        const allUsers = await base44.asServiceRole.entities.AppUser.list();
        const match = allUsers.find(u => u.email === data.assigned_by || u.username === data.assigned_by);
        if (match) assignerName = [match.first_name, match.last_name].filter(Boolean).join(' ') || data.assigned_by;
      } catch (_) {}
    }

    const taskLabel = data.task_type || 'משימה';
    const ownerPart = data.owner_name ? ` – ${data.owner_name}` : '';
    const title = isCreate ? 'הוקצתה לך משימה חדשה' : 'משימה הועברה אליך';
    const message = isCreate
      ? `הוקצתה לך משימה חדשה על ידי ${assignerName}: ${taskLabel}${ownerPart}`
      : `המשימה "${taskLabel}${ownerPart}" הועברה אליך על ידי ${assignerName}`;

    await base44.asServiceRole.entities.Notification.create({
      user_username: assignee,
      type,
      title,
      message,
      source_module: 'tasks',
      source_entity_type: 'Task',
      source_entity_id: taskId,
      action_url: '/Tasks',
      priority: 'normal',
      dedupe_key: dedupeKey,
      task_id: taskId,
      assigner_name: assignerName,
      is_read: false,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});