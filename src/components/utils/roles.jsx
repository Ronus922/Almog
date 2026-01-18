/**
 * Roles utility module
 * 
 * Single source of truth for role validation and display
 * Valid roles: ADMIN, VIEWER
 * Note: SUPER_ADMIN is treated as ADMIN
 */

/**
 * Normalize role to standard format
 * @param {string} role - Raw role value
 * @returns {string} Normalized role (ADMIN or VIEWER)
 */
export function normalizeRole(role) {
  if (!role) return 'VIEWER';
  
  const normalized = role.toUpperCase().trim();
  
  // Map legacy/variant roles
  if (normalized === 'SUPER_ADMIN') return 'ADMIN';
  if (normalized === 'ADMIN') return 'ADMIN';
  if (normalized === 'VIEWER') return 'VIEWER';
  if (normalized === 'VIEWER_PASSWORD') return 'VIEWER';
  
  console.warn('[Roles] Unknown role, defaulting to VIEWER:', role);
  return 'VIEWER';
}

/**
 * Check if user is a manager (full access)
 * @param {Object} user - User object with role property
 * @returns {boolean} True if user is ADMIN or SUPER_ADMIN
 */
export function isManagerRole(user) {
  if (!user || !user.role) {
    return false;
  }
  
  const normalizedRole = normalizeRole(user.role);
  const isManager = normalizedRole === 'ADMIN';
  
  return isManager;
}

/**
 * Check if user is viewer (read-only dashboard access)
 * @param {Object} user - User object with role property
 * @returns {boolean} True if user is VIEWER
 */
export function isViewerRole(user) {
  if (!user || !user.role) return false;
  const normalizedRole = normalizeRole(user.role);
  return normalizedRole === 'VIEWER';
}

/**
 * Get display name for user role
 * @param {Object} user - User object with role property
 * @returns {string} Localized role display name
 */
export function getUserRoleDisplayName(user) {
  if (!user) return '';
  
  // Handle Base44 super admin
  if (user.isBase44Admin) {
    return 'Base44 Super Admin';
  }
  
  const normalizedRole = normalizeRole(user.role);
  
  switch (normalizedRole) {
    case 'ADMIN': return 'מנהל';
    case 'VIEWER': return 'צופה';
    default: return user.role || '';
  }
}

/**
 * Legacy function for backward compatibility
 */
export function getUserRoleDisplay(user) {
  return getUserRoleDisplayName(user);
}