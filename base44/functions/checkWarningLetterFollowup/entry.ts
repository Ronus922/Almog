import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// פונקציה שרצה כל יום ובודקת: האם חייב שקיבל סטטוס "מכתב התראה" לפני 15+ יום עדיין לא הסדיר חובו?
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'אין הרשאה' }, { status: 403 });
    }

    // שלוף את כל הסטטוסים
    const allStatuses = await base44.asServiceRole.entities.Status.list();
    // מצא את ה-id של "מכתב התראה" סוג LEGAL
    const warningStatus = allStatuses.find(
      (s) => s.type === 'LEGAL' && s.name === 'מכתב התראה'
    );

    if (!warningStatus) {
      return Response.json({ message: 'סטטוס מכתב התראה לא נמצא' });
    }

    const warningStatusId = warningStatus.id;

    // חשב את הגבול: 15 ימים אחורה
    const now = new Date();
    const fifteenDaysAgo = new Date(now);
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const sixteenDaysAgo = new Date(now);
    sixteenDaysAgo.setDate(sixteenDaysAgo.getDate() - 16);

    // שלוף היסטוריית שינויי סטטוס לסטטוס "מכתב התראה"
    const allHistory = await base44.asServiceRole.entities.LegalStatusHistory.list();
    const warningHistory = allHistory.filter((h) => {
      if (h.new_status_id !== warningStatusId) return false;
      const changedAt = new Date(h.changed_at);
      // בין 15 ל-16 ימים אחורה (כדי לא לשלוח התראה כפולה)
      return changedAt >= sixteenDaysAgo && changedAt <= fifteenDaysAgo;
    });

    if (warningHistory.length === 0) {
      return Response.json({ message: 'אין חייבים לבדיקה היום', checked: 0 });
    }

    // שלוף את כל רשומות החייבים
    const allDebtors = await base44.asServiceRole.entities.DebtorRecord.list();
    const debtorMap = {};
    allDebtors.forEach((d) => { debtorMap[d.id] = d; });

    let alertsCreated = 0;
    const results = [];

    for (const historyEntry of warningHistory) {
      const debtor = debtorMap[historyEntry.debtor_record_id];
      if (!debtor) continue;
      if (debtor.isArchived) continue;

      // בדוק שהסטטוס הנוכחי עדיין "מכתב התראה" (לא שונה בינתיים)
      if (debtor.legal_status_id !== warningStatusId) continue;

      // בדוק שהחוב לא קטן - אם totalDebt גדול מ-0 = עדיין לא הסדיר
      if (!debtor.totalDebt || debtor.totalDebt <= 0) continue;

      // יצור התראה בתוך האפליקציה
      const message = `דירה ${debtor.apartmentNumber} — ${debtor.ownerName || ''} קיבלה מכתב התראה לפני 15 יום ועדיין לא הסדירה את החוב (${debtor.totalDebt.toLocaleString('he-IL')} ₪)`;

      await base44.asServiceRole.entities.Notification.create({
        user_username: 'admin',
        type: 'task_due_soon',
        message,
        task_type: 'מכתב התראה',
        is_read: false,
      });

      alertsCreated++;
      results.push({ apartment: debtor.apartmentNumber, debt: debtor.totalDebt });
    }

    return Response.json({
      success: true,
      checked: warningHistory.length,
      alertsCreated,
      results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});