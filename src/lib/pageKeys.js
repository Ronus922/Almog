/**
 * מקור אמת יחיד למפתחות דפים במערכת.
 * חייב להיות זהה בין ניהול תפקידים לבין ניווט ה-Layout.
 */
export const PAGE_KEYS = [
  { name: 'Dashboard',              label: 'דשבורד - ניהול חייבים' },
  { name: 'TaskAnalyticsDashboard', label: 'דשבורד - משימות' },
  { name: 'TasksManagement',        label: 'ניהול משימות כללי' },
  { name: 'TasksPro',               label: 'משימות' },
  { name: 'Calendar',               label: 'יומן פגישות ואירועים' },
  { name: 'Contacts',               label: 'אנשי קשר ודיירים' },
  { name: 'Documents',              label: 'מסמכים וקבצים' },
  { name: 'InternalChat',           label: "צ'אט פנימי למשתמשים" },
  { name: 'WhatsAppChat',           label: "צ'אט וואטסאפ עם דיירים" },
  { name: 'WhatsAppTemplates',      label: 'תבניות וואטסאפ' },
  { name: 'SupplierManagement',     label: 'ניהול ספקים' },
  { name: 'TodoReminders',          label: 'תזכורות ומטלות' },
  { name: 'StatusManagement',       label: 'ניהול סטטוסים' },
  { name: 'Import',                 label: 'ייבוא נתונים' },
  { name: 'ExportData',             label: 'ייצוא נתונים' },
  { name: 'RoomsAreas',             label: 'ניהול חדרים ואזורים' },
  { name: 'Settings',               label: 'הגדרות מערכת' },
  { name: 'UsersManagement',        label: 'ניהול משתמשים' },
  { name: 'RolesManagement',        label: 'ניהול תפקידים והרשאות' },
  { name: 'IssuesManagement',       label: 'ניהול תקלות ובקשות' },
];

export const PAGE_NAMES = PAGE_KEYS.map((p) => p.name);