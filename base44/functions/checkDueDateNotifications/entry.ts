import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Job: רץ כל יום בשעה 07:00 (ישראל)
// בודק TaskPro ו-Task (ישנות) ופגישות (Appointment)
// יוצר התראות due_today / due_tomorrow
// מונע כפילויות: בודק לפי today-date + user + task/appointment id

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    let totalCreated = 0;

    // ── 1. TaskPro — due_at (datetime) ──────────────────────────
    const proTasks = await base44.asServiceRole.entities.TaskPro.list('-created_date', 500);
    const activePro = proTasks.filter(t =>
      !t.is_archived &&
      ['פתוחה', 'בטיפול', 'ממתינה'].includes(t.status) &&
      t.due_at &&
      t.assigned_to
    );

    // טען התראות קיימות של היום מסוג pro due
    const existingProNotifs = await base44.asServiceRole.entities.Notification.filter({
      type: ['task_pro_due_today', 'task_pro_due_tomorrow']
    });
    const existingProToday = new Set(
      existingProNotifs
        .filter(n => n.created_date?.startsWith(todayStr))
        .map(n => `${n.user_username}__${n.task_pro_id}__${n.type}`)
    );

    for (const task of activePro) {
      const dueDateStr = task.due_at.slice(0, 10);
      if (dueDateStr !== todayStr && dueDateStr !== tomorrowStr) continue;

      const isToday = dueDateStr === todayStr;
      const type = isToday ? 'task_pro_due_today' : 'task_pro_due_tomorrow';
      const label = task.title || task.task_type || 'משימה';
      const apt = task.apartment_number ? ` – דירה ${task.apartment_number}` : '';
      const message = isToday
        ? `⚠️ תזכורת: המשימה "${label}"${apt} מיועדת להיום`
        : `📅 תזכורת: המשימה "${label}"${apt} מיועדת למחר`;

      const recipients = new Set([task.assigned_to]);

      // גם assigned_by אם שונה
      if (task.assigned_by && task.assigned_by !== task.assigned_to) {
        recipients.add(task.assigned_by);
      }

      for (const username of recipients) {
        const key = `${username}__${task.id}__${type}`;
        if (existingProToday.has(key)) continue;
        await base44.asServiceRole.entities.Notification.create({
          user_username: username,
          type,
          message,
          task_pro_id: task.id,
          task_type: task.task_type,
          is_read: false,
        });
        existingProToday.add(key);
        totalCreated++;
      }
    }

    // ── 2. Task (ישנות) — due_date (date only) ──────────────────
    const oldTasks = await base44.asServiceRole.entities.Task.list('-created_date', 300);
    const activeOld = oldTasks.filter(t =>
      ['פתוחה', 'בטיפול'].includes(t.status) &&
      t.due_date &&
      t.assigned_to
    );

    const existingOldNotifs = await base44.asServiceRole.entities.Notification.filter({
      type: ['task_due_today', 'task_due_tomorrow']
    });
    const existingOldToday = new Set(
      existingOldNotifs
        .filter(n => n.created_date?.startsWith(todayStr))
        .map(n => `${n.user_username}__${n.task_id}__${n.type}`)
    );

    for (const task of activeOld) {
      const dueDateStr = task.due_date.slice(0, 10);
      if (dueDateStr !== todayStr && dueDateStr !== tomorrowStr) continue;

      const isToday = dueDateStr === todayStr;
      const type = isToday ? 'task_due_today' : 'task_due_tomorrow';
      const label = task.task_type || 'משימה';
      const apt = task.owner_name ? ` – ${task.owner_name}` : '';
      const message = isToday
        ? `⚠️ תזכורת: המשימה "${label}"${apt} מיועדת להיום`
        : `📅 תזכורת: המשימה "${label}"${apt} מיועדת למחר`;

      const key = `${task.assigned_to}__${task.id}__${type}`;
      if (existingOldToday.has(key)) continue;
      await base44.asServiceRole.entities.Notification.create({
        user_username: task.assigned_to,
        type,
        message,
        task_id: task.id,
        task_type: task.task_type,
        is_read: false,
      });
      existingOldToday.add(key);
      totalCreated++;
    }

    // ── 3. Appointment — תזכורות (date field) ───────────────────
    const appointments = await base44.asServiceRole.entities.Appointment.list('-date', 200);
    const activeAppt = appointments.filter(a => {
      const d = a.date || a.event_date;
      if (!d) return false;
      const ds = d.slice(0, 10);
      return ds === todayStr || ds === tomorrowStr;
    });

    const existingApptNotifs = await base44.asServiceRole.entities.Notification.filter({
      type: ['appointment_due_today', 'appointment_due_tomorrow']
    });
    const existingApptToday = new Set(
      existingApptNotifs
        .filter(n => n.created_date?.startsWith(todayStr))
        .map(n => `${n.user_username}__${n.task_id}__${n.type}`)
    );

    // טען משתמשים פעם אחת
    const allUsers = await base44.asServiceRole.entities.AppUser.list();
    const userMap = {};
    allUsers.forEach(u => { if (u.username) userMap[u.id] = u.username; });

    for (const appt of activeAppt) {
      const dateField = appt.date || appt.event_date || '';
      const ds = dateField.slice(0, 10);
      const isToday = ds === todayStr;
      const type = isToday ? 'appointment_due_today' : 'appointment_due_tomorrow';
      const label = appt.title || 'פגישה';
      const message = isToday
        ? `📅 תזכורת: הפגישה "${label}" מתקיימת היום`
        : `📅 תזכורת: הפגישה "${label}" מתקיימת מחר`;

      // אסוף נמענים מ-attendees_users
      const attendees = appt.attendees_users || [];
      const recipients = new Set();
      for (const att of attendees) {
        const id = att?.id ?? att;
        const username = userMap[String(id)];
        if (username) recipients.add(username);
      }
      if (recipients.size === 0) continue;

      for (const username of recipients) {
        const key = `${username}__${appt.id}__${type}`;
        if (existingApptToday.has(key)) continue;
        await base44.asServiceRole.entities.Notification.create({
          user_username: username,
          type,
          message,
          task_id: appt.id, // שדה גנרי לשיוך
          task_type: 'פגישה',
          is_read: false,
        });
        existingApptToday.add(key);
        totalCreated++;
      }
    }

    return Response.json({ ok: true, totalCreated, todayStr, tomorrowStr });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});