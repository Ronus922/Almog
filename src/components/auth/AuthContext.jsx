import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log('[AuthContext] Starting checkAuth...');
    
    // First check if user is Base44 admin
    try {
      const base44User = await base44.auth.me();
      console.log('[AuthContext] Base44 user check:', { 
        email: base44User?.email, 
        role: base44User?.role,
        full_name: base44User?.full_name 
      });
      
      if (base44User && base44User.role === 'admin') {
        const userData = {
          username: base44User.email || base44User.full_name || 'Admin',
          firstName: base44User.full_name || 'Admin',
          role: 'ADMIN',
          isBase44Admin: true
        };
        console.log('[AuthContext] Setting Base44 Admin user:', userData);
        setCurrentUser(userData);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.log('[AuthContext] Base44 auth check failed (expected if not Base44 admin):', err.message);
      // Not logged in to Base44 or not admin, continue to check app session
    }

    // Check internal app session
    const sessionData = localStorage.getItem('app_session');
    console.log('[AuthContext] Checking localStorage session:', sessionData ? 'exists' : 'not found');
    
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        console.log('[AuthContext] Session parsed:', { username: session.username, role: session.role });
        
        // Verify session is still valid
        const users = await base44.entities.AppUser.filter({ username: session.username });
        console.log('[AuthContext] Found users for session:', users.length);
        
        if (users.length > 0 && users[0].is_active) {
          const normalizedRole = (users[0].role || '').toUpperCase().trim();
          const userData = {
            username: session.username,
            firstName: users[0].first_name,
            lastName: users[0].last_name,
            role: normalizedRole,
            isBase44Admin: false
          };
          console.log('[AuthContext] Setting internal app user:', userData);
          setCurrentUser(userData);
        } else {
          console.log('[AuthContext] User not found or inactive, clearing session');
          localStorage.removeItem('app_session');
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('[AuthContext] Error validating session:', err);
        localStorage.removeItem('app_session');
        setCurrentUser(null);
      }
    } else {
      console.log('[AuthContext] No session found, user is guest');
      setCurrentUser(null);
    }
    
    setLoading(false);
    console.log('[AuthContext] checkAuth completed');
  };

  const login = async (username, password) => {
    console.log('[AuthContext] Login attempt for:', username);
    
    // Hash password (simple for demo - in production use proper hashing)
    const passwordHash = btoa(password);
    
    const users = await base44.entities.AppUser.filter({ 
      username: username,
      password_hash: passwordHash,
      is_active: true
    });

    console.log('[AuthContext] Login query result:', users.length, 'users found');

    if (users.length === 0) {
      throw new Error('שם משתמש או סיסמה שגויים');
    }

    const user = users[0];
    const normalizedRole = (user.role || 'VIEWER').toUpperCase().trim();
    
    console.log('[AuthContext] User found:', { 
      username: user.username, 
      rawRole: user.role,
      normalizedRole,
      firstName: user.first_name 
    });
    
    const session = {
      username: user.username,
      role: normalizedRole,
      loginTime: new Date().toISOString()
    };

    localStorage.setItem('app_session', JSON.stringify(session));
    console.log('[AuthContext] Session saved to localStorage');
    
    const userData = {
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      role: normalizedRole,
      isBase44Admin: false
    };
    
    console.log('[AuthContext] Setting currentUser:', userData);
    setCurrentUser(userData);

    return user;
  };

  const logout = () => {
    // If Base44 admin, logout from Base44
    if (currentUser?.isBase44Admin) {
      base44.auth.logout();
      return;
    }
    
    // Otherwise logout from internal system
    localStorage.removeItem('app_session');
    setCurrentUser(null);
    window.location.href = '/';
  };

  const isPublicAccessEnabled = async () => {
    const settings = await base44.entities.AppSettings.list();
    if (settings.length > 0) {
      return settings[0].dashboard_public_enabled || false;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      loading, 
      login, 
      logout, 
      isPublicAccessEnabled,
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