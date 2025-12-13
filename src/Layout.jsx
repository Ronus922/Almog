import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { isManagerRole } from '@/components/utils/roles';
import { AuthProvider, useAuth } from '@/components/auth/AuthContext';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  LayoutDashboard, Upload, Settings, LogOut, 
  User, ChevronDown, Building2, Menu, X, SlidersHorizontal, Users as UsersIcon
} from "lucide-react";

import { Toaster } from 'sonner';

function LayoutContent({ children, currentPageName }) {
  const { currentUser, logout, loading, authChecked } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = isManagerRole(currentUser);

  // Show loading state while checking auth
  if (loading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-lg font-semibold text-slate-700">טוען...</p>
        </div>
      </div>
    );
  }

  // CRITICAL: If not authenticated and not on login page, redirect
  if (!currentUser && currentPageName !== 'AppLogin') {
    window.location.href = createPageUrl('AppLogin');
    return null;
  }

  // Redirect to Dashboard if authenticated and on login page
  if (currentUser && currentPageName === 'AppLogin') {
    window.location.href = createPageUrl('Dashboard');
    return null;
  }

  console.log('[Layout] User check:', { 
    user: currentUser?.username || currentUser?.email, 
    role: currentUser?.role, 
    isBase44Admin: currentUser?.isBase44Admin,
    isAdmin,
    authChecked
  });

  const navItems = [
    { name: 'Dashboard', label: 'דשבורד', icon: LayoutDashboard, adminOnly: false },
    { name: 'UserManagement', label: 'משתמשים', icon: UsersIcon, adminOnly: true },
    { name: 'StatusManagement', label: 'סטטוסים', icon: SlidersHorizontal, adminOnly: true },
    { name: 'Import', label: 'ייבוא', icon: Upload, adminOnly: true },
    { name: 'Settings', label: 'הגדרות', icon: Settings, adminOnly: true },
  ];

  // הצגת פריטים רק למי שיש לו הרשאה
  const filteredNavItems = navItems.filter(item => {
    if (!item.adminOnly) return true; // פריטים כלליים תמיד מוצגים
    return isAdmin; // פריטים של admin רק למנהלים
  });

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* לוגו אחד בלבד - ימין */}
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-md">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-lg text-slate-800">ניהול חייבים</span>
              </div>
            </Link>

            {/* ניווט Desktop - מרכז */}
            <nav className="hidden md:flex items-center gap-1">
              {filteredNavItems.map((item) => {
                const isActive = currentPageName === item.name;
                return (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.name)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-700 hover:bg-slate-100'}
                    `}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* תפריט משתמש - שמאל */}
            <div className="flex items-center gap-2">
              {currentUser && (
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="gap-2 h-9">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                          <User className="w-4 h-4 text-slate-600" />
                        </div>
                        <span className="text-sm font-medium">שלום, {currentUser.username}</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <div className="px-3 py-3">
                        <p className="text-sm font-semibold text-slate-800">{currentUser.username}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {currentUser.isBase44Admin 
                            ? 'Base44 Super Admin' 
                            : currentUser.role === 'SUPER_ADMIN' ? 'Super Admin'
                            : currentUser.role === 'ADMIN' ? 'Admin'
                            : 'Viewer'}
                        </p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                        <LogOut className="w-4 h-4 ml-2" />
                        התנתק
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}


              {/* כפתור תפריט מובייל */}
              <Button 
                variant="ghost" 
                size="icon"
                className="md:hidden h-9 w-9"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* תפריט Mobile */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white shadow-lg" dir="rtl">
            <nav className="px-4 py-3 space-y-1">
              {filteredNavItems.map((item) => {
                const isActive = currentPageName === item.name;
                return (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.name)}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-right
                      ${isActive 
                        ? 'bg-blue-50 text-blue-700 font-semibold' 
                        : 'text-slate-700 hover:bg-slate-50'}
                    `}
                    dir="rtl"
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1 text-right">{item.label}</span>
                  </Link>
                );
              })}
              {currentUser && (
                <div className="pt-2 mt-2 border-t border-slate-200">
                  <div className="px-4 py-2 text-right">
                    <p className="text-xs text-slate-500 font-medium">משתמש מחובר</p>
                    <p className="text-sm font-semibold text-slate-800 mt-1">{currentUser.username}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {currentUser.isBase44Admin 
                        ? 'Base44 Super Admin'
                        : currentUser.role === 'SUPER_ADMIN' ? 'Super Admin'
                        : currentUser.role === 'ADMIN' ? 'Admin'
                        : 'Viewer'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors text-right"
                    dir="rtl"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-right">התנתק</span>
                  </button>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* תוכן */}
      <main>
        {children}
      </main>

      <Toaster position="top-center" dir="rtl" richColors />
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <AuthProvider>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap');

        * {
          font-family: 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif !important;
          letter-spacing: -0.01em;
        }
        html {
          font-size: 17px;
        }
        body {
          font-weight: 400;
        }
        h1, h2, h3 {
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        h4, h5, h6 {
          font-weight: 700;
        }
        strong, b {
          font-weight: 700;
        }
      `}</style>
      <LayoutContent children={children} currentPageName={currentPageName} />
    </AuthProvider>
  );
}