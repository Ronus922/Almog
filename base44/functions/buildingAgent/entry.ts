import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { question, conversationHistory = [], currentUsername } = await req.json();
    if (!question) {
      return Response.json({ error: 'שאלה חסרה' }, { status: 400 });
    }

    // ===== שליפת נתונים — ללא auth (משתמשים פנימיים לא עוברים דרך Base44 auth) =====
    const [debtorRecords, contacts, allTasks, allAppointments] = await Promise.all([
      base44.asServiceRole.entities.DebtorRecord.list(),
      base44.asServiceRole.entities.Contact.list(),
      base44.asServiceRole.entities.Task.list(),
      base44.asServiceRole.entities.Appointment.list(),
    ]);

    // סינון משימות לפי המשתמש המחובר (אם נשלח)
    const userTasks = currentUsername
      ? allTasks.filter(t => t.assigned_to === currentUsername)
      : allTasks;

    // כל הפגישות (ללא סינון לפי user כי אין ID)
    const appointments = allAppointments;

    // תאריך היום
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // תחילת וסוף השבוע הנוכחי
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + (6 - dayOfWeek));
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // ===== הכן context מקוצר ומדויק =====

    // חייבים/דיירים — נתונים עיקריים
    const debtorsSummary = debtorRecords
      .filter(r => !r.isArchived)
      .map(r => ({
        דירה: r.apartmentNumber,
        בעלים: r.ownerName || '',
        סהכ_חוב: r.totalDebt || 0,
        דמי_ניהול: r.monthlyDebt || 0,
        מים_חמים: r.specialDebt || 0,
        חודשי_פיגור: r.monthsInArrears || 0,
        סטטוס_חוב: r.debt_status_auto || '',
        טלפון_ראשי: r.phonePrimary || r.phoneOwner || '',
        טלפון_בעלים: r.phoneOwner || '',
        טלפון_שוכר: r.phoneTenant || '',
      }));

    // אנשי קשר — דיירים
    const contactsSummary = contacts.map(c => ({
      דירה: c.apartment_number,
      שם_בעלים: c.owner_name || '',
      טלפון_בעלים: c.owner_phone || '',
      מייל_בעלים: c.owner_email || '',
      שם_שוכר: c.tenant_name || '',
      טלפון_שוכר: c.tenant_phone || '',
      מייל_שוכר: c.tenant_email || '',
      סוג_דייר: c.resident_type || 'owner',
    }));

    // משימות — לפי תאריכים (רק משימות של המשתמש המחובר)
    const todayTasks = userTasks.filter(t =>
      t.due_date === todayStr &&
      t.status !== 'הושלמה' &&
      t.status !== 'בוטלה' &&
      !t.is_archived
    ).map(t => ({
      סוג: t.task_type,
      תיאור: t.description || '',
      עדיפות: t.priority,
      סטטוס: t.status,
      דירה: t.apartment_number || '',
      בעלים: t.owner_name || '',
    }));

    const weekTasks = userTasks.filter(t =>
      t.due_date >= weekStartStr &&
      t.due_date <= weekEndStr &&
      t.status !== 'הושלמה' &&
      t.status !== 'בוטלה' &&
      !t.is_archived
    ).map(t => ({
      תאריך: t.due_date,
      סוג: t.task_type,
      תיאור: t.description || '',
      עדיפות: t.priority,
      סטטוס: t.status,
      דירה: t.apartment_number || '',
      בעלים: t.owner_name || '',
    }));

    const urgentTasks = userTasks.filter(t =>
      t.priority === 'גבוהה' &&
      t.status !== 'הושלמה' &&
      t.status !== 'בוטלה' &&
      !t.is_archived
    ).map(t => ({
      תאריך: t.due_date,
      סוג: t.task_type,
      תיאור: t.description || '',
      סטטוס: t.status,
      דירה: t.apartment_number || '',
    }));

    // פגישות — לפי תאריכים (רק פגישות שהמשתמש משתתף בהן)
    const todayAppointments = appointments.filter(a =>
      a.date === todayStr
    ).map(a => ({
      כותרת: a.title,
      סוג: a.appointment_type || '',
      תאריך: a.date,
      שעת_התחלה: a.start_time || '',
      שעת_סיום: a.end_time || '',
      מיקום: a.location || '',
      תיאור: a.description || '',
      משתתפים: (a.attendees_users || []).map(u => u?.name || u?.email || '').filter(Boolean).join(', '),
    }));

    const allFutureAppointments = appointments
      .filter(a => a.date >= todayStr)
      .map(a => ({
        כותרת: a.title,
        סוג: a.appointment_type || '',
        תאריך: a.date,
        שעת_התחלה: a.start_time || '',
        שעת_סיום: a.end_time || '',
        מיקום: a.location || '',
        תיאור: a.description || '',
        משתתפים: (a.attendees_users || []).map(u => u?.name || u?.email || '').filter(Boolean).join(', '),
      }));

    // ===== prompt system =====
    const systemPrompt = `אתה עוזר חכם לניהול בניין מגורים בישראל. שמך "עוזר הבניין".
ענה תמיד בעברית בלבד, בצורה ברורה, ידידותית ותמציתית.
אם שאלה אינה ברורה, בקש הבהרה.
היום הוא: ${todayStr} (${today.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})
המשתמש המחובר הוא: ${user.full_name || user.email}

חשוב: כל הנתונים על משימות ופגישות הם אישיים למשתמש זה בלבד — רק המשימות שהוקצו לו ורק הפגישות שהוא משתתף בהן.

--- דיירים וחייבים ---
${JSON.stringify(debtorsSummary, null, 2)}

--- אנשי קשר (דיירים) ---
${JSON.stringify(contactsSummary, null, 2)}

--- משימות שלי להיום (${todayStr}) ---
${JSON.stringify(todayTasks, null, 2)}

--- משימות דחופות שלי (עדיפות גבוהה) ---
${JSON.stringify(urgentTasks.slice(0, 20), null, 2)}

--- משימות שלי השבוע (${weekStartStr} עד ${weekEndStr}) ---
${JSON.stringify(weekTasks, null, 2)}

--- הפגישות שלי היום ---
${JSON.stringify(todayAppointments, null, 2)}

--- כל הפגישות העתידיות שלי ---
${JSON.stringify(allFutureAppointments.slice(0, 50), null, 2)}

הנחיות:
- כשנשאל על דייר/דירה ספציפית — חפש לפי מספר הדירה, שם הבעלים, שם השוכר.
- כשנשאל על טלפון — ציין את שם האדם ואת המספר.
- כשנשאל על חוב — ציין את הסכום המדויק, חודשי פיגור, וסטטוס.
- כשנשאל על פגישות — ציין כותרת, תאריך, שעה, מיקום ומשתתפים.
- כשנשאל על משימות — ציין סוג, עדיפות, תאריך.
- אם לא נמצא מידע, אמור זאת בבירור.
- השתמש בעברית בלבד.`;

    // בניית היסטוריה
    const messages = [
      ...conversationHistory.slice(-8),
      { role: 'user', content: question }
    ];

    // קריאה ל-LLM
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\n--- שיחה ---\n${messages.map(m => `${m.role === 'user' ? 'משתמש' : 'עוזר'}: ${m.content}`).join('\n')}\nעוזר:`,
      model: 'gpt_5_mini',
    });

    return Response.json({ answer: llmResponse });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});