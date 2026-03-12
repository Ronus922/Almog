import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all open tasks with assigned_to
    const tasks = await base44.asServiceRole.entities.Task.filter({
      status: ['פתוחה', 'בטיפול'],
    });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    // Tasks due within 24 hours
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const dueSoonTasks = tasks.filter(t => {
      if (!t.assigned_to || !t.due_date) return false;
      return t.due_date >= todayStr && t.due_date <= tomorrowStr;
    });

    // Check existing notifications to avoid duplicates (created today)
    const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
      type: 'task_due_soon',
    });

    const existingKeys = new Set(
      existingNotifs
        .filter(n => n.created_date && n.created_date.startsWith(todayStr))
        .map(n => `${n.user_username}_${n.task_id}`)
    );

    let created = 0;
    for (const task of dueSoonTasks) {
      const key = `${task.assigned_to}_${task.id}`;
      if (existingKeys.has(key)) continue;

      const isToday = task.due_date === todayStr;
      const taskLabel = task.task_type || 'משימה';
      const ownerPart = task.owner_name ? ` – ${task.owner_name}` : '';
      const message = isToday
        ? `⚠️ המשימה "${taskLabel}${ownerPart}" מגיעה לסיום היום!`
        : `📅 המשימה "${taskLabel}${ownerPart}" מגיעה לסיום מחר`;

      await base44.asServiceRole.entities.Notification.create({
        user_username: task.assigned_to,
        type: 'task_due_soon',
        message,
        task_id: task.id,
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