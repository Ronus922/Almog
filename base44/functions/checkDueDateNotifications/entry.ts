import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    let totalCreated = 0;

    // Helper: צור התראה עם dedupe
    const createNotif = async ({ user_username, type, title, message, source_entity_type, source_entity_id, source_module, action_url, extra = {} }) => {
      const dedupeKey = `${type}:${source_entity_id}:${user_username}:${todayStr}`;
      const existing = await base44.asServiceRole.entities.Notification.filter({
        user_username,
        dedupe_key: dedupeKey,
      });
      if (existing && existing.length > 0) return false;

      await base44.asServiceRole.entities.Notification.create({
        user_username,
        type,
        title,
        message,
        source_module,
        source_entity_type,
        source_entity_id,
        action_url,
        priority: type.includes('overdue') ? 'high' : 'normal',
        dedupe_key: dedupeKey,
        is_read: false,
        ...extra,
      });
      return true;
    };

    // ── 1. TaskPro ──────────────────────────────────────────────────
    const proTasks = await base44.asServiceRole.entities.TaskPro.list('-created_date', 500);
    const activePro = proTasks.filter(t =>
      !t.is_archived &&
      ['פתוחה', 'בטיפול', 'ממתינה'].includes(t.status) &&
      t.due_at &&
      t.assigned_to
    );

    for (const task of activePro) {
      const dueDateStr = task.due_at.slice(0, 10);
      const isToday = dueDateStr === todayStr;
      const isTomorrow = dueDateStr === tomorrowStr;
      const isOverdue = dueDateStr < todayStr;

      if (!isToday && !isTomorrow && !isOverdue) continue;

      const type = isToday ? 'task_pro_due_today' : isTomorrow ? 'task_pro_due_tomorrow' : 'task_pro_due_overdue';
      const label = task.title || task.task_type || 'משימה';
      const apt = task.apartment_number ? ` – דירה ${task.apartment_number}` : '';
      const title = isToday ? 'משימה מיועדת להיום' : isTomorrow ? 'משימה מיועדת למחר' : 'משימה באיחור!';
      const message = isToday
        ? `⚠️ המשימה "${label}"${apt} מיועדת להיום`
        : isTomorrow
        ? `📅 המשימה "${label}"${apt} מיועדת למחר`
        : `🔴 המשימה "${label}"${apt} באיחור`;

      const recipients = new Set([task.assigned_to]);
      if (task.assigned_by && task.assigned_by !== task.assigned_to) recipients.add(task.assigned_by);

      for (const username of recipients) {
        const created = await createNotif({
          user_username: username,
          type, title, message,
          source_module: 'tasks',
          source_entity_type: 'TaskPro',
          source_entity_id: task.id,
          action_url: '/TasksPro',
          extra: { task_pro_id: task.id },
        });
        if (created) totalCreated++;
      }
    }

    // ── 2. Task (ישנות) ────────────────────────────────────────────
    const oldTasks = await base44.asServiceRole.entities.Task.list('-created_date', 300);
    const activeOld = oldTasks.filter(t =>
      ['פתוחה', 'בטיפול'].includes(t.status) &&
      t.due_date &&
      t.assigned_to
    );

    for (const task of activeOld) {
      const dueDateStr = task.due_date.slice(0, 10);
      const isToday = dueDateStr === todayStr;
      const isTomorrow = dueDateStr === tomorrowStr;
      const isOverdue = dueDateStr < todayStr;

      if (!isToday && !isTomorrow && !isOverdue) continue;

      const type = isToday ? 'task_due_today' : isTomorrow ? 'task_due_tomorrow' : 'task_due_overdue';
      const label = task.task_type || 'משימה';
      const apt = task.owner_name ? ` – ${task.owner_name}` : '';
      const title = isToday ? 'משימה מיועדת להיום' : isTomorrow ? 'משימה מיועדת למחר' : 'משימה באיחור!';
      const message = isToday
        ? `⚠️ המשימה "${label}"${apt} מיועדת להיום`
        : isTomorrow
        ? `📅 המשימה "${label}"${apt} מיועדת למחר`
        : `🔴 המשימה "${label}"${apt} באיחור`;

      const created = await createNotif({
        user_username: task.assigned_to,
        type, title, message,
        source_module: 'tasks',
        source_entity_type: 'Task',
        source_entity_id: task.id,
        action_url: '/Tasks',
        extra: { task_id: task.id },
      });
      if (created) totalCreated++;
    }

    // ── 3. Appointment ─────────────────────────────────────────────
    const appointments = await base44.asServiceRole.entities.Appointment.list('-date', 200);
    const activeAppt = appointments.filter(a => {
      const d = (a.date || a.event_date || '').slice(0, 10);
      return d === todayStr || d === tomorrowStr;
    });

    const allUsers = await base44.asServiceRole.entities.AppUser.list();
    const userMap = {};
    allUsers.forEach(u => { if (u.username) userMap[u.id] = u.username; });

    for (const appt of activeAppt) {
      const ds = (appt.date || appt.event_date || '').slice(0, 10);
      const isToday = ds === todayStr;
      const type = isToday ? 'appointment_due_today' : 'appointment_due_tomorrow';
      const label = appt.title || 'פגישה';
      const title = isToday ? 'הפגישה שלך להיום' : 'הפגישה שלך למחר';
      const message = isToday
        ? `📅 הפגישה "${label}" מתקיימת היום`
        : `📅 הפגישה "${label}" מתקיימת מחר`;

      const attendees = appt.attendees_users || [];
      const recipients = new Set();
      for (const att of attendees) {
        const id = att?.id ?? att;
        const username = userMap[String(id)];
        if (username) recipients.add(username);
      }
      if (recipients.size === 0) continue;

      for (const username of recipients) {
        const created = await createNotif({
          user_username: username,
          type, title, message,
          source_module: 'calendar',
          source_entity_type: 'Appointment',
          source_entity_id: appt.id,
          action_url: '/Calendar',
        });
        if (created) totalCreated++;
      }
    }

    return Response.json({ ok: true, totalCreated, todayStr, tomorrowStr });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});