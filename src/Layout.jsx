import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  LayoutDashboard, Menu, X, LogOut,
  User, ChevronDown, ChevronLeft, SlidersHorizontal, Users as UsersIcon, ClipboardList, MessageCircle, ContactRound, Upload, Settings, AlertTriangle, Clock, Users, BookOpen } from
"lucide-react";
import { AlertProvider } from "@/components/notifications/AlertContext";
import GlobalAlert from "@/components/notifications/GlobalAlert";

function LayoutContent({ children, currentPageName }) {
  const navigate = useNavigate();
  const { currentUser, logout, loading, authChecked } = useAuth();
  const { attemptNavigation, ConfirmDialog } = useNavigationBlock();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const isAdmin = isManagerRole(currentUser);

  const handleNavigation = (pageName) => {
    attemptNavigation(() => {
      navigate(createPageUrl(pageName));
      setIsSidebarOpen(false);
    });
  };

  if (loading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <LayoutDashboard className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-lg font-semibold text-slate-300">טוען...</p>
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
    { name: 'Dashboard', label: 'דשבורד', icon: LayoutDashboard, adminOnly: false, section: 'main' },
    { name: 'UserManagement', label: 'משתמשים', icon: UsersIcon, adminOnly: true, section: 'admin' },
    { name: 'StatusManagement', label: 'סטטוסים', icon: SlidersHorizontal, adminOnly: true, section: 'admin' },
    { name: 'Import', label: 'ייבוא', icon: Upload, adminOnly: true, section: 'admin' },
    { name: 'Tasks', label: 'משימות', icon: ClipboardList, adminOnly: false, section: 'main' },
    { name: 'Calendar', label: 'יומן', icon: Clock, adminOnly: false, section: 'main' },
    { name: 'Documents', label: 'מסמכים', icon: BookOpen, adminOnly: false, section: 'main' },
    { name: 'Contacts', label: 'אנשי קשר', icon: ContactRound, adminOnly: false, section: 'main' },
    { name: 'SupplierManagement', label: 'ספקים', icon: Users, adminOnly: false, section: 'main' },
    { name: 'WhatsAppTemplates', label: 'תבניות וואטסאפ', icon: MessageCircle, adminOnly: true, section: 'admin' },
    { name: 'WhatsAppChat', label: 'צ\'אט וואטסאפ', icon: MessageCircle, adminOnly: false, section: 'main' },
    { name: 'TodoReminders', label: 'תזכורות', icon: AlertTriangle, adminOnly: false, section: 'main' },
    { name: 'Settings', label: 'הגדרות', icon: Settings, adminOnly: true, section: 'admin' }
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (!item.adminOnly) return true;
    return isAdmin;
  });

  const mainItems = filteredNavItems.filter(i => i.section === 'main');
  const adminItems = filteredNavItems.filter(i => i.section === 'admin');

  const handleLogout = () => {
    logout();
  };

  const renderNavSection = (items) => (
    <div className="space-y-1">
      {items.map((item) => {
        const isActive = currentPageName === item.name;
        return (
          <button
            key={item.name}
            onClick={() => handleNavigation(item.name)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
              isActive
                ? 'bg-slate-700/50 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
            }`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="flex-1 text-right">{item.label}</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Sidebar Desktop - Fixed */}
      <aside className={`hidden md:flex md:flex-col fixed right-0 top-0 h-screen bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900 border-l border-slate-700 z-50 transition-all duration-300 shadow-2xl scrollbar-hide ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}>
        
        {/* Header */}
        <div className="p-3 border-b border-slate-700 flex items-center justify-between">
          {!isCollapsed && (
            <h1 className="text-lg font-bold text-white">מערכת</h1>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300 hover:text-white flex items-center justify-center flex-shrink-0"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Search/Filter */}
        {!isCollapsed && (
          <div className="px-3 py-2.5 border-b border-slate-700">
            <div className="flex items-center bg-slate-700/50 rounded-lg px-3 py-1.5 gap-2">
              <input
                type="text"
                placeholder="חיפוש..."
                className="bg-transparent text-white placeholder-slate-500 text-sm flex-1 outline-none text-right"
              />
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}

        {/* Notifications Section */}
        <div className="px-3 py-2 border-b border-slate-700">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
              notifications.length > 0
                ? 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
                : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            <div className="relative flex-shrink-0">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.93 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">
                  {notifications.length}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <>
                <span className="flex-1 text-right font-medium">התראות</span>
                <svg className={`w-4 h-4 transition-transform ${showNotifications ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </>
            )}
          </button>

          {showNotifications && !isCollapsed && notifications.length > 0 && (
            <div className="mt-2 bg-slate-700/30 rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto">
              {notifications.map((notif, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-slate-700/50 rounded text-sm text-slate-200">
                  <span className="flex-1">{notif}</span>
                  <button
                    onClick={() => setNotifications(notifications.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-red-400 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-2 overflow-y-auto scrollbar-hide">
          {!isCollapsed && mainItems.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold px-2 mb-2">תפריט ראשי</p>
              {renderNavSection(mainItems)}
            </div>
          )}
          
          {!isCollapsed && adminItems.length > 0 && (
            <div className="pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500 uppercase font-bold px-2 mb-2">ניהול</p>
              {renderNavSection(adminItems)}
            </div>
          )}

          {isCollapsed && (
            renderNavSection(filteredNavItems)
          )}
        </nav>

        {/* Divider */}
        <div className="h-px bg-slate-700"></div>

        {/* User Section */}
        {currentUser && !isCollapsed && (
          <div className="p-3 border-b border-slate-700">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-700/50 transition-colors text-right">
                  <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{currentUser.username}</p>
                    <p className="text-xs text-slate-400">
                      {currentUser.role === 'ADMIN' ? 'מנהל' : 'משתמש'}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <div className="px-3 py-3">
                  <p className="text-sm font-semibold text-slate-900">{currentUser.username}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {currentUser.role === 'ADMIN' ? 'מנהל' : 'משתמש'}
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


      </aside>

      {/* Mobile Sidebar */}
      <aside className={`md:hidden fixed right-0 top-0 h-screen w-72 bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900 shadow-2xl transform transition-transform duration-300 z-40 overflow-y-auto border-l border-slate-700 ${
        isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">מערכת</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="p-3 space-y-4">
          {mainItems.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold px-2 mb-2">תפריט ראשי</p>
              {renderNavSection(mainItems)}
            </div>
          )}
          
          {adminItems.length > 0 && (
            <div className="pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500 uppercase font-bold px-2 mb-2">ניהול</p>
              {renderNavSection(adminItems)}
            </div>
          )}
        </nav>
      </aside>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 md:mr-64 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="px-4 flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h1 className="text-lg font-bold text-slate-900">מערכת</h1>
          </div>
        </header>

        {/* Content */}
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
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        `}</style>
        <LayoutContent children={children} currentPageName={currentPageName} />
      </ImportProvider>
      </AlertProvider>
      </AuthProvider>);
}