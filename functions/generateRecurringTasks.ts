import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { addDays, addWeeks, addMonths, addYears, format, parseISO, isAfter, isBefore, getDay } from 'npm:date-fns@3.6.0';

const WEEKDAY_MAP = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
};

const REVERSE_WEEKDAY_MAP = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

async function calculateNextOccurrences(rule, count = 1) {
  const occurrences = [];
  let currentDate = parseISO(rule.next_run_at);
  const startDate = parseISO(rule.starts_at);
  const endDate = rule.ends_at ? parseISO(rule.ends_at) : null;
  
  let generatedCount = rule.generated_count || 0;
  const maxOccurrences = rule.max_occurrences;
  const interval = rule.interval_value || 1;

  while (occurrences.length < count) {
    // בדוק קצוות של סיום
    if (rule.ends_mode === 'on_date' && endDate && isAfter(currentDate, endDate)) {
      break;
    }
    if (rule.ends_mode === 'after_count' && generatedCount >= maxOccurrences) {
      break;
    }

    let isValidOccurrence = false;

    if (rule.frequency === 'daily') {
      isValidOccurrence = true;
      currentDate = addDays(currentDate, interval);
    } else if (rule.frequency === 'weekly') {
      const selectedDays = rule.days_of_week_json ? JSON.parse(rule.days_of_week_json) : [];
      const currentDayName = WEEKDAY_MAP[getDay(currentDate)];
      
      if (selectedDays.includes(currentDayName)) {
        isValidOccurrence = true;
      }
      currentDate = addDays(currentDate, 1);
    } else if (rule.frequency === 'monthly') {
      const targetDay = rule.day_of_month || 1;
      const dateMonth = currentDate.getMonth();
      const dateYear = currentDate.getFullYear();
      
      // בדוק אם התאריך הנוכחי בחודש הנכון עם ה-interval
      let targetDate = new Date(dateYear, dateMonth, targetDay);
      
      if (currentDate.getDate() === targetDate.getDate() || 
          (targetDay > 28 && currentDate.getDate() > targetDay && isAfter(currentDate, targetDate))) {
        isValidOccurrence = true;
      }
      
      currentDate = addMonths(currentDate, interval);
    } else if (rule.frequency === 'yearly') {
      const targetMonth = rule.month_of_year || 1;
      const targetDay = rule.day_of_month || 1;
      const dateYear = currentDate.getFullYear();
      
      let targetDate = new Date(dateYear, targetMonth - 1, targetDay);
      
      if (currentDate.getMonth() === targetMonth - 1 && currentDate.getDate() === targetDay) {
        isValidOccurrence = true;
      }
      
      currentDate = addYears(currentDate, interval);
    }

    if (isValidOccurrence) {
      occurrences.push(currentDate);
      generatedCount++;
    }
  }

  return occurrences;
}

async function generateTaskInstance(base44, rule, dueDate, instanceIndex) {
  const templateTask = rule.template_task_id 
    ? await base44.entities.Task.get(rule.template_task_id).catch(() => null)
    : null;

  const newTask = {
    debtor_record_id: rule.debtor_record_id || templateTask?.debtor_record_id,
    apartment_number: rule.apartment_number || templateTask?.apartment_number,
    owner_name: rule.owner_name || templateTask?.owner_name,
    task_type: rule.default_task_type || templateTask?.task_type || 'אחר',
    description: rule.default_description || templateTask?.description,
    due_date: format(dueDate, 'yyyy-MM-dd'),
    status: rule.default_status || 'פתוחה',
    priority: rule.default_priority || 'בינונית',
    assigned_to: rule.assigned_to || templateTask?.assigned_to,
    assigned_to_name: rule.assigned_to_name || templateTask?.assigned_to_name,
    assigned_by: rule.created_by,
    recurrence_rule_id: rule.id,
    recurrence_instance_index: instanceIndex,
    is_recurring_instance: true
  };

  return await base44.entities.Task.create(newTask);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403 });
    }

    // קבל כל הכללים הפעילים שלא מושהים
    const rules = await base44.entities.TaskRecurrenceRule.filter({ 
      is_active: true,
      is_paused: false
    });

    const now = new Date();
    let generatedCount = 0;
    const results = [];

    for (const rule of rules) {
      // בדוק אם צריך לייצר משימה
      const nextRun = parseISO(rule.next_run_at);
      
      if (!isBefore(nextRun, now) && !(isBefore(nextRun, now) || nextRun.getTime() === now.getTime())) {
        continue; // עדיין לא הגיע הזמן
      }

      // עבור on_completion, בדוק שאין משימה פתוחה
      if (rule.generate_mode === 'on_completion') {
        const openTasks = await base44.entities.Task.filter({
          recurrence_rule_id: rule.id,
          status: { $nin: ['הושלמה', 'בוטלה'] }
        }).catch(() => []);
        
        if (openTasks.length > 0) {
          continue; // יש משימה פתוחה, לא לייצר עוד
        }
      }

      // חשב הופעות
      const occurrences = await calculateNextOccurrences(rule, 1);
      
      if (occurrences.length === 0) {
        // הסתיים הכלל
        await base44.entities.TaskRecurrenceRule.update(rule.id, {
          is_active: false,
          updated_date: new Date().toISOString()
        });
        continue;
      }

      // ייצור משימה
      const dueDate = occurrences[0];
      try {
        const generatedTask = await generateTaskInstance(base44, rule, dueDate, (rule.generated_count || 0) + 1);
        
        // עדכן הכלל
        const nextOccurrences = await calculateNextOccurrences(rule, 2);
        const nextRun = nextOccurrences.length > 1 ? nextOccurrences[1] : nextOccurrences[0];
        
        await base44.entities.TaskRecurrenceRule.update(rule.id, {
          generated_count: (rule.generated_count || 0) + 1,
          next_run_at: nextRun.toISOString(),
          last_generated_at: new Date().toISOString(),
          updated_date: new Date().toISOString()
        });

        // צור activity
        await base44.entities.TaskActivity.create({
          task_id: generatedTask.id,
          activity_type: 'recurring_generated',
          actor_username: 'system',
          actor_name: 'מערכת',
          payload_json: JSON.stringify({
            recurrence_rule_id: rule.id,
            instance_index: (rule.generated_count || 0) + 1
          })
        });

        generatedCount++;
        results.push({ rule_id: rule.id, task_id: generatedTask.id, status: 'success' });
      } catch (err) {
        results.push({ rule_id: rule.id, status: 'error', message: err.message });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      generated_tasks_count: generatedCount,
      results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to generate recurring tasks:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});