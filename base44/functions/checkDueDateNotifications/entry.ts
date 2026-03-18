import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in24hStr = in24h.toISOString();

    // ── Task ישנה (due_date = date only) ──────────────────────
    const oldTasks = await base44.asServiceRole.entities.Task.filter({ status: ['פתוחה', 'בטיפול'] });
    const tomorrowStr = in24h.toISOString().split('T')[0];

    const oldDueSoon = oldTasks.filter(t =>
      t.assigned_to && t.due_date && t.due_date >= todayStr && t.due_date <= tomorrowStr
    );

    const existingOld = await base44.asServiceRole.entities.Notification.filter({ type: 'task_due_soon' });
    const existingOldKeys = new Set(
      existingOld
        .filter(n => n.created_date?.startsWith(todayStr))
        .map(n => `${n.user_username}_${n.task_id}`)
    );

    let created = 0;
    for (const task of oldDueSoon) {
      const key = `${task.assigned_to}_${task.id}`;
      if (existingOldKeys.has(key)) continue;
      const isToday = task.due_date === todayStr;
      const label = task.task_type || 'משימה';
      const apt = task.owner_name ? ` – ${task.owner_name}` : '';
      await base44.asServiceRole.entities.Notification.create({
        user_username: task.assigned_to,
        type: 'task_due_soon',
        message: isToday ? `⚠️ המשימה "${label}${apt}" מגיעה לסיום היום!` : `📅 המשימה "${label}${apt}" מגיעה לסיום מחר`,
        task_id: task.id,
        task_type: task.task_type,
        is_read: false,
      });
      created++;
    }

    // ── TaskPro (due_at = datetime) ────────────────────────────
    const proTasks = await base44.asServiceRole.entities.TaskPro.filter({ status: ['פתוחה', 'בטיפול'] });

    const proDueSoon = proTasks.filter(t =>
      t.assigned_to && t.due_at && !t.is_archived &&
      new Date(t.due_at) >= now && new Date(t.due_at) <= in24h
    );

    const existingPro = await base44.asServiceRole.entities.Notification.filter({ type: 'task_pro_due_soon' });
    const existingProKeys = new Set(
      existingPro
        .filter(n => n.created_date?.startsWith(todayStr))
        .map(n => `${n.user_username}_${n.task_pro_id}`)
    );

    for (const task of proDueSoon) {
      const key = `${task.assigned_to}_${task.id}`;
      if (existingProKeys.has(key)) continue;
      const label = task.title || task.task_type || 'משימה';
      const apt = task.apartment_number ? ` – דירה ${task.apartment_number}` : '';
      const dueDate = new Date(task.due_at);
      const isToday = dueDate.toISOString().startsWith(todayStr);
      await base44.asServiceRole.entities.Notification.create({
        user_username: task.assigned_to,
        type: 'task_pro_due_soon',
        message: isToday
          ? `⚠️ המשימה "${label}"${apt} מגיעה לסיום היום!`
          : `📅 המשימה "${label}"${apt} מגיעה לסיום תוך 24 שעות`,
        task_pro_id: task.id,
        task_type: task.task_type,
        is_read: false,
      });
      created++;
    }

    return Response.json({ ok: true, created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});