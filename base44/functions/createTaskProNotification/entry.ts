import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    if (!data) return Response.json({ ok: true, skip: 'no data' });

    const isCreate = event.type === 'create';
    const isUpdate = event.type === 'update';
    const taskId = event.entity_id;

    const taskTitle = data.title || data.task_type || 'משימה';
    const apartmentPart = data.apartment_number ? ` – דירה ${data.apartment_number}` : '';

    const allUsers = await base44.asServiceRole.entities.AppUser.list();
    const getUserName = (id) => {
      if (!id) return null;
      const u = allUsers.find(x => x.username === id || x.email === id);
      if (!u) return id;
      return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username;
    };

    const createNotif = async ({ user_username, type, title, message, priority = 'normal' }) => {
      if (!user_username) return;
      const dedupeKey = `${type}:${taskId}:${user_username}`;
      const existing = await base44.asServiceRole.entities.Notification.filter({
        user_username,
        dedupe_key: dedupeKey,
      });
      if (existing && existing.length > 0) return;

      await base44.asServiceRole.entities.Notification.create({
        user_username,
        type,
        title,
        message,
        source_module: 'tasks',
        source_entity_type: 'TaskPro',
        source_entity_id: taskId,
        action_url: '/TasksPro',
        priority,
        dedupe_key: dedupeKey,
        task_pro_id: taskId,
        is_read: false,
      });
    };

    // ─── 1. הקצאה חדשה / העברה ──────────────────────────────────
    if (data.assigned_to) {
      const assigneeChanged = isUpdate && old_data?.assigned_to !== data.assigned_to;
      if (isCreate || assigneeChanged) {
        const assignerName = getUserName(data.assigned_by) || 'מנהל';
        const type = isCreate ? 'task_pro_assigned' : 'task_pro_reassigned';
        const title = isCreate ? 'הוקצתה לך משימה חדשה' : 'משימה הועברה אליך';
        const message = isCreate
          ? `הוקצתה לך משימה חדשה על ידי ${assignerName}: "${taskTitle}"${apartmentPart}`
          : `המשימה "${taskTitle}"${apartmentPart} הועברה אליך על ידי ${assignerName}`;

        await createNotif({ user_username: data.assigned_to, type, title, message });
      }
    }

    // ─── 2. הושלמה ────────────────────────────────────────────────
    if (isUpdate && data.status === 'הושלמה' && old_data?.status !== 'הושלמה') {
      const assigneeName = getUserName(data.assigned_to) || 'עובד';

      if (data.assigned_by && data.assigned_by !== data.assigned_to) {
        await createNotif({
          user_username: data.assigned_by,
          type: 'task_pro_completed',
          title: 'משימה הושלמה',
          message: `המשימה "${taskTitle}"${apartmentPart} הושלמה על ידי ${assigneeName} ✅`,
        });
      }

      if (data.assigned_to) {
        await createNotif({
          user_username: data.assigned_to,
          type: 'task_pro_completed',
          title: 'משימה הושלמה',
          message: `המשימה "${taskTitle}"${apartmentPart} סומנה כהושלמה ✅`,
        });
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});