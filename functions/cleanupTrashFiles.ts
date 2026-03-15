import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * ניקוי אוטומטי: מחיקה קבועה של קבצים ב-"סל מחזור" מעל 30 יום
 * מתוזמן לרוץ אוטומטית (scheduled automation)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // admin only
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      // כשרץ מ-scheduler, אין משתמש — אפשר דרך service role
    }

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

    const allFiles = await base44.asServiceRole.entities.DocumentFile.list();
    const toDelete = allFiles.filter(f => {
      if (!f.is_deleted) return false;
      if (!f.deleted_at) return false;
      return new Date(f.deleted_at).toISOString() < cutoff;
    });

    console.log(`[TrashCleanup] Found ${toDelete.length} files older than 30 days in trash`);

    let deletedCount = 0;
    const errors = [];

    for (const file of toDelete) {
      try {
        await base44.asServiceRole.entities.DocumentFile.delete(file.id);
        deletedCount++;
        console.log(`[TrashCleanup] Deleted: ${file.title} (${file.id})`);
      } catch (e) {
        errors.push({ id: file.id, title: file.title, error: e.message });
        console.error(`[TrashCleanup] Failed to delete ${file.id}: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      checkedCount: toDelete.length,
      deletedCount,
      errors,
    });

  } catch (error) {
    console.error('[TrashCleanup] Fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});