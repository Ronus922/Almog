import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// מיפוי ימי שבוע
const WEEKDAY_MAP = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
const REVERSE_WEEKDAY_MAP = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

// חישוב ימים בחודש — מטפל ב-overflow
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// קבל את יום היעד בחודש — עם clamp לסוף החודש
function clampDayToMonth(year, month, targetDay) {
  const maxDay = daysInMonth(year, month);
  return Math.min(targetDay, maxDay);
}

// חשב את התאריך הבא לפי הכלל — החזר Date או null אם הסתיים
function computeNextDate(rule, fromDate) {
  const interval = rule.interval_value || 1;
  const freq = rule.frequency;

  if (freq === 'daily') {
    const next = new Date(fromDate);
    next.setDate(next.getDate() + interval);
    return next;
  }

  if (freq === 'weekly') {
    const selectedDays = rule.days_of_week_json ? JSON.parse(rule.days_of_week_json) : [];
    if (selectedDays.length === 0) {
      // ברירת מחדל: אותו יום בשבוע
      const next = new Date(fromDate);
      next.setDate(next.getDate() + 7 * interval);
      return next;
    }

    // מצא את היום הבא הרלוונטי בשבוע
    const dayIndices = selectedDays.map(d => REVERSE_WEEKDAY_MAP[d]).sort((a, b) => a - b);
    const currentDayOfWeek = fromDate.getDay();

    // חפש יום אחרי הנוכחי באותו שבוע
    const nextInWeek = dayIndices.find(d => d > currentDayOfWeek);
    if (nextInWeek !== undefined) {
      const next = new Date(fromDate);
      next.setDate(next.getDate() + (nextInWeek - currentDayOfWeek));
      return next;
    }

    // לך לשבוע הבא (interval שבועות) ולדי הראשון ברשימה
    const daysToNextWeek = 7 * interval - currentDayOfWeek + dayIndices[0];
    const next = new Date(fromDate);
    next.setDate(next.getDate() + daysToNextWeek);
    return next;
  }

  if (freq === 'monthly') {
    const targetDay = rule.day_of_month || 1;
    const next = new Date(fromDate);
    next.setMonth(next.getMonth() + interval);
    const clampedDay = clampDayToMonth(next.getFullYear(), next.getMonth(), targetDay);
    next.setDate(clampedDay);
    return next;
  }

  if (freq === 'yearly') {
    const targetMonth = (rule.month_of_year || 1) - 1; // 0-based
    const targetDay = rule.day_of_month || 1;
    const next = new Date(fromDate);
    next.setFullYear(next.getFullYear() + interval);
    next.setMonth(targetMonth);
    const clampedDay = clampDayToMonth(next.getFullYear(), targetMonth, targetDay);
    next.setDate(clampedDay);
    return next;
  }

  return null;
}

// פורמט תאריך ל-YYYY-MM-DD
function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// בדוק האם כלל הסתיים
function isRuleEnded(rule, instanceIndex) {
  if (rule.ends_mode === 'after_count' && rule.max_occurrences && instanceIndex > rule.max_occurrences) {
    return true;
  }
  if (rule.ends_mode === 'on_date' && rule.ends_at) {
    const endDate = new Date(rule.ends_at);
    if (new Date() > endDate) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // אימות — מנהל או system (scheduled automation)
    let isSystem = false;
    try {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        // אם לא admin, בדוק שזה קריאה מה-automation (ללא user token)
        isSystem = false;
      } else {
        isSystem = true;
      }
    } catch {
      // אוטומציה רצה ללא user token — OK
      isSystem = true;
    }

    // השתמש ב-serviceRole לגישה מלאה
    const svc = base44.asServiceRole;

    // קבל כל הכללים הפעילים שלא מושהים
    const allRules = await svc.entities.TaskRecurrenceRule.list();
    const activeRules = allRules.filter(r => r.is_active === true && r.is_paused !== true);

    const now = new Date();
    let totalGenerated = 0;
    const results = [];

    for (const rule of activeRules) {
      try {
        // בדוק אם הגיע הזמן לייצר
        if (!rule.next_run_at) continue;
        const nextRun = new Date(rule.next_run_at);
        if (nextRun > now) continue; // עדיין לא הגיע הזמן

        const nextInstanceIndex = (rule.generated_count || 0) + 1;

        // בדוק האם הכלל הסתיים
        if (isRuleEnded(rule, nextInstanceIndex)) {
          await svc.entities.TaskRecurrenceRule.update(rule.id, { is_active: false });
          results.push({ rule_id: rule.id, status: 'ended' });
          continue;
        }

        // DUPLICATE PREVENTION — בדוק לפי recurrence_rule_id + instance_index
        const existingTasks = await svc.entities.Task.filter({ recurrence_rule_id: rule.id });
        
        // בדוק אם כבר קיים מופע עם אותו index
        const duplicateByIndex = existingTasks.find(t => t.recurrence_instance_index === nextInstanceIndex);
        if (duplicateByIndex) {
          // קיים כבר — דלג ועדכן next_run_at
          const nextDate = computeNextDate(rule, nextRun);
          if (nextDate) {
            await svc.entities.TaskRecurrenceRule.update(rule.id, {
              next_run_at: nextDate.toISOString(),
              last_generated_at: now.toISOString()
            });
          }
          results.push({ rule_id: rule.id, status: 'skipped_duplicate', instance_index: nextInstanceIndex });
          continue;
        }

        // עבור on_completion — בדוק שאין משימה פתוחה
        if (rule.generate_mode === 'on_completion') {
          const openTasks = existingTasks.filter(t => 
            t.status !== 'הושלמה' && t.status !== 'בוטלה' && t.status !== 'לא השתנה'
          );
          if (openTasks.length > 0) {
            results.push({ rule_id: rule.id, status: 'skipped_open_exists' });
            continue;
          }
        }

        // בדוק duplicate לפי תאריך יעד (לfixed_schedule / on_due_date)
        const plannedDueDate = formatDate(nextRun);
        if (rule.generate_mode !== 'on_completion') {
          const duplicateByDate = existingTasks.find(t => t.due_date === plannedDueDate && t.recurrence_rule_id === rule.id);
          if (duplicateByDate) {
            const nextDate = computeNextDate(rule, nextRun);
            if (nextDate) {
              await svc.entities.TaskRecurrenceRule.update(rule.id, {
                next_run_at: nextDate.toISOString()
              });
            }
            results.push({ rule_id: rule.id, status: 'skipped_date_duplicate', date: plannedDueDate });
            continue;
          }
        }

        // קבל template task אם קיים
        let templateTask = null;
        if (rule.template_task_id) {
          try {
            templateTask = await svc.entities.Task.get(rule.template_task_id);
          } catch { /* ignore */ }
        }

        // צור את המשימה החדשה — עדיפות: כלל > template > ברירת מחדל
        const newTask = {
          debtor_record_id: rule.debtor_record_id || templateTask?.debtor_record_id || null,
          apartment_number: rule.apartment_number || templateTask?.apartment_number || null,
          owner_name: rule.owner_name || templateTask?.owner_name || null,
          task_type: rule.default_task_type || templateTask?.task_type || 'אחר',
          description: rule.default_description || templateTask?.description || `משימה מחזורית: ${rule.title}`,
          due_date: plannedDueDate,
          status: rule.default_status || 'פתוחה',
          priority: rule.default_priority || templateTask?.priority || 'בינונית',
          assigned_to: rule.assigned_to || templateTask?.assigned_to || null,
          assigned_to_name: rule.assigned_to_name || templateTask?.assigned_to_name || null,
          assigned_by: rule.created_by || 'system',
          is_recurring_instance: true,
          recurrence_rule_id: rule.id,
          recurrence_instance_index: nextInstanceIndex,
          recurrence_parent_task_id: rule.template_task_id || null
        };

        const generatedTask = await svc.entities.Task.create(newTask);

        // חשב next_run_at הבא
        const nextDate = computeNextDate(rule, nextRun);

        // עדכן את הכלל
        const ruleUpdate = {
          generated_count: nextInstanceIndex,
          last_generated_at: now.toISOString()
        };
        if (nextDate && !isRuleEnded(rule, nextInstanceIndex + 1)) {
          ruleUpdate.next_run_at = nextDate.toISOString();
        } else {
          ruleUpdate.is_active = false;
        }
        await svc.entities.TaskRecurrenceRule.update(rule.id, ruleUpdate);

        // צור activity log
        try {
          await svc.entities.TaskActivity.create({
            task_id: generatedTask.id,
            activity_type: 'recurring_generated',
            actor_username: 'system',
            actor_name: 'מערכת',
            payload_json: JSON.stringify({
              recurrence_rule_id: rule.id,
              rule_title: rule.title,
              instance_index: nextInstanceIndex,
              due_date: plannedDueDate
            })
          });
        } catch { /* ignore activity errors */ }

        // שלח התראה לנמען אם קיים
        if (newTask.assigned_to) {
          try {
            await svc.entities.Notification.create({
              user_username: newTask.assigned_to,
              type: 'task_assigned',
              message: `נוצרה משימה מחזורית חדשה: ${newTask.task_type}${newTask.apartment_number ? ` – דירה ${newTask.apartment_number}` : ''}`,
              task_id: generatedTask.id,
              task_type: newTask.task_type,
              assigner_name: 'מערכת (מחזוריות)',
              is_read: false
            });
          } catch { /* ignore notification errors */ }
        }

        totalGenerated++;
        results.push({ rule_id: rule.id, task_id: generatedTask.id, status: 'success', instance_index: nextInstanceIndex });

      } catch (err) {
        results.push({ rule_id: rule.id, status: 'error', message: err.message });
      }
    }

    return Response.json({
      success: true,
      generated_tasks_count: totalGenerated,
      rules_processed: activeRules.length,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});