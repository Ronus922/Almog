/**
 * Role utilities for permission checks
 */

/**
 * Check if user has manager/admin role (full access)
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export function isManagerRole(user) {
  if (!user) return false;
  
  const role = (user.role || '').toUpperCase().trim();
  const isBase44Admin = user.isBase44Admin === true;
  
  // Both ADMIN and SUPER_ADMIN get full access
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || isBase44Admin;
}

/**
 * Check if user has viewer role (read-only access)
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export function isViewerRole(user) {
  if (!user) return false;
  
  const role = (user.role || '').toUpperCase().trim();
  return role === 'VIEWER' || role === 'VIEWER_PASSWORD';
}

/**
 * Get user display role name
 * @param {Object} user - User object
 * @returns {string}
 */
export function getUserRoleDisplay(user) {
  if (!user) return 'אורח';
  if (user.isBase44Admin) return 'Base44 Admin';
  if (isManagerRole(user)) return 'מנהל';
  if (isViewerRole(user)) return 'צופה';
  return user.role || 'לא מזוהה';
}