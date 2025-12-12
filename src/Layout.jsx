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
          <div className="flex items-center justify-between h-16">
            {/* לוגו ושם המערכת - ימין */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-md">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-lg text-slate-800">ניהול חייבים</span>
              </div>
            </div>

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
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 h-9">
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-600" />
                      </div>
                      <span className="text-sm font-medium">{user?.full_name || user?.email}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
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
              </div>

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
              <div className="pt-2 mt-2 border-t border-slate-200">
                <div className="px-4 py-2 text-right">
                  <p className="text-xs text-slate-500 font-medium">משתמש מחובר</p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{user?.full_name || user?.email}</p>
                  <div className="mt-2">
                    <RoleIndicator role={user?.role} />
                  </div>
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