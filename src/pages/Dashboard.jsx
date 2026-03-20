import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import DebtorsTable from '@/components/dashboard/DebtorsTable';
import ApartmentDetailModal from '@/components/dashboard/ApartmentDetailModal';
import { Users, Archive, Mail, Scale, AlertTriangle, CalendarClock } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import LastImportIndicator from '@/components/dashboard/LastImportIndicator';

function DashboardContent() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('debtors');
  const [filteredDataset, setFilteredDataset] = useState([]);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.isBase44Admin;

  // Fetch ALL records (no filtering here — useMemo below handles it)
  const { data: records = [] } = useQuery({
    queryKey: ['debtorRecords'],
    queryFn: () => base44.entities.DebtorRecord.list(),
    staleTime: 0,
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
  const { data: allStatuses = [], refetch: refetchStatuses } = useQuery({
    queryKey: ['allStatuses'],
    queryFn: () => base44.entities.Status.list()
  });

  // ===== וידוא קיום סטטוסים LEGAL נדרשים + יצירתם אם חסרים =====
  const [statusesReady, setStatusesReady] = useState(false);

  useEffect(() => {
    if (allStatuses.length === 0) return;

    const requiredStatuses = [
      { name: 'מכתב התראה', color: 'bg-amber-100 text-amber-800' },
      { name: 'לטיפול משפטי', color: 'bg-purple-100 text-purple-800' },
      { name: 'בהליך משפטי', color: 'bg-red-100 text-red-800' },
    ];

    const legalStatuses = allStatuses.filter((s) => s.type === 'LEGAL');
    const missing = requiredStatuses.filter(
      (req) => !legalStatuses.find((s) => s.name === req.name)
    );

    if (missing.length === 0) {
      setStatusesReady(true);
      return;
    }

    // יצירת סטטוסים חסרים בסדרה ורענון
    Promise.all(
      missing.map((req) =>
        base44.entities.Status.create({
          name: req.name,
          type: 'LEGAL',
          color: req.color,
          is_active: true,
          is_default: false,
        })
      )
    ).then(() => {
      refetchStatuses();
      setStatusesReady(true);
    });
  }, [allStatuses]);

  // ===== חישוב datasets לטאבים — עובד על כל הרשומות הקיימות =====
  const tabDatasets = useMemo(() => {
    const legalStatusList = allStatuses.filter((s) => s.type === 'LEGAL');
    const getStatusId = (name) => legalStatusList.find((s) => s.name === name)?.id || null;

    const warningId = getStatusId('מכתב התראה');
    const legalProcessId = getStatusId('בהליך משפטי');

    // סריקה מלאה — כל הרשומות (גם ארכיון)
    const archived = records.filter((r) => r.isArchived === true);
    const active = records.filter((r) => !r.isArchived);

    // רשומות עם "מכתב התראה" — רק active
    const warningTab = active.filter((r) => warningId && r.legal_status_id === warningId);

    // רשומות "לטיפול משפטי" — חריגה מופרזת ללא legal_status_id, רק active
    const legalCandidatesTab = active.filter(
      (r) => r.debt_status_auto === 'חריגה מופרזת' && !r.legal_status_id
    );

    // רשומות "בהליך משפטי" — רק active
    const legalProcessTab = active.filter((r) => legalProcessId && r.legal_status_id === legalProcessId);

    // כל סטטוסי LEGAL שיש להם טאב ייעודי — אלה ייסוננו מטאב חייבים
    const legalTabStatusIds = new Set([
      warningId,        // מכתב התראה
      legalProcessId,   // בהליך משפטי
      // לטיפול משפטי
      legalStatusList.find(s => s.name === 'לטיפול משפטי')?.id,
    ].filter(Boolean));

    // חייבים — רק active ללא רשומות שיש להם טאב ייעודי
    const debtorsTab = active.filter((r) => !r.legal_status_id || !legalTabStatusIds.has(r.legal_status_id));

    // פעולות הבאות — תאריך nextActionDate עבר
    const today = new Date().toISOString().split('T')[0];
    const nextActionsTab = active.filter(
      (r) => r.nextActionDate && r.nextActionDate < today
    );

    return { warningTab, legalCandidatesTab, legalProcessTab, debtorsTab, archived, nextActionsTab };
  }, [records, allStatuses]);

  // ארכיון
  const archivedRecords = tabDatasets.archived;
  const debtorRecords = tabDatasets.debtorsTab;

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
                <p className="text-[18px] font-black uppercase letter-spacing" style={{color: '#1d5bbd'}}>סה״כ חוב</p>
                <div>
                  <p className="text-[32px] font-black leading-none text-[#2bc9a8]">
                    {new Intl.NumberFormat('he-IL', { notation: 'compact', maximumFractionDigits: 0 }).format(records.reduce((sum, r) => sum + (r.totalDebt || 0), 0))}
                  </p>
                  


                </div>
              </div>

              {/* KPI 2 */}
              <div className="kpi-card-glow min-h-[108px] rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-4 flex flex-col justify-between">
                <p className="text-[18px] font-black uppercase" style={{color: '#1d5bbd'}}>דמי ניהול</p>
                <div>
                  <p className="text-[32px] font-black leading-none text-[#6270ff]">
                    {new Intl.NumberFormat('he-IL', { notation: 'compact', maximumFractionDigits: 0 }).format(records.reduce((sum, r) => sum + (r.monthlyDebt || 0), 0))}
                  </p>
                  


                </div>
              </div>

              {/* KPI 3 */}
              <div className="kpi-card-glow min-h-[108px] rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-4 flex flex-col justify-between">
                <p className="text-[18px] font-black uppercase" style={{color: '#1d5bbd'}}>מים חמים</p>
                <div>
                  <p className="text-[32px] font-black leading-none text-[#f5a623]">
                    {new Intl.NumberFormat('he-IL', { notation: 'compact', maximumFractionDigits: 0 }).format(records.reduce((sum, r) => sum + (r.specialDebt || 0), 0))}
                  </p>
                  


                </div>
              </div>

              {/* KPI 4 */}
              











              {/* KPI 5 - לגבייה מיידית */}
              <div className="kpi-card-glow min-h-[108px] rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-4 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all"
                onClick={() => { setActiveTab('debtors'); }}>
                <p className="text-[18px] font-black uppercase" style={{color: '#1d5bbd'}}>לגבייה מיידית</p>
                <div>
                  <p className="text-[32px] font-black leading-none text-[#ff7a5c]">
                    {tabDatasets.debtorsTab.filter((r) => r.debt_status_auto === 'לגבייה מיידית').length}
                  </p>
                </div>
              </div>

              {/* KPI 6 - חריגה מופרזת */}
              <div className="kpi-card-glow min-h-[108px] rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-4 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all"
                onClick={() => { setActiveTab('legal_candidates'); }}>
                <p className="text-[18px] font-black uppercase" style={{color: '#1d5bbd'}}>חריגה מופרזת</p>
                <div>
                  <p className="text-[32px] font-black leading-none text-[#ff3b3b]">
                    {tabDatasets.legalCandidatesTab.length}
                  </p>
                </div>
              </div>

              {/* KPI 7 - מכתבי התראה */}
              <div className="kpi-card-glow min-h-[108px] rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-4 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all"
                onClick={() => { setActiveTab('warning'); }}>
                <p className="text-[18px] font-black uppercase" style={{color: '#1d5bbd'}}>מכתבי התראה</p>
                <div>
                  <p className="text-[32px] font-black leading-none text-[#ffa500]">
                    {tabDatasets.warningTab.length}
                  </p>
                </div>
              </div>

              {/* KPI 8 - לטיפול משפטי */}
              <div className="kpi-card-glow min-h-[108px] rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-4 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all"
                onClick={() => { setActiveTab('legal_candidates'); }}>
                <p className="text-[18px] font-black uppercase" style={{color: '#1d5bbd'}}>לטיפול משפטי</p>
                <div>
                  <p className="text-[32px] font-black leading-none text-[#5b6cff]">
                    {tabDatasets.legalCandidatesTab.length}
                  </p>
                </div>
              </div>

              {/* KPI 9 - בהליך משפטי */}
              <div className="kpi-card-glow min-h-[108px] rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-4 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all"
                onClick={() => { setActiveTab('legal_process'); }}>
                <p className="text-[18px] font-black uppercase" style={{color: '#1d5bbd'}}>בהליך משפטי</p>
                <div>
                  <p className="text-[32px] font-black leading-none text-[#2bc9a8]">
                    {tabDatasets.legalProcessTab.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* REST OF PAGE */}
        <div className="max-w-full mx-auto space-y-6 p-6">


          {/* Last Import Indicator */}
          <LastImportIndicator lastImportAt={settings?.last_import_at} isAdmin={isAdmin} />

          {/* Tabs */}
          {isAdmin &&
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('debtors')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'debtors' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
              <Users className="w-4 h-4" />
              חייבים ({tabDatasets.debtorsTab.length})
            </button>
            <button
              onClick={() => setActiveTab('warning')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'warning' ? 'bg-amber-500 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
              <Mail className="w-4 h-4" />
              מכתבי התראה ({tabDatasets.warningTab.length})
            </button>
            <button
              onClick={() => setActiveTab('legal_candidates')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'legal_candidates' ? 'bg-purple-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
              <AlertTriangle className="w-4 h-4" />
              לטיפול משפטי ({tabDatasets.legalCandidatesTab.length})
            </button>
            <button
              onClick={() => setActiveTab('legal_process')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'legal_process' ? 'bg-red-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
              <Scale className="w-4 h-4" />
              בהליך משפטי ({tabDatasets.legalProcessTab.length})
            </button>
            <button
              onClick={() => setActiveTab('next_actions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'next_actions' ? 'bg-orange-500 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
              <CalendarClock className="w-4 h-4" />
              פעולות הבאות ({tabDatasets.nextActionsTab?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'archived' ? 'bg-slate-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
              <Archive className="w-4 h-4" />
              ארכיון ({archivedRecords.length})
            </button>
          </div>
          }

          {/* Tables — לפי טאב פעיל */}
          {(activeTab === 'debtors' || !isAdmin) &&
            <DebtorsTable
              records={tabDatasets.debtorsTab}
              onRowClick={handleRowClick}
              isAdmin={isAdmin}
              settings={settings}
              allStatuses={allStatuses}
              onFilteredDataChange={setFilteredDataset}
              onRecordUpdate={handleRecordUpdate}
              showArchived={false} />
          }

          {isAdmin && activeTab === 'warning' &&
            <DebtorsTable
              records={tabDatasets.warningTab}
              onRowClick={handleRowClick}
              isAdmin={isAdmin}
              settings={settings}
              allStatuses={allStatuses}
              onFilteredDataChange={setFilteredDataset}
              onRecordUpdate={handleRecordUpdate}
              showArchived={false} />
          }

          {isAdmin && activeTab === 'legal_candidates' &&
            <DebtorsTable
              records={tabDatasets.legalCandidatesTab}
              onRowClick={handleRowClick}
              isAdmin={isAdmin}
              settings={settings}
              allStatuses={allStatuses}
              onFilteredDataChange={setFilteredDataset}
              onRecordUpdate={handleRecordUpdate}
              showArchived={false} />
          }

          {isAdmin && activeTab === 'legal_process' &&
            <DebtorsTable
              records={tabDatasets.legalProcessTab}
              onRowClick={handleRowClick}
              isAdmin={isAdmin}
              settings={settings}
              allStatuses={allStatuses}
              onFilteredDataChange={setFilteredDataset}
              onRecordUpdate={handleRecordUpdate}
              showArchived={false} />
          }

          {isAdmin && activeTab === 'next_actions' &&
            <DebtorsTable
              records={tabDatasets.nextActionsTab}
              onRowClick={handleRowClick}
              isAdmin={isAdmin}
              settings={settings}
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