import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { isManagerRole } from '@/components/utils/roles';
import { AuthProvider, useAuth } from '@/components/auth/AuthContext';
import { ImportProvider } from '@/components/import/ImportContext';
import ImportGuard, { useNavigationBlock } from '@/components/import/ImportGuard';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import {
  LayoutDashboard, Upload, Settings, LogOut,
  User, ChevronDown, Building2, Menu, X, SlidersHorizontal, Users as UsersIcon, Copy, ClipboardList, MessageCircle, ContactRound } from
"lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { AlertProvider } from "@/components/notifications/AlertContext";
import GlobalAlert from "@/components/notifications/GlobalAlert";

function LayoutContent({ children, currentPageName }) {
  const navigate = useNavigate();
  const { currentUser, logout, loading, authChecked } = useAuth();
  const { attemptNavigation, importInProgress, ConfirmDialog } = useNavigationBlock();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isAdmin = isManagerRole(currentUser);

  // Safe navigation with import guard
  const handleNavigation = (pageName) => {
    attemptNavigation(() => {
      navigate(createPageUrl(pageName));
      setIsMobileMenuOpen(false);
    });
  };

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
      </div>);

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
  { name: 'Tasks', label: 'משימות', icon: ClipboardList, adminOnly: false },
  { name: 'Calendar', label: 'יומן', icon: ClipboardList, adminOnly: false },
  { name: 'Documents', label: 'מסמכים', icon: Upload, adminOnly: false },
  { name: 'Contacts', label: 'אנשי קשר', icon: ContactRound, adminOnly: false },
  { name: 'SupplierManagement', label: 'ספקים', icon: ContactRound, adminOnly: false },
  { name: 'WhatsAppTemplates', label: 'תבניות וואטסאפ', icon: MessageCircle, adminOnly: true },
  { name: 'WhatsAppChat', label: 'צ\'אט וואטסאפ', icon: MessageCircle, adminOnly: false },
  { name: 'Settings', label: 'הגדרות', icon: Settings, adminOnly: true }];


  // הצגת פריטים רק למי שיש לו הרשאה
  const filteredNavItems = navItems.filter((item) => {
    if (!item.adminOnly) return true; // פריטים כלליים תמיד מוצגים
    return isAdmin; // פריטים של admin רק למנהלים
  });

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50" dir="rtl">
      {/* Sidebar */}
      <aside className={`fixed right-0 top-16 h-[calc(100vh-64px)] w-64 bg-white border-l border-slate-200 shadow-lg transform transition-transform duration-300 z-40 overflow-y-auto ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <nav className="p-4 space-y-2">
          {filteredNavItems.map((item) => {
            const isActive = currentPageName === item.name;
            return (
              <button
                key={item.name}
                onClick={() => {
                  handleNavigation(item.name);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-right ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-semibold shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-right">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 top-16"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-blue-700/30 sticky top-0 z-50 shadow-lg">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* לוגו אחד בלבד - ימין */}
            







            {/* כפתור תפריט - שמאל */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white hover:bg-white/15"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            {/* תפריט משתמש - שמאל */}
            <div className="flex items-center gap-2">
              {currentUser &&
              <div className="hidden md:flex items-center gap-2">
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="gap-2 h-9 text-white hover:bg-white/15">
                        <div className="w-7 h-7 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium">שלום, {currentUser.username}</span>
                        <ChevronDown className="w-3 h-3 text-white/70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <div className="px-3 py-3">
                        <p className="text-sm font-semibold text-slate-800">{currentUser.username}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {currentUser.isBase44Admin ?
                        'Base44 Super Admin' :
                        currentUser.role === 'ADMIN' ? 'מנהל' :
                        'צופה'}
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
              }

              {/* פעמון */}
              {currentUser &&
              <NotificationBell currentUser={currentUser} />
              }
            </div>
          </div>
        </div>


      </header>

      {/* תוכן */}
      <main>
        <ImportGuard>
          {children}
        </ImportGuard>
      </main>

      <ConfirmDialog />
      <GlobalAlert />
      </div>);

}

export default function Layout({ children, currentPageName }) {
  return (
    <AuthProvider>
      <AlertProvider>
      <ImportProvider>
        <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@300;400;500;600;700;800;900&display=swap');

        * {
          font-family: 'Noto Sans Hebrew', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif !important;
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
      </ImportProvider>
      </AlertProvider>
      </AuthProvider>);

}