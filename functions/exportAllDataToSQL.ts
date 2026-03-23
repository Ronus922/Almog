import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const ENTITIES = [
  'DebtorRecord',
  'Contact',
  'Comment',
  'Task',
  'TaskAttachment',
  'TaskAuditLog',
  'LegalStatusHistory',
  'Status',
  'Settings',
  'ImportRun',
  'WhatsAppTemplate',
  'ChatMessage',
  'Notification',
  'AppUser',
  'Appointment',
  'CalendarEvent',
  'CalendarEventParticipant',
  'CalendarHoliday',
  'DocumentFolder',
  'DocumentFile',
  'Supplier',
  'SupplierCategory',
  'SupplierDocument',
  'Operator',
  'TodoItem',
  'TodoCategory',
  'TodoComment',
  'InternalMessage',
  'InternalConversation',
  'BroadcastCampaign',
  'BroadcastRecipient',
  'TaskPro',
  'TaskProComment',
  'TaskProAttachment',
  'TaskProActivity',
  'TaskProReminder',
  'TaskRecurrenceRule',
  'TaskReminder',
  'TaskComment',
  'TaskActivity',
];

function escapeSQLValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'number') return val;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function generateInsertSQL(tableName, records) {
  if (!records || records.length === 0) {
    return `-- טבלה ${tableName}: אין רשומות\n`;
  }

  const allKeys = [...new Set(records.flatMap(r => Object.keys(r)))];
  
  let sql = `-- ========================================\n`;
  sql += `-- טבלה: ${tableName} (${records.length} רשומות)\n`;
  sql += `-- ========================================\n`;
  sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
  sql += `CREATE TABLE \`${tableName}\` (\n`;
  sql += allKeys.map(k => `  \`${k}\` TEXT`).join(',\n');
  sql += `\n);\n\n`;

  // Insert in batches of 100
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    sql += `INSERT INTO \`${tableName}\` (\`${allKeys.join('`, `')}\`) VALUES\n`;
    sql += batch.map(record => {
      const values = allKeys.map(k => escapeSQLValue(record[k]));
      return `  (${values.join(', ')})`;
    }).join(',\n');
    sql += `;\n\n`;
  }

  return sql;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'לא מורשה' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'גישה למנהלים בלבד' }, { status: 403 });
    }

    let fullSQL = `-- ========================================\n`;
    fullSQL += `-- ייצוא מלא של מסד הנתונים\n`;
    fullSQL += `-- תאריך: ${new Date().toISOString()}\n`;
    fullSQL += `-- ========================================\n\n`;
    fullSQL += `PRAGMA foreign_keys = OFF;\n\n`;

    const summary = [];

    for (const entityName of ENTITIES) {
      try {
        const records = await base44.asServiceRole.entities[entityName].list();
        fullSQL += generateInsertSQL(entityName, records);
        summary.push({ entity: entityName, count: records.length, status: 'ok' });
      } catch (e) {
        fullSQL += `-- טבלה ${entityName}: שגיאה - ${e.message}\n\n`;
        summary.push({ entity: entityName, count: 0, status: 'error', error: e.message });
      }
    }

    fullSQL += `PRAGMA foreign_keys = ON;\n`;
    fullSQL += `-- ========================================\n`;
    fullSQL += `-- סיום ייצוא\n`;
    fullSQL += `-- ========================================\n`;

    return new Response(fullSQL, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql; charset=utf-8',
        'Content-Disposition': `attachment; filename="backup_${new Date().toISOString().slice(0, 10)}.sql"`,
        'X-Summary': JSON.stringify(summary),
      },
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});