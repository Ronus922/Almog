import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function AppLogin() {
  const navigate = useNavigate();
  const { login, currentUser, authChecked } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberUsername, setRememberUsername] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [checkingUsers, setCheckingUsers] = useState(true);

  useEffect(() => {
    const checkFirstUser = async () => {
      // Wait for auth check to complete
      if (!authChecked) return;
      
      // If already logged in, redirect to dashboard
      if (currentUser) {
        navigate(createPageUrl('Dashboard'), { replace: true });
        return;
      }

      // Check if there are any users in the system
      try {
        const users = await base44.entities.AppUser.list();
        setIsFirstUser(users.length === 0);
      } catch (err) {
        console.error('Error checking users:', err);
      }
      setCheckingUsers(false);

      // Load remembered username
      const savedUsername = localStorage.getItem('remembered_username');
      if (savedUsername) {
        setUsername(savedUsername);
        setRememberUsername(true);
      }
    };

    checkFirstUser();
  }, [authChecked, currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!username.trim()) {
      setError('נא להזין שם משתמש');
      return;
    }
    if (!password.trim()) {
      setError('נא להזין סיסמה');
      return;
    }

    // Check username is English only
    const englishOnly = /^[A-Za-z0-9._-]+$/;
    if (!englishOnly.test(username)) {
      setError('שם משתמש חייב להיות באנגלית בלבד');
      return;
    }

    // Check password length
    if (password.length < 6 || password.length > 10) {
      setError('סיסמה חייבת להיות 6-10 תווים');
      return;
    }

    setIsLoading(true);

    try {
      // If first user, create admin account
      if (isFirstUser) {
        const passwordHash = btoa(password);
        await base44.entities.AppUser.create({
          first_name: username,
          last_name: '',
          username,
          password_hash: passwordHash,
          role: 'admin',
          is_active: true
        });
        toast.success('משתמש Admin ראשון נוצר בהצלחה!');
        setIsFirstUser(false);
      }

      // Login
      await login(username, password);

      // Remember username if checked
      if (rememberUsername) {
        localStorage.setItem('remembered_username', username);
      } else {
        localStorage.removeItem('remembered_username');
      }

      toast.success('התחברת בהצלחה');
      navigate(createPageUrl('Dashboard'), { replace: true });
    } catch (err) {
      setError(err.message || 'שם משתמש או סיסמה שגויים');
      toast.error('שגיאה בהתחברות');
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600 font-medium">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">ניהול חייבים</h1>
          <p className="text-sm text-slate-500 mt-1">מערכת ניהול מתקדמת</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 text-right">
              {isFirstUser ? 'יצירת משתמש Admin ראשון' : 'התחברות'}
            </h2>
            <p className="text-sm text-slate-500 mt-1 text-right">
              {isFirstUser 
                ? 'צור משתמש מנהל ראשון למערכת' 
                : 'הזן שם משתמש וסיסמה כדי להיכנס'}
            </p>
          </div>

          {isFirstUser && (
            <Alert className="mb-6 bg-blue-50 border-blue-200" dir="rtl">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm font-medium">
                  אין משתמשים במערכת. צור משתמש Admin ראשון כדי להתחיל.
                </AlertDescription>
              </div>
            </Alert>
          )}

          {error && (
            <Alert className="mb-6 bg-red-50 border-red-200" dir="rtl">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800 text-sm font-medium">
                  {error}
                </AlertDescription>
              </div>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-right">
              <Label htmlFor="username" className="text-sm font-bold text-slate-700 mb-2 block">
                שם משתמש
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 rounded-xl text-left"
                dir="ltr"
                disabled={isLoading}
              />
            </div>

            <div className="text-right">
              <Label htmlFor="password" className="text-sm font-bold text-slate-700 mb-2 block">
                סיסמה
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl text-left"
                dir="ltr"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center gap-2 justify-end" dir="rtl">
              <Checkbox
                id="remember"
                checked={rememberUsername}
                onCheckedChange={setRememberUsername}
                disabled={isLoading}
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label
                htmlFor="remember"
                className="text-sm font-medium text-slate-700 cursor-pointer"
              >
                זכור שם משתמש
              </Label>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-base shadow-lg"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isFirstUser ? 'יוצר משתמש...' : 'מתחבר...'}
                </span>
              ) : (
                isFirstUser ? 'צור משתמש Admin והתחבר' : 'התחבר'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          © 2025 ניהול חייבים - כל הזכויות שמורות
        </p>
      </div>
    </div>
  );
}