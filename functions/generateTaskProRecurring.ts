import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function clamp(day, year, month) {
  const max = new Date(year, month, 0).getDate();
  return Math.min(day, max);
}

function calcNextDate(rule, fromDate) {
  const d = new Date(fromDate);
  const iv = rule.interval_value || 1;

  if (rule.frequency === "daily") {
    d.setDate(d.getDate() + iv);
  } else if (rule.frequency === "weekly") {
    let days = [];
    try { days = JSON.parse(rule.days_of_week_json || "[]"); } catch {}
    const dayMap = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };
    const nums = days.map((d) => dayMap[d]).filter((n) => n !== undefined);
    if (nums.length === 0) {
      d.setDate(d.getDate() + 7 * iv);
    } else {
      const cur = d.getDay();
      const next = nums.find((n) => n > cur) ?? (nums[0] + 7);
      const diff = next - cur;
      d.setDate(d.getDate() + diff);
    }
  } else if (rule.frequency === "monthly") {
    const targetDay = rule.day_of_month || d.getDate();
    d.setMonth(d.getMonth() + iv);
    d.setDate(clamp(targetDay, d.getFullYear(), d.getMonth() + 1));
  } else if (rule.frequency === "yearly") {
    const targetDay = rule.day_of_month || d.getDate();
    const targetMonth = rule.month_of_year ? rule.month_of_year - 1 : d.getMonth();
    d.setFullYear(d.getFullYear() + iv);
    d.setMonth(targetMonth);
    d.setDate(clamp(targetDay, d.getFullYear(), targetMonth + 1));
  }
  return d;
}

function isExpired(rule) {
  if (rule.ends_mode === "after_count" && rule.max_occurrences && rule.generated_count >= rule.max_occurrences) return true;
  if (rule.ends_mode === "on_date" && rule.ends_at && new Date() > new Date(rule.ends_at)) return true;
  return false;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const rules = await base44.asServiceRole.entities.TaskProRecurrenceRule.list();
  const now = new Date();
  const results = [];

  for (const rule of rules) {
    if (!rule.is_active || rule.is_paused) continue;
    if (isExpired(rule)) {
      await base44.asServiceRole.entities.TaskProRecurrenceRule.update(rule.id, { is_active: false });
      continue;
    }
    if (!rule.next_run_at || new Date(rule.next_run_at) > now) continue;

    // Check for duplicate
    const existing = await base44.asServiceRole.entities.TaskPro.filter({
      recurrence_rule_id: rule.id,
      recurrence_instance_index: (rule.generated_count || 0) + 1
    });
    if (existing.length > 0) {
      const nextDate = calcNextDate(rule, rule.next_run_at);
      await base44.asServiceRole.entities.TaskProRecurrenceRule.update(rule.id, {
        next_run_at: nextDate.toISOString(),
        last_generated_at: now.toISOString(),
      });
      continue;
    }

    // Create task
    const task = await base44.asServiceRole.entities.TaskPro.create({
      title: rule.template_task_title || rule.title,
      task_type: rule.template_task_type || "משימה כללית",
      status: "פתוחה",
      priority: rule.template_priority || "בינונית",
      description: rule.template_description || "",
      assigned_to: rule.assigned_to || "",
      assigned_to_name: rule.assigned_to_name || "",
      assigned_by: rule.created_by || "",
      assigned_by_name: rule.created_by_name || "",
      due_at: new Date(rule.next_run_at).toISOString(),
      debtor_record_id: rule.debtor_record_id || null,
      apartment_number: rule.apartment_number || "",
      owner_name: rule.owner_name || "",
      source: "recurring",
      recurrence_rule_id: rule.id,
      recurrence_instance_index: (rule.generated_count || 0) + 1,
      is_recurring_instance: true,
    });

    // Log activity
    await base44.asServiceRole.entities.TaskProActivity.create({
      task_id: task.id,
      activity_type: "recurring_generated",
      actor_username: "system",
      actor_name: "מערכת",
      payload_json: JSON.stringify({ rule_id: rule.id, instance: (rule.generated_count || 0) + 1 }),
    });

    const nextDate = calcNextDate(rule, rule.next_run_at);
    await base44.asServiceRole.entities.TaskProRecurrenceRule.update(rule.id, {
      generated_count: (rule.generated_count || 0) + 1,
      last_generated_at: now.toISOString(),
      next_run_at: nextDate.toISOString(),
    });

    results.push({ rule_id: rule.id, task_id: task.id });
  }

  return Response.json({ success: true, generated: results.length, results });
});