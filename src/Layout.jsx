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
  User, ChevronDown, ChevronLeft, SlidersHorizontal, Users as UsersIcon, ClipboardList, MessageCircle, ContactRound, Upload, Settings, AlertTriangle, Clock, Users, BookOpen, Download, MapPin, Shield as ShieldIcon } from
"lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import BuildingAgent from "@/components/agent/BuildingAgent";
import { AlertProvider } from "@/components/notifications/AlertContext";
import GlobalAlert from "@/components/notifications/GlobalAlert";

function LayoutContent({ children, currentPageName }) {
  const navigate = useNavigate();
  const { currentUser, logout, loading, authChecked } = useAuth();
  const { attemptNavigation, ConfirmDialog } = useNavigationBlock();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const isAdmin = isManagerRole(currentUser) || currentUser?.isBase44Admin === true || currentUser?.role === 'SUPER_ADMIN';

  const handleNavigation = (pageName) => {
    attemptNavigation(() => {
      navigate(createPageUrl(pageName));
      setIsSidebarOpen(false);
    });
  };

  const navItems = [
  { name: 'Dashboard', label: 'דשבורד', icon: LayoutDashboard, adminOnly: false, section: 'main' },
  { name: 'TaskAnalyticsDashboard', label: 'לוח מחוונים משימות', icon: LayoutDashboard, adminOnly: false, section: 'main' },
  { name: 'UserManagement', label: 'משתמשים', icon: UsersIcon, adminOnly: true, section: 'admin' },
  { name: 'StatusManagement', label: 'סטטוסים', icon: SlidersHorizontal, adminOnly: true, section: 'admin' },
  { name: 'Import', label: 'ייבוא', icon: Upload, adminOnly: true, section: 'admin' },
  { name: 'Tasks', label: 'משימות (ישן)', icon: ClipboardList, adminOnly: false, section: 'main' },
  { name: 'TasksPro', label: 'משימות Pro', icon: ClipboardList, adminOnly: false, section: 'main' },
  { name: 'InternalChat', label: "צ'אט פנימי", icon: MessageCircle, adminOnly: false, section: 'main' },
  { name: 'Calendar', label: 'יומן', icon: Clock, adminOnly: false, section: 'main' },
  { name: 'Documents', label: 'מסמכים', icon: BookOpen, adminOnly: false, section: 'main' },
  { name: 'Contacts', label: 'אנשי קשר', icon: ContactRound, adminOnly: false, section: 'main' },
  { name: 'SupplierManagement', label: 'ספקים', icon: Users, adminOnly: false, section: 'main' },
  { name: 'WhatsAppTemplates', label: 'תבניות וואטסאפ', icon: MessageCircle, adminOnly: true, section: 'admin' },
  { name: 'WhatsAppChat', label: 'צ\'אט וואטסאפ', icon: MessageCircle, adminOnly: false, section: 'main' },
  { name: 'TodoReminders', label: 'תזכורות', icon: AlertTriangle, adminOnly: false, section: 'main' },
  { name: 'Settings', label: 'הגדרות', icon: Settings, adminOnly: true, section: 'admin' },
  { name: 'ExportData', label: 'ייצוא נתונים', icon: Download, adminOnly: true, section: 'admin' },
  { name: 'ReportIssue', label: 'דיווח תקלה', icon: AlertTriangle, adminOnly: false, section: 'main' },
  { name: 'IssuesManagement', label: 'ניהול תקלות', icon: AlertTriangle, adminOnly: true, section: 'admin' },
  { name: 'RoomsAreas', label: 'ניהול אזורים', icon: MapPin, adminOnly: true, section: 'admin' },
  { name: 'UsersManagement', label: 'ניהול משתמשים', icon: UsersIcon, adminOnly: true, section: 'admin' },
  { name: 'RolesManagement', label: 'ניהול תפקידים', icon: ShieldIcon, adminOnly: true, section: 'admin' }];


  const filteredNavItems = navItems.filter((item) => {
    if (!item.adminOnly) return true;
    return isAdmin;
  });

  const mainItems = filteredNavItems.filter((i) => i.section === 'main');
  const adminItems = filteredNavItems.filter((i) => i.section === 'admin');

  // Handle new task events from Tasks page
  useEffect(() => {
    const handleNewTask = (e) => {
      if (e.detail?.task) {
        setTasks((prev) => [e.detail.task, ...prev]);
        setShowNotifications(true);
      }
    };
    window.addEventListener('newTask', handleNewTask);
    return () => window.removeEventListener('newTask', handleNewTask);
  }, []);

  const renderNavSection = (items) =>
  <div className="space-y-1">
      {items.map((item) => {
      const isActive = currentPageName === item.name;
      return (
        <div key={item.name} className="relative group">
            <button
            onClick={() => handleNavigation(item.name)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
            isActive ? 'bg-slate-700/50 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'}`
            }>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="flex-1 text-right">{item.label}</span>}
            </button>
            {isCollapsed &&
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 shadow-lg border border-slate-700">
                {item.label}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-1.5 h-1.5 bg-slate-900 border-r border-t border-slate-700 rotate-45" />
              </div>
          }
          </div>);

    })}
    </div>;

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

  const handleLogout = () => {
    logout();
  };


  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Sidebar Desktop - Fixed */}
      <aside className={`hidden md:flex md:flex-col fixed right-0 top-0 h-screen bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900 border-l border-slate-700 z-50 transition-all duration-300 shadow-2xl scrollbar-hide ${
      isCollapsed ? 'w-20' : 'w-64'}`
      }>
        
        {/* Header */}
        <div className="p-3 border-b border-slate-700 flex items-center justify-between gap-2">
          {!isCollapsed && <h1 className="text-2xl font-extrabold text-white">ניהול אלמוג</h1>}
        </div>

        {/* Collapse Button - Floating on Side */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 transition-all duration-200 text-slate-300 hover:text-white flex items-center justify-center flex-shrink-0 shadow-lg border border-slate-600 hover:border-slate-500 z-50">

          <ChevronLeft className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>

        {/* Search/Filter */}
        














        {/* Notifications Section */}
        <div className="px-3 py-2 border-b border-slate-700">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
            tasks.length > 0 ?
            'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30' :
            'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50'}`
            }>

            <div className="relative flex-shrink-0">
            

              
              {tasks.length > 0 &&
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">
                  {tasks.length}
                </span>
              }
            </div>
            {!isCollapsed &&
            <>
                <span className="flex-1 text-right font-medium">התראות</span>
                <div className="flex-shrink-0">
                  <NotificationBell currentUser={currentUser} />
                </div>
              </>
            }
          </button>

          {showNotifications && !isCollapsed && tasks.length > 0 &&
          <div className="mt-2 bg-slate-700/30 rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto">
              <button
              onClick={() => setTasks([])}
              className="w-full text-xs text-slate-400 hover:text-slate-200 text-right mb-2 pb-2 border-b border-slate-600">
                נקה הכל
              </button>
              {tasks.map((task) =>
            <button
              key={task.id}
              onClick={() => {
                navigate(createPageUrl('Tasks'));
                setShowNotifications(false);
              }}
              className="w-full text-right flex items-start gap-2 p-2 bg-slate-700/50 hover:bg-slate-700/70 rounded text-sm text-slate-200 transition-colors">
                  <span className="flex-1">{task.task_type}</span>
                  <button
                onClick={(e) => {e.stopPropagation();setTasks(tasks.filter((t) => t.id !== task.id));}}
                className="text-slate-400 hover:text-red-400 flex-shrink-0">

                    ✕
                  </button>
                </button>
            )}
            </div>
          }
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-2 overflow-y-auto scrollbar-hide">
          {!isCollapsed && mainItems.length > 0 &&
          <div>
              <p className="text-xs text-slate-500 uppercase font-bold px-2 mb-2">תפריט ראשי</p>
              {renderNavSection(mainItems)}
            </div>
          }
          
          {!isCollapsed && adminItems.length > 0 &&
          <div className="pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500 uppercase font-bold px-2 mb-2">ניהול</p>
              {renderNavSection(adminItems)}
            </div>
          }

          {isCollapsed &&
          renderNavSection(filteredNavItems)
          }
        </nav>

        {/* Divider */}
        <div className="h-px bg-slate-700"></div>

        {/* User Section */}
        {currentUser && !isCollapsed &&
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
        }


      </aside>

      {/* Mobile Sidebar */}
      <aside className={`md:hidden fixed right-0 top-0 h-screen w-72 bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900 shadow-2xl transform transition-transform duration-300 z-40 overflow-y-auto border-l border-slate-700 ${
      isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`
      }>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">מערכת</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="p-3 space-y-4">
          {mainItems.length > 0 &&
          <div>
              <p className="text-xs text-slate-500 uppercase font-bold px-2 mb-2">תפריט ראשי</p>
              {renderNavSection(mainItems)}
            </div>
          }
          
          {adminItems.length > 0 &&
          <div className="pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500 uppercase font-bold px-2 mb-2">ניהול</p>
              {renderNavSection(adminItems)}
            </div>
          }
        </nav>
      </aside>

      {/* Mobile Overlay */}
      {isSidebarOpen &&
      <div
        className="md:hidden fixed inset-0 bg-black/30 z-30"
        onClick={() => setIsSidebarOpen(false)} />

      }

      <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'md:mr-20' : 'md:mr-64'}`}>
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="px-4 flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h1 className="text-lg font-bold text-slate-900">מערכת</h1>
            <div className="flex items-center bg-slate-700 rounded-lg px-1">
              <NotificationBell currentUser={currentUser} />
            </div>
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
      <BuildingAgent />
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