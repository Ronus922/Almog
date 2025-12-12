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
    const sessionData = localStorage.getItem('app_session');
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        // Verify session is still valid
        const users = await base44.entities.AppUser.filter({ username: session.username });
        if (users.length > 0 && users[0].is_active) {
          setCurrentUser({
            username: session.username,
            role: users[0].role
          });
        } else {
          localStorage.removeItem('app_session');
        }
      } catch (err) {
        localStorage.removeItem('app_session');
      }
    }
    setLoading(false);
  };

  const login = async (username, password) => {
    // Hash password (simple for demo - in production use proper hashing)
    const passwordHash = btoa(password);
    
    const users = await base44.entities.AppUser.filter({ 
      username: username,
      password_hash: passwordHash,
      is_active: true
    });

    if (users.length === 0) {
      throw new Error('שם משתמש או סיסמה שגויים');
    }

    const user = users[0];
    const session = {
      username: user.username,
      role: user.role,
      loginTime: new Date().toISOString()
    };

    localStorage.setItem('app_session', JSON.stringify(session));
    setCurrentUser({
      username: user.username,
      role: user.role
    });

    return user;
  };

  const logout = () => {
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