import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizeRole } from '../utils/roles';

const AuthContext = createContext(null);

/**
 * טוען את רשומת התפקיד מה-DB לפי role_id.
 * מחזיר { is_admin, accessible_pages } או null.
 */
async function loadRoleData(roleId) {
  if (!roleId) return null;
  try {
    const all = await base44.entities.Role.list();
    const role = all.find((r) => r.id === roleId);
    if (!role) {
      console.warn('[Auth] role_id not found in DB:', roleId);
      return null;
    }
    console.log('[Auth] Loaded role data:', { name: role.name, is_admin: role.is_admin, accessible_pages: role.accessible_pages });
    return role;
  } catch (err) {
    console.error('[Auth] Failed to load role data:', err);
    return null;
  }
}

/**
 * מחשב accessiblePages לפי נתוני התפקיד.
 * null = גישה מלאה, [] = אין גישה, [..] = רשימה ספציפית
 */
function resolveAccessiblePages(roleData, systemRole) {
  // SUPER_ADMIN מ-Base44 = גישה מלאה
  if (systemRole === 'SUPER_ADMIN') return null;
  // אם אין role_id מוגדר = fallback לפי system role
  if (!roleData) {
    return systemRole === 'ADMIN' ? null : [];
  }
  // תפקיד עם is_admin = true → גישה מלאה
  if (roleData.is_admin) return null;
  // אחרת - רשימה ספציפית (יכולה להיות ריקה)
  return Array.isArray(roleData.accessible_pages) ? roleData.accessible_pages : [];
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log('[Auth] Starting authentication check...');
    setLoading(true);
    setAuthChecked(false);

    try {
      const base44User = await base44.auth.me().catch(() => null);

      if (base44User && base44User.role === 'admin') {
        const userData = {
          email: base44User.email,
          username: base44User.email || base44User.full_name,
          firstName: base44User.full_name || 'Admin',
          role: 'SUPER_ADMIN',
          role_id: null,
          isBase44Admin: true,
          accessiblePages: null, // null = גישה מלאה
          roleData: null,
        };
        console.log('[Auth] ✓ Base44 SUPER_ADMIN:', userData);
        setCurrentUser(userData);
        setLoading(false);
        setAuthChecked(true);
        return;
      }
    } catch {
      // silent
    }

    const sessionData = localStorage.getItem('app_session');
    if (!sessionData) {
      console.log('[Auth] ✗ No session');
      setCurrentUser(null);
      setLoading(false);
      setAuthChecked(true);
      return;
    }

    try {
      const session = JSON.parse(sessionData);
      console.log('[Auth] Restoring session for:', session.username);

      const users = await base44.entities.AppUser.list();
      const user = users.find((u) => u.username === session.username && u.is_active !== false);

      if (!user) {
        console.log('[Auth] ✗ User not found or inactive');
        localStorage.removeItem('app_session');
        setCurrentUser(null);
        setLoading(false);
        setAuthChecked(true);
        return;
      }

      const systemRole = normalizeRole(user.role);
      const roleData = await loadRoleData(user.role_id);
      const accessiblePages = resolveAccessiblePages(roleData, systemRole);

      console.log('[Auth] ✓ Session restored:', { username: user.username, systemRole, role_id: user.role_id, accessiblePages });

      setCurrentUser({
        email: user.email || user.username,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        role: systemRole,
        role_id: user.role_id || null,
        isBase44Admin: false,
        accessiblePages,
        roleData,
      });
      setLoading(false);
      setAuthChecked(true);
    } catch (err) {
      console.error('[Auth] ✗ Session restore failed:', err);
      localStorage.removeItem('app_session');
      setCurrentUser(null);
      setLoading(false);
      setAuthChecked(true);
    }
  };

  const login = async (username, password) => {
    console.log('[Auth] Login attempt:', username);

    const passwordHash = btoa(password);
    const users = await base44.entities.AppUser.list();
    const user = users.find(
      (u) => u.username === username && u.password_hash === passwordHash && u.is_active !== false
    );

    if (!user) {
      throw new Error('שם משתמש או סיסמה שגויים');
    }

    const systemRole = normalizeRole(user.role);
    const roleData = await loadRoleData(user.role_id);
    const accessiblePages = resolveAccessiblePages(roleData, systemRole);

    console.log('[Auth] ✓ Login OK:', { username: user.username, systemRole, role_id: user.role_id, accessiblePages });

    localStorage.setItem('app_session', JSON.stringify({
      username: user.username,
      role: systemRole,
      loginTime: new Date().toISOString(),
    }));

    const userData = {
      email: user.email || user.username,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      role: systemRole,
      role_id: user.role_id || null,
      isBase44Admin: false,
      accessiblePages,
      roleData,
    };

    setCurrentUser(userData);
    return user;
  };

  const logout = () => {
    if (currentUser?.isBase44Admin) {
      base44.auth.logout();
      return;
    }
    localStorage.removeItem('app_session');
    setCurrentUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, authChecked, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}