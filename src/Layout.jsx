import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
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
  User, ChevronDown, Building2, Menu, X, SlidersHorizontal
} from "lucide-react";
import RoleIndicator from './components/RoleIndicator';

import { Toaster } from 'sonner';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const isAdmin = user?.role === 'admin';

  const navItems = [
    { name: 'Dashboard', label: 'דשבורד', icon: LayoutDashboard, adminOnly: false },
    { name: 'StatusManagement', label: 'ניהול סטטוסים', icon: SlidersHorizontal, adminOnly: true },
    { name: 'Import', label: 'ייבוא', icon: Upload, adminOnly: true },
    { name: 'Settings', label: 'הגדרות', icon: Settings, adminOnly: true },
  ];

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            {/* לוגו */}
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="font-extrabold text-xl bg-gradient-to-l from-slate-800 to-slate-600 bg-clip-text text-transparent">ניהול חייבים</span>
                <p className="text-xs text-slate-500 font-medium">מערכת ניהול מתקדמת</p>
              </div>
            </div>

            {/* ניווט Desktop */}
            <nav className="hidden md:flex items-center gap-2">
              {filteredNavItems.map((item) => {
                const isActive = currentPageName === item.name;
                return (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.name)}
                    className={`
                      flex items-center gap-3 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                      ${isActive 
                        ? 'bg-gradient-to-l from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* תפריט משתמש */}
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-600" />
                    </div>
                    <span className="hidden sm:block text-sm">{user?.full_name || user?.email}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <div className="px-3 py-3">
                    <p className="text-sm font-semibold text-slate-800">{user?.full_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
                    <div className="mt-2">
                      <RoleIndicator role={user?.role} />
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                    <LogOut className="w-4 h-4 ml-2" />
                    התנתק
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* כפתור תפריט מובייל */}
              <Button 
                variant="ghost" 
                size="icon"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* ניווט Mobile */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <nav className="px-4 py-3 space-y-1">
              {filteredNavItems.map((item) => {
                const isActive = currentPageName === item.name;
                return (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.name)}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-slate-100 text-slate-900' 
                        : 'text-slate-600 hover:bg-slate-50'}
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
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