import { base44 } from '@/api/base44Client';

/**
 * בודק האם למשתמש יש הרשאה ספציפית
 * @param {Object} user - אובייקט המשתמש
 * @param {Array} permissions - רשימת ההרשאות של המשתמש
 * @param {string} resourceType - סוג המשאב (DebtorRecord, Status, וכו')
 * @param {string} action - הפעולה (read, create, update, delete)
 * @returns {boolean}
 */
export function hasPermission(user, permissions, resourceType, action) {
  // Base44 Super Admin - גישה מלאה
  if (user?.isBase44Admin) return true;

  // Admin מורשת - גישה מלאה
  if (user?.role === 'ADMIN') return true;

  // אם אין תפקיד מותאם - צופה בלבד
  if (!user?.role_id || !permissions || permissions.length === 0) {
    return action === 'read';
  }

  // חיפוש הרשאה ספציפית
  const permission = permissions.find(p => p.resource_type === resourceType);
  if (!permission) return false;

  const actionKey = `can_${action}`;
  return permission[actionKey] === true;
}

/**
 * בודק האם למשתמש יש הרשאת admin מלאה
 */
export function isFullAdmin(user) {
  return user?.isBase44Admin || user?.role === 'ADMIN';
}

/**
 * טוען את ההרשאות של משתמש
 */
export async function loadUserPermissions(roleId) {
  if (!roleId) return [];
  try {
    const permissions = await base44.entities.Permission.filter({ role_id: roleId });
    return permissions;
  } catch (error) {
    console.error('Error loading permissions:', error);
    return [];
  }
}

/**
 * משאבים זמינים במערכת
 */
export const RESOURCES = [
  { type: 'DebtorRecord', label: 'רשומות חייבים' },
  { type: 'Status', label: 'סטטוסים' },
  { type: 'Settings', label: 'הגדרות' },
  { type: 'User', label: 'משתמשים' },
  { type: 'Comment', label: 'הערות' },
  { type: 'ImportRun', label: 'יבואים' }
];

/**
 * פעולות זמינות
 */
export const ACTIONS = [
  { key: 'read', label: 'קריאה' },
  { key: 'create', label: 'יצירה' },
  { key: 'update', label: 'עדכון' },
  { key: 'delete', label: 'מחיקה' }
];