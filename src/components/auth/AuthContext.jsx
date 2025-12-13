import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizeRole } from '@/components/utils/roles.js';

const AuthContext = createContext(null);

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
      // Check Base44 admin first - silently fail if 401
      const base44User = await base44.auth.me().catch(() => null);
      
      if (base44User && base44User.role === 'admin') {
        const userData = {
          email: base44User.email,
          username: base44User.email || base44User.full_name,
          firstName: base44User.full_name || 'Admin',
          role: 'SUPER_ADMIN',
          isBase44Admin: true
        };
        console.log('[Auth] ✓ Base44 SUPER_ADMIN authenticated:', userData);
        setCurrentUser(userData);
        setLoading(false);
        setAuthChecked(true);
        return;
      }
    } catch (err) {
      // Silent fail - 401 is expected when not logged in as Base44 admin
      console.log('[Auth] Base44 auth check complete, checking app session...');
    }

    // Check internal app session
    const sessionData = localStorage.getItem('app_session');
    
    if (!sessionData) {
      console.log('[Auth] ✗ No session - UNAUTHENTICATED');
      setCurrentUser(null);
      setLoading(false);
      setAuthChecked(true);
      return;
    }

    try {
      const session = JSON.parse(sessionData);
      console.log('[Auth] Found session:', { username: session.username, role: session.role });
      
      // Validate session
      const users = await base44.entities.AppUser.filter({ 
        username: session.username,
        is_active: true 
      });
      
      if (users.length === 0) {
        console.log('[Auth] ✗ Session invalid - user not found or inactive');
        localStorage.removeItem('app_session');
        setCurrentUser(null);
        setLoading(false);
        setAuthChecked(true);
        return;
      }

      const user = users[0];
      const role = normalizeRole(user.role);

      // Validate normalized role
      if (!['ADMIN', 'VIEWER'].includes(role)) {
        console.error('[Auth] ✗ INVALID ROLE after normalization:', user.role, '→', role);
        localStorage.removeItem('app_session');
        setCurrentUser(null);
        setLoading(false);
        setAuthChecked(true);
        return;
      }

      const userData = {
        email: user.username,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        role: role,
        isBase44Admin: false
      };
      
      console.log('[Auth] ✓ App user authenticated:', userData);
      setCurrentUser(userData);
      setLoading(false);
      setAuthChecked(true);
    } catch (err) {
      console.error('[Auth] ✗ Session validation failed:', err);
      localStorage.removeItem('app_session');
      setCurrentUser(null);
      setLoading(false);
      setAuthChecked(true);
    }
  };

  const login = async (username, password) => {
    console.log('[Auth] Login attempt:', username);
    
    const passwordHash = btoa(password);
    const users = await base44.entities.AppUser.filter({ 
      username: username,
      password_hash: passwordHash,
      is_active: true
    });

    if (users.length === 0) {
      console.log('[Auth] ✗ Login failed - invalid credentials');
      throw new Error('שם משתמש או סיסמה שגויים');
    }

    const user = users[0];
    const role = normalizeRole(user.role);

    // Validate normalized role
    if (!['ADMIN', 'VIEWER'].includes(role)) {
      console.error('[Auth] ✗ INVALID ROLE after normalization:', user.role, '→', role);
      throw new Error('תפקיד משתמש לא חוקי');
    }

    const session = {
      username: user.username,
      role: role,
      loginTime: new Date().toISOString()
    };

    localStorage.setItem('app_session', JSON.stringify(session));

    const userData = {
      email: user.username,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      role: role,
      isBase44Admin: false
    };
    
    console.log('[Auth] ✓ Login successful:', userData);
    setCurrentUser(userData);

    return user;
  };

  const logout = () => {
    console.log('[Auth] Logging out...');
    
    if (currentUser?.isBase44Admin) {
      base44.auth.logout();
      return;
    }
    
    localStorage.removeItem('app_session');
    setCurrentUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      loading,
      authChecked,
      login, 
      logout,
      checkAuth 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}