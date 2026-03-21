/**
 * מקור אמת יחיד למפתחות דפים במערכת.
 * חייב להיות זהה בין ניהול תפקידים לבין ניווט ה-Layout.
 */
export const PAGE_KEYS = [
  { name: 'Dashboard',              label: 'דשבורד' },
  { name: 'TaskAnalyticsDashboard', label: 'לוח מחוונים משימות' },
  { name: 'TasksManagement',        label: 'ניהול משימות' },
  { name: 'TasksPro',               label: 'משימות Pro' },
  { name: 'Calendar',               label: 'יומן' },
  { name: 'Contacts',               label: 'אנשי קשר' },
  { name: 'Documents',              label: 'מסמכים' },
  { name: 'InternalChat',           label: "צ'אט פנימי" },
  { name: 'WhatsAppChat',           label: "צ'אט וואטסאפ" },
  { name: 'WhatsAppTemplates',      label: 'תבניות וואטסאפ' },
  { name: 'SupplierManagement',     label: 'ספקים' },
  { name: 'TodoReminders',          label: 'תזכורות' },
  { name: 'StatusManagement',       label: 'סטטוסים' },
  { name: 'Import',                 label: 'ייבוא' },
  { name: 'ExportData',             label: 'ייצוא נתונים' },
  { name: 'RoomsAreas',             label: 'ניהול אזורים' },
  { name: 'Settings',               label: 'הגדרות' },
  { name: 'UsersManagement',        label: 'ניהול משתמשים' },
  { name: 'RolesManagement',        label: 'ניהול תפקידים' },
  { name: 'IssuesManagement',       label: 'ניהול תקלות' },
];

export const PAGE_NAMES = PAGE_KEYS.map((p) => p.name);