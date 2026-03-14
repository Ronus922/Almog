import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import KPICards from '@/components/dashboard/KPICards';
import DebtorsTable from '@/components/dashboard/DebtorsTable';
import ApartmentDetailModal from '@/components/dashboard/ApartmentDetailModal';
import { Users, Archive, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import LastImportIndicator from '@/components/dashboard/LastImportIndicator';

function DashboardContent() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('debtors');
  const [filterKeyFromUrl, setFilterKeyFromUrl] = useState(null);
  const [filterDisplayName, setFilterDisplayName] = useState('');
  const [statusFilterFromUrl, setStatusFilterFromUrl] = useState(null);
  const [autoStatusFilter, setAutoStatusFilter] = useState(null);
  const [filteredDataset, setFilteredDataset] = useState([]);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.isBase44Admin;

  // Fetch records
  const { data: records = [] } = useQuery({
    queryKey: ['debtorRecords'],
    queryFn: () => base44.entities.DebtorRecord.list()
  });

  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const settingsList = await base44.entities.Settings.list();
      return settingsList[0] || {};
    }
  });

  // Fetch statuses
  const { data: allStatuses = [] } = useQuery({
    queryKey: ['allStatuses'],
    queryFn: () => base44.entities.Status.list()
  });

  // Parse URL filters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reportKey = params.get('reportKey');
    const statusFilter = params.get('statusFilter');
    const autoStatusFilter = params.get('autoStatusFilter');

    if (reportKey) {
      setFilterKeyFromUrl(reportKey);
      const displayNames = {
        'IMMEDIATE_COLLECTION': 'לגבייה מיידית',
        'REQUIRES_LEGAL_ACTION': 'חריגה מופרזת',
        'LEGAL_PROCESS': 'בהליך משפטי',
        'WARNING_LETTER': 'מכתבי התראה'
      };
      setFilterDisplayName(displayNames[reportKey] || reportKey);
    }

    if (statusFilter) {
      setStatusFilterFromUrl(statusFilter);
    }

    if (autoStatusFilter) {
      setAutoStatusFilter(autoStatusFilter);
    }
  }, []);

  // Separate archived and debtor records
  const debtorRecords = useMemo(() => {
    return records.filter((r) => !r.isArchived);
  }, [records]);

  const archivedRecords = useMemo(() => {
    return records.filter((r) => r.isArchived);
  }, [records]);

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleSaveRecord = async (updatedRecord) => {
    try {
      await base44.entities.DebtorRecord.update(updatedRecord.id, updatedRecord);
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      setIsModalOpen(false);
      setSelectedRecord(null);
    } catch (error) {
      console.error('Error saving record:', error);
    }
  };

  const handleRecordUpdate = (recordId) => {
    queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
  };

  return (
    <TooltipProvider>
      <style>{`
        .kpi-card-glow {
          position: relative;
          overflow: hidden;
        }
        .kpi-card-glow::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%);
          animation: float 6s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-10px, -10px); }
        }
        .hero-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.35;
          mix-blend-mode: screen;
        }
        .hero-glow-1 {
          width: 400px;
          height: 400px;
          background: #a8d4ff;
          top: -100px;
          right: -150px;
        }
        .hero-glow-2 {
          width: 350px;
          height: 350px;
          background: #d8bcff;
          bottom: -120px;
          left: -100px;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50" dir="rtl">
        {/* OUTER SECTION */}
        <section className="relative m-6 rounded-3xl bg-gradient-to-b from-[#f5f7ff] to-[#edf2ff] border border-[rgba(184,198,245,0.60)] shadow-[0_24px_70px_rgba(109,132,220,0.14),0_8px_24px_rgba(160,180,255,0.10),inset_0_1px_0_rgba(255,255,255,0.95)] overflow-hidden">
          
          {/* HEADER */}
          



















          {/* HERO SECTION */}
          <div className="relative min-h-[148px] pt-5 pr-[34px] pl-[34px] pb-[26px] bg-gradient-to-br from-[rgba(187,234,255,0.40)] via-[rgba(217,230,255,0.33)] to-[rgba(239,230,255,0.28)] overflow-hidden">
            <div className="hero-glow hero-glow-1"></div>
            <div className="hero-glow hero-glow-2"></div>
            
            <div className="relative z-2">
              <h1 className="text-[44px] font-black leading-[1.05] text-[#2f3969] text-right">דשבורד חייבים</h1>
              <p className="mt-1.5 text-[13px] font-medium text-[#96a1c6] text-right">ניהול וניטור מלא של חייבים בנכסים</p>
            </div>
          </div>

          {/* KPI CARDS WRAPPER */}
          <div className="-mt-4 px-[26px] pb-6 relative z-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1 */}
              <div className="kpi-card-glow min-h-[108px] rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-4 flex flex-col justify-between">
                <p className="text-[10px] font-bold uppercase letter-spacing text-[#a0aacb]">סה״כ חוב</p>
                <div>
                  <p className="text-[18px] font-black leading-none text-[#1d5bbd]" style={{ fontSize: '18px', fontWeight: 800, color: '#1d5bbd' }}>
                    {new Intl.NumberFormat('he-IL', { notation: 'compact', maximumFractionDigits: 0 }).format(records.reduce((sum, r) => sum + (r.totalDebt || 0), 0))}
                  </p>
                  


                </div>
              </div>

              {/* KPI 2 */}
              <div className="kpi-card-glow min-h-[108px] rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-4 flex flex-col justify-between">
                <p className="text-[10px] font-bold uppercase text-[#a0aacb]">דמי ניהול</p>
                <div>
                  <p className="text-[18px] font-black leading-none text-[#1d5bbd]" style={{ fontSize: '18px', fontWeight: 800, color: '#1d5bbd' }}>
                    {new Intl.NumberFormat('he-IL', { notation: 'compact', maximumFractionDigits: 0 }).format(records.reduce((sum, r) => sum + (r.monthlyDebt || 0), 0))}
                  </p>
                  


                </div>
              </div>

              {/* KPI 3 */}
              <div className="kpi-card-glow min-h-[108px] rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-4 flex flex-col justify-between">
                <p className="text-[10px] font-bold uppercase text-[#a0aacb]">מים חמים</p>
                <div>
                  <p className="text-[18px] font-black leading-none text-[#1d5bbd]" style={{ fontSize: '18px', fontWeight: 800, color: '#1d5bbd' }}>
                    {new Intl.NumberFormat('he-IL', { notation: 'compact', maximumFractionDigits: 0 }).format(records.reduce((sum, r) => sum + (r.specialDebt || 0), 0))}
                  </p>
                  


                </div>
              </div>

              {/* KPI 4 */}
              











              {/* KPI 5 - לגבייה מיידית */}
              <div className="kpi-card-glow min-h-[108px] rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-4 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all" onClick={() => {
                setFilterKeyFromUrl('IMMEDIATE_COLLECTION');
                setFilterDisplayName('לגבייה מיידית');
                window.history.pushState({}, '', `${window.location.pathname}?reportKey=IMMEDIATE_COLLECTION`);
              }}>
                <p className="text-[10px] font-bold uppercase text-[#a0aacb]">לגבייה מיידית</p>
                <div>
                  <p className="text-[18px] font-black leading-none text-[#1d5bbd]" style={{ fontSize: '18px', fontWeight: 800, color: '#1d5bbd' }}>
                    {records.filter((r) => r.debt_status_auto === 'לגבייה מיידית').length}
                  </p>
                  


                </div>
              </div>

              {/* KPI 6 - חריגה מופרזת */}
              <div className="kpi-card-glow min-h-[108px] rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-4 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all" onClick={() => {
                setFilterKeyFromUrl('REQUIRES_LEGAL_ACTION');
                setFilterDisplayName('חריגה מופרזת');
                window.history.pushState({}, '', `${window.location.pathname}?reportKey=REQUIRES_LEGAL_ACTION`);
              }}>
                <p className="text-[10px] font-bold uppercase text-[#a0aacb]">חריגה מופרזת</p>
                <div>
                  <p className="text-[18px] font-black leading-none text-[#1d5bbd]" style={{ fontSize: '18px', fontWeight: 800, color: '#1d5bbd' }}>
                    {records.filter((r) => r.debt_status_auto === 'חריגה מופרזת').length}
                  </p>
                  


                </div>
              </div>

              {/* KPI 7 - מכתבי התראה */}
              <div className="kpi-card-glow min-h-[108px] rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-4 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all" onClick={() => {
                setFilterKeyFromUrl('WARNING_LETTER');
                setFilterDisplayName('מכתבי התראה');
                window.history.pushState({}, '', `${window.location.pathname}?reportKey=WARNING_LETTER`);
              }}>
                <p className="text-[10px] font-bold uppercase text-[#a0aacb]">מכתבי התראה</p>
                <div>
                  <p className="text-[18px] font-black leading-none text-[#1d5bbd]" style={{ fontSize: '18px', fontWeight: 800, color: '#1d5bbd' }}>
                    {allStatuses.find((s) => s.type === 'LEGAL' && s.name === 'מכתב התראה') ? records.filter((r) => r.legal_status_id === allStatuses.find((s) => s.type === 'LEGAL' && s.name === 'מכתב התראה')?.id).length : 0}
                  </p>
                  


                </div>
              </div>

              {/* KPI 8 - לטיפול משפטי */}
              <div className="kpi-card-glow min-h-[108px] rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-4 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all" onClick={() => {
                const statuses = allStatuses.filter((s) => s.type === 'LEGAL' && s.is_active);
                if (statuses.length > 0) {
                  setFilterKeyFromUrl('LEGAL_CANDIDATES');
                  setFilterDisplayName('לטיפול משפטי');
                  window.history.pushState({}, '', `${window.location.pathname}?reportKey=LEGAL_CANDIDATES`);
                }
              }}>
                <p className="text-[10px] font-bold uppercase text-[#a0aacb]">לטיפול משפטי</p>
                <div>
                  <p className="text-[18px] font-black leading-none text-[#1d5bbd]" style={{ fontSize: '18px', fontWeight: 800, color: '#1d5bbd' }}>
                    {records.filter((r) => !r.legal_status_id && r.debt_status_auto === 'חריגה מופרזת').length}
                  </p>
                  


                </div>
              </div>

              {/* KPI 9 - בהליך משפטי */}
              <div className="kpi-card-glow min-h-[108px] rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-4 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all" onClick={() => {
                setFilterKeyFromUrl('LEGAL_PROCESS');
                setFilterDisplayName('בהליך משפטי');
                window.history.pushState({}, '', `${window.location.pathname}?reportKey=LEGAL_PROCESS`);
              }}>
                <p className="text-[10px] font-bold uppercase text-[#a0aacb]">בהליך משפטי</p>
                <div>
                  <p className="text-[18px] font-black leading-none text-[#1d5bbd]" style={{ fontSize: '18px', fontWeight: 800, color: '#1d5bbd' }}>
                    {allStatuses.find((s) => s.type === 'LEGAL' && s.name === 'תביעה משפטית') ? records.filter((r) => r.legal_status_id === allStatuses.find((s) => s.type === 'LEGAL' && s.name === 'תביעה משפטית')?.id).length : 0}
                  </p>
                  


                </div>
              </div>
            </div>
          </div>
        </section>

        {/* REST OF PAGE */}
        <div className="max-w-full mx-auto space-y-6 p-6">


          {/* Filter indicators */}
          {filterKeyFromUrl &&
          <Alert className="rounded-lg border border-blue-200 bg-blue-50 px-6 py-4">
            <AlertDescription className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-900">מציג:</span>
                <span className="text-blue-700">{filterDisplayName}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterKeyFromUrl(null);
                  setFilterDisplayName('');
                  window.history.pushState({}, '', window.location.pathname);
                }}
                className="text-blue-700 hover:text-blue-900 hover:bg-blue-100">
                <X className="w-4 h-4 ml-1" />
                נקה פילטר
              </Button>
            </AlertDescription>
          </Alert>
          }

          {statusFilterFromUrl && !filterKeyFromUrl &&
          <Alert className="rounded-lg border border-blue-200 bg-blue-50 px-6 py-4">
            <AlertDescription className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-900">מסונן לפי סטטוס משפטי:</span>
                <span className="text-blue-700">{statusFilterFromUrl}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilterFromUrl(null);
                  window.history.pushState({}, '', window.location.pathname);
                }}
                className="text-blue-700 hover:text-blue-900 hover:bg-blue-100">
                <X className="w-4 h-4 ml-1" />
                נקה פילטר
              </Button>
            </AlertDescription>
          </Alert>
          }

          {autoStatusFilter && !filterKeyFromUrl &&
          <Alert className="rounded-lg border border-orange-200 bg-orange-50 px-6 py-4">
            <AlertDescription className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-orange-900">מסונן לפי סטטוס אוטומטי:</span>
                <span className="text-orange-700">{autoStatusFilter}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAutoStatusFilter(null);
                  window.history.pushState({}, '', window.location.pathname);
                }}
                className="text-orange-700 hover:text-orange-900 hover:bg-orange-100">
                <X className="w-4 h-4 ml-1" />
                נקה פילטר
              </Button>
            </AlertDescription>
          </Alert>
          }

          {/* Last Import Indicator */}
          <LastImportIndicator lastImportAt={settings?.last_import_at} isAdmin={isAdmin} />

          {/* Tabs */}
          {isAdmin &&
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('debtors')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'debtors' ?
              'bg-blue-600 text-white' :
              'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`
              }>

              <Users className="w-4 h-4" />
              חייבים ({debtorRecords.length})
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'archived' ?
              'bg-blue-600 text-white' :
              'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`
              }>

              <Archive className="w-4 h-4" />
              ארכיון ({archivedRecords.length})
            </button>
          </div>
          }

          {/* Tables */}
          {(activeTab === 'debtors' || !isAdmin) &&
          <DebtorsTable
            records={debtorRecords}
            onRowClick={handleRowClick}
            isAdmin={isAdmin}
            settings={settings}
            initialFilterKey={filterKeyFromUrl}
            initialStatusFilter={statusFilterFromUrl}
            initialAutoStatusFilter={autoStatusFilter}
            allStatuses={allStatuses}
            onFilteredDataChange={setFilteredDataset}
            onRecordUpdate={handleRecordUpdate}
            showArchived={false} />

          }

          {isAdmin && activeTab === 'archived' &&
          <DebtorsTable
            records={archivedRecords}
            onRowClick={handleRowClick}
            isAdmin={isAdmin}
            settings={settings}
            allStatuses={allStatuses}
            onFilteredDataChange={setFilteredDataset}
            onRecordUpdate={handleRecordUpdate}
            showArchived={true} />

          }

          {/* Modal */}
          <ApartmentDetailModal
            record={selectedRecord}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveRecord}
            isAdmin={isAdmin}
            settings={settings} />

        </div>
      </div>
    </TooltipProvider>);

}

export default function Dashboard() {
  return <DashboardContent />;
}