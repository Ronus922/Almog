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
import SidebarComplete from "@/components/notifications/SidebarComplete";
import { AlertProvider } from "@/components/notifications/AlertContext";
import GlobalAlert from "@/components/notifications/GlobalAlert";

function LayoutContent({ children, currentPageName }) {
  const navigate = useNavigate();
  const { currentUser, logout, loading, authChecked } = useAuth();
  const { attemptNavigation, importInProgress, ConfirmDialog } = useNavigationBlock();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isAdmin = isManagerRole(currentUser);

  const handleNavigation = (pageName) => {
    attemptNavigation(() => {
      navigate(createPageUrl(pageName));
      setIsSidebarOpen(false);
    });
  };

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

  if (!currentUser && currentPageName !== 'AppLogin') {
    window.location.href = createPageUrl('AppLogin');
    return null;
  }

  if (currentUser && currentPageName === 'AppLogin') {
    window.location.href = createPageUrl('Dashboard');
    return null;
  }

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
  { name: 'TodoReminders', label: 'תזכורות', icon: ClipboardList, adminOnly: false },
  { name: 'Settings', label: 'הגדרות', icon: Settings, adminOnly: true }];

  const filteredNavItems = navItems.filter((item) => {
    if (!item.adminOnly) return true;
    return isAdmin;
  });

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex" dir="rtl">
      {/* Sidebar קבוע - Desktop */}
      <aside className="hidden md:flex md:flex-col fixed right-0 top-0 h-screen w-72 bg-white border-l border-slate-200 shadow-xl z-50 overflow-y-auto">
        {/* Header בסיידבר */}
        <div className="bg-gradient-to-l from-blue-600 to-indigo-600 p-6 flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">מערכת</h1>
            <p className="text-xs text-blue-100">ניהול וארגון</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = currentPageName === item.name;
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.name)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 text-right ${
                  isActive
                    ? 'bg-gradient-to-l from-blue-100 to-blue-50 text-blue-700 shadow-sm border border-blue-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="flex-1 text-right">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User section בתחתית סיידבר */}
        {currentUser && (
          <div className="border-t border-slate-200 p-4 space-y-3">
            <SidebarComplete appName="מערכת" />
            
            <div className="pt-2 border-t border-slate-200">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-right">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{currentUser.username}</p>
                      <p className="text-xs text-slate-500">
                        {currentUser.isBase44Admin ? 'מנהל עליון' : currentUser.role === 'ADMIN' ? 'מנהל' : 'צופה'}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <div className="px-3 py-3">
                    <p className="text-sm font-semibold text-slate-800">{currentUser.username}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentUser.isBase44Admin ? 'מנהל עליון' : currentUser.role === 'ADMIN' ? 'מנהל' : 'צופה'}
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
          </div>
        )}
      </aside>

      {/* Mobile Sidebar */}
      <aside className={`md:hidden fixed right-0 top-0 h-screen w-64 bg-white shadow-2xl transform transition-transform duration-300 z-40 overflow-y-auto ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="bg-gradient-to-l from-blue-600 to-indigo-600 p-6 flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">מערכת</h1>
            <p className="text-xs text-blue-100">ניהול וארגון</p>
          </div>
        </div>
        <nav className="p-3 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = currentPageName === item.name;
            return (
              <button
                key={item.name}
                onClick={() => {
                  handleNavigation(item.name);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 text-right ${
                  isActive
                    ? 'bg-gradient-to-l from-blue-100 to-blue-50 text-blue-700 shadow-sm border border-blue-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="flex-1 text-right">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 md:mr-72 flex flex-col">
        {/* Header - Mobile Only */}
        <header className="md:hidden bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-blue-700/30 sticky top-0 z-50 shadow-lg">
          <div className="px-4 flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              {currentUser && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-white hover:bg-white/15"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  >
                    {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </Button>
                  <NotificationBell currentUser={currentUser} />
                </>
              )}
            </div>
          </div>
        </header>

        {/* תוכן */}
        <main className="flex-1">
          <ImportGuard>
            {children}
          </ImportGuard>
        </main>
      </div>

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