import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'unauthorized' }, { status: 403 });
    }

    // Call Hebcal API for current year
    const year = new Date().getFullYear();
    const response = await fetch(
      `https://www.hebcal.com/api/holidays?year=${year}&i=on&c=on&maj=on&min=on&mod=on&s=on`
    );

    if (!response.ok) {
      throw new Error('Hebcal API failed');
    }

    const data = await response.json();
    const holidays = data.holidays || [];

    // Get existing holidays
    const existing = await base44.asServiceRole.entities.CalendarHoliday.list();
    const existingDates = new Set(existing.map(h => h.holiday_date));

    // Filter and create only new holidays
    const newHolidays = holidays.filter(h => !existingDates.has(h.date));

    if (newHolidays.length > 0) {
      await base44.asServiceRole.entities.CalendarHoliday.bulkCreate(
        newHolidays.map(h => ({
          holiday_date: h.date,
          holiday_name_he: h.title || h.hebrew || '',
          holiday_name_en: h.title || '',
          is_shabbat: h.title?.includes('Shabbat') || false,
          is_holiday: true,
          holiday_type: h.category || 'holiday',
          source_name: 'hebcal.com',
          synced_at: new Date().toISOString(),
        }))
      );
    }

    return Response.json({
      success: true,
      synced: newHolidays.length,
      message: `סונכרן ${newHolidays.length} חגים`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});