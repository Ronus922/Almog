import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    if (!data) return Response.json({ ok: true, skip: 'no data' });

    const isCreate = event.type === 'create';
    const isUpdate = event.type === 'update';

    const taskTitle = data.title || data.task_type || 'משימה';
    const apartmentPart = data.apartment_number ? ` – דירה ${data.apartment_number}` : '';

    const allUsers = await base44.asServiceRole.entities.AppUser.list();

    const getUserName = (usernameOrEmail) => {
      if (!usernameOrEmail) return null;
      const u = allUsers.find(x => x.username === usernameOrEmail || x.email === usernameOrEmail);
      if (!u) return usernameOrEmail;
      return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username;
    };

    const notifications = [];

    // ─── 1. הקצאה חדשה ───────────────────────────────
    if (data.assigned_to) {
      const assigneeChanged = isUpdate && old_data?.assigned_to !== data.assigned_to;
      if (isCreate || assigneeChanged) {
        const assignerName = getUserName(data.assigned_by) || 'מנהל';
        const message = isCreate
          ? `הוקצתה לך משימה חדשה על ידי ${assignerName}: "${taskTitle}"${apartmentPart}`
          : `המשימה "${taskTitle}"${apartmentPart} הועברה אליך על ידי ${assignerName}`;

        notifications.push({
          user_username: data.assigned_to,
          type: 'task_pro_assigned',
          message,
          task_pro_id: event.entity_id,
          task_type: data.task_type,
          assigner_name: assignerName,
          is_read: false,
        });
      }
    }

    // ─── 2. סטטוס שונה ל"הושלמה" ────────────────────
    if (isUpdate && data.status === 'הושלמה' && old_data?.status !== 'הושלמה') {
      // הודע למי שהקצה
      if (data.assigned_by && data.assigned_by !== data.assigned_to) {
        const assigneeName = getUserName(data.assigned_to) || 'עובד';
        notifications.push({
          user_username: data.assigned_by,
          type: 'task_pro_completed',
          message: `המשימה "${taskTitle}"${apartmentPart} הושלמה על ידי ${assigneeName} ✅`,
          task_pro_id: event.entity_id,
          task_type: data.task_type,
          is_read: false,
        });
      }
      // הודע גם למשויך עצמו (אישור השלמה)
      if (data.assigned_to) {
        notifications.push({
          user_username: data.assigned_to,
          type: 'task_pro_completed',
          message: `המשימה "${taskTitle}"${apartmentPart} סומנה כהושלמה ✅`,
          task_pro_id: event.entity_id,
          task_type: data.task_type,
          is_read: false,
        });
      }
    }

    // שמור את כל ההתראות
    await Promise.all(
      notifications.map(n => base44.asServiceRole.entities.Notification.create(n))
    );

    return Response.json({ ok: true, created: notifications.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});