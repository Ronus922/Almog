/**
 * Role utilities - SINGLE SOURCE OF TRUTH
 * Only 3 valid roles: SUPER_ADMIN, ADMIN, VIEWER
 */

/**
 * Check if user is manager (SUPER_ADMIN or ADMIN) - FULL ACCESS
 */
export function isManagerRole(user) {
  if (!user || !user.role) {
    console.log('[Roles] No user or role');
    return false;
  }
  
  const role = user.role.toUpperCase().trim();
  const isManager = role === 'SUPER_ADMIN' || role === 'ADMIN';
  
  console.log('[Roles] Manager check:', { 
    username: user.username || user.email,
    role: user.role,
    isBase44Admin: user.isBase44Admin,
    result: isManager
  });
  
  return isManager;
}

/**
 * Check if user is viewer - READ-ONLY Dashboard
 */
export function isViewerRole(user) {
  if (!user || !user.role) return false;
  return user.role.toUpperCase().trim() === 'VIEWER';
}

/**
 * Get display name for role
 */
export function getUserRoleDisplay(user) {
  if (!user) return 'אורח';
  
  const role = (user.role || '').toUpperCase().trim();
  
  if (user.isBase44Admin) return 'Base44 Super Admin';
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'ADMIN') return 'Admin';
  if (role === 'VIEWER') return 'Viewer';
  
  return 'תפקיד לא מזוהה';
}