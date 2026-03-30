import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import DebtorsTable from '@/components/dashboard/DebtorsTable';
import ApartmentDetailModal from '@/components/dashboard/ApartmentDetailModal';
import { Users, Archive, Mail, Scale, AlertTriangle, CalendarClock, Upload, RefreshCw } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { calculateDebtStatus } from '@/components/utils/debtStatusCalculator';
import { getUniqueDebtorRecords } from '@/components/utils/debtorFilters';
import { createPageUrl } from '@/utils';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('debtors');
  const [filteredDataset, setFilteredDataset] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.isBase44Admin;

  const { data: rawRecords = [] } = useQuery({
    queryKey: ['debtorRecords'],
    queryFn: () => base44.entities.DebtorRecord.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const records = useMemo(() => getUniqueDebtorRecords(rawRecords), [rawRecords]);

  const lastImportAt = useMemo(() => {
    if (records.length === 0) return null;
    return records.reduce((latest, r) => {
      const d = r.lastImportAt || r.last_import_at || r.updated_date;
      return d && d > latest ? d : latest;
    }, '');
  }, [records]);

  useEffect(() => {
    const unsubscribeDebtor = base44.entities.DebtorRecord.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
    });
    const unsubscribeContact = base44.entities.Contact.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
    });
    return () => { unsubscribeDebtor(); unsubscribeContact(); };
  }, [queryClient]);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const settingsList = await base44.entities.Settings.list();
      return settingsList[0] || { threshold_ok_max: 1000, threshold_collect_from: 1500, threshold_legal_from: 5000 };
    }
  });

  const { data: allStatuses = [], refetch: refetchStatuses } = useQuery({
    queryKey: ['allStatuses'],
    queryFn: () => base44.entities.Status.list()
  });

  const [statusesReady, setStatusesReady] = useState(false);

  useEffect(() => {
    if (allStatuses.length === 0) return;
    const requiredStatuses = [
      { name: 'מכתב התראה', color: 'bg-amber-100 text-amber-800' },
      { name: 'לטיפול משפטי', color: 'bg-purple-100 text-purple-800' },
      { name: 'בהליך משפטי', color: 'bg-red-100 text-red-800' },
    ];
    const legalStatuses = allStatuses.filter((s) => s.type === 'LEGAL');
    const missing = requiredStatuses.filter((req) => !legalStatuses.find((s) => s.name === req.name));
    if (missing.length === 0) { setStatusesReady(true); return; }
    Promise.all(missing.map((req) => base44.entities.Status.create({ name: req.name, type: 'LEGAL', color: req.color, is_active: true, is_default: false }))).then(() => { refetchStatuses(); setStatusesReady(true); });
  }, [allStatuses]);

  const tabDatasets = useMemo(() => {
    const legalStatusList = allStatuses.filter((s) => s.type === 'LEGAL');
    const getStatusId = (name) => legalStatusList.find((s) => s.name === name)?.id || null;
    const warningId = getStatusId('מכתב התראה');
    const legalProcessId = getStatusId('בהליך משפטי');
    const legalCandidatesId = getStatusId('לטיפול משפטי');
    const archived = records.filter((r) => r.isArchived === true);
    const active = records.filter((r) => !r.isArchived);
    const warningTab = active.filter((r) => warningId && r.legal_status_id === warningId);
    const legalCandidatesTab = active.filter((r) => legalCandidatesId && r.legal_status_id === legalCandidatesId);
    const legalProcessTab = active.filter((r) => legalProcessId && r.legal_status_id === legalProcessId);
    const legalTabStatusIds = new Set([warningId, legalProcessId, legalCandidatesId].filter(Boolean));
    const debtorsTab = active.filter((r) => !r.legal_status_id || !legalTabStatusIds.has(r.legal_status_id));
    const nextActionsTab = active.filter((r) => r.nextActionDate).sort((a, b) => new Date(a.nextActionDate) - new Date(b.nextActionDate));
    const calcStatus = (r) => settings ? calculateDebtStatus(r.totalDebt, settings) : r.debt_status_auto;
    const excessiveDebtCount = active.filter((r) => calcStatus(r) === 'חריגה מופרזת').length;
    const immediateCollectCount = active.filter((r) => calcStatus(r) === 'לגבייה מיידית').length;
    return { warningTab, legalCandidatesTab, legalProcessTab, debtorsTab, archived, nextActionsTab, excessiveDebtCount, immediateCollectCount };
  }, [records, allStatuses, settings]);

  const archivedRecords = tabDatasets.archived;

  const handleRowClick = (record) => { setSelectedRecord(record); setIsModalOpen(true); };
  const handleSaveRecord = async (updatedRecord) => {
    try {
      await base44.entities.DebtorRecord.update(updatedRecord.id, updatedRecord);
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      setIsModalOpen(false); setSelectedRecord(null);
    } catch (error) { console.error('Error saving record:', error); }
  };
  const handleRecordUpdate = () => { queryClient.invalidateQueries({ queryKey: ['debtorRecords'] }); };

  const handleSync = async () => {
    setSyncing(true); setSyncError(null);
    try {
      const res = await fetch('https://crm.bios.co.il/api/admin/jobs/syncBllinkDebt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data.ok) {
        try {
          const settingsList = await base44.entities.Settings.list();
          const now = new Date().toISOString();
          if (settingsList.length > 0) { await base44.entities.Settings.update(settingsList[0].id, { last_import_at: now }); }
          else { await base44.entities.Settings.create({ last_import_at: now }); }
        } catch (e) {}
        window.location.reload();
      } else { setSyncError(data.error || 'שגיאה בסנכרון'); }
    } catch (err) { setSyncError('שגיאה בסנכרון'); }
    finally { setSyncing(false); }
  };

  const importDate = lastImportAt || settings?.last_import_at;
  const nowMs = Date.now();
  const lastMs = importDate ? new Date(importDate).getTime() : null;
  const noDate = !importDate || isNaN(lastMs);
  const hoursSince = noDate ? null : (nowMs - lastMs) / (1000 * 60 * 60);
  let severity = 'ok';
  if (noDate) severity = 'red';
  else if (hoursSince >= 48) severity = 'red';
  else if (hoursSince >= 24) severity = 'yellow';
  const barBg = { ok: 'bg-white', yellow: 'bg-[#fef9c3]', red: 'bg-[#fee2e2]' };
  const barBorder = { ok: 'border-slate-200', yellow: 'border-yellow-300', red: 'border-red-300' };
  const formattedDate = noDate ? '—' : new Date(importDate).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date(importDate).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const showWarning = (hoursSince !== null && hoursSince >= 24) || noDate;

  return (
    <TooltipProvider>
      <style>{`
        .kpi-card-glow { position: relative; overflow: hidden; }
        .kpi-card-glow::before { content: ''; position: absolute; top: -50%; right: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%); animation: float 6s ease-in-out infinite; pointer-events: none; }
        @keyframes float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-10px, -10px); } }
        .hero-glow { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.35; mix-blend-mode: screen; }
        .hero-glow-1 { width: 400px; height: 400px; background: #a8d4ff; top: -100px; right: -150px; }
        .hero-glow-2 { width: 350px; height: 350px; background: #d8bcff; bottom: -120px; left: -100px; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 overflow-x-hidden" dir="rtl">
        <section className="relative m-2 md:m-6 rounded-2xl md:rounded-3xl bg-gradient-to-b from-[#f5f7ff] to-[#edf2ff] border border-[rgba(184,198,245,0.60)] shadow-[0_24px_70px_rgba(109,132,220,0.14),0_8px_24px_rgba(160,180,255,0.10),inset_0_1px_0_rgba(255,255,255,0.95)] overflow-hidden">
          <div className="relative min-h-[100px] md:min-h-[148px] pt-4 pr-4 md:pt-5 md:pr-[34px] md:pl-[34px] pl-4 pb-4 md:pb-[26px] bg-gradient-to-br from-[rgba(187,234,255,0.40)] via-[rgba(217,230,255,0.33)] to-[rgba(239,230,255,0.28)] overflow-hidden">
            <div className="hero-glow hero-glow-1"></div>
            <div className="hero-glow hero-glow-2"></div>
            <div className="relative z-2">
              <h1 className="text-2xl md:text-[44px] font-black leading-[1.05] text-[#2f3969] text-right">דשבורד חייבים</h1>
              <p className="mt-1.5 text-[13px] font-medium text-[#96a1c6] text-right">ניהול וניטור מלא של חייבים בנכסים</p>
            </div>
          </div>
          <div className="-mt-2 md:-mt-4 px-3 md:px-[26px] pb-4 md:pb-6 relative z-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
              <div className="kpi-card-glow min-h-[80px] md:min-h-[108px] rounded-[16px] md:rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-3 md:p-4 flex flex-col justify-between">
                <p className="text-[14px] md:text-[18px] font-black uppercase" style={{color:'#1d5bbd'}}>סה״כ חוב</p>
                <div><p className="text-[24px] md:text-[32px] font-black leading-none text-[#2bc9a8]">{new Intl.NumberFormat('he-IL',{notation:'compact',maximumFractionDigits:0}).format(records.reduce((s,r)=>s+(r.totalDebt||0),0))}</p></div>
              </div>
              <div className="kpi-card-glow min-h-[80px] md:min-h-[108px] rounded-[16px] md:rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-3 md:p-4 flex flex-col justify-between">
                <p className="text-[14px] md:text-[18px] font-black uppercase" style={{color:'#1d5bbd'}}>דמי ניהול</p>
                <div><p className="text-[24px] md:text-[32px] font-black leading-none text-[#6270ff]">{new Intl.NumberFormat('he-IL',{notation:'compact',maximumFractionDigits:0}).format(records.reduce((s,r)=>s+(r.monthlyDebt||0),0))}</p></div>
              </div>
              <div className="kpi-card-glow min-h-[80px] md:min-h-[108px] rounded-[16px] md:rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-3 md:p-4 flex flex-col justify-between">
                <p className="text-[14px] md:text-[18px] font-black uppercase" style={{color:'#1d5bbd'}}>מים חמים</p>
                <div><p className="text-[24px] md:text-[32px] font-black leading-none text-[#f5a623]">{new Intl.NumberFormat('he-IL',{notation:'compact',maximumFractionDigits:0}).format(records.reduce((s,r)=>s+(r.specialDebt||0),0))}</p></div>
              </div>
              <div className="kpi-card-glow min-h-[80px] md:min-h-[108px] rounded-[16px] md:rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-3 md:p-4 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all" onClick={()=>setActiveTab('debtors')}>
                <p className="text-[14px] md:text-[18px] font-black uppercase" style={{color:'#1d5bbd'}}>לגבייה מיידית</p>
                <div><p className="text-[24px] md:text-[32px] font-black leading-none text-[#ff7a5c]">{tabDatasets.immediateCollectCount}</p></div>
              </div>
              <div className="kpi-card-glow min-h-[80px] md:min-h-[108px] rounded-[16px] md:rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-3 md:p-4 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all" onClick={()=>setActiveTab('debtors')}>
                <p className="text-[14px] md:text-[18px] font-black uppercase" style={{color:'#1d5bbd'}}>חריגה מופרזת</p>
                <div><p className="text-[24px] md:text-[32px] font-black leading-none text-[#ff3b3b]">{tabDatasets.excessiveDebtCount}</p></div>
              </div>
              <div className="kpi-card-glow min-h-[80px] md:min-h-[108px] rounded-[16px] md:rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-3 md:p-4 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all" onClick={()=>setActiveTab('warning')}>
                <p className="text-[14px] md:text-[18px] font-black uppercase" style={{color:'#1d5bbd'}}>מכתבי התראה</p>
                <div><p className="text-[24px] md:text-[32px] font-black leading-none text-[#ffa500]">{tabDatasets.warningTab.length}</p></div>
              </div>
              <div className="kpi-card-glow min-h-[80px] md:min-h-[108px] rounded-[16px] md:rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-3 md:p-4 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all" onClick={()=>setActiveTab('legal_candidates')}>
                <p className="text-[14px] md:text-[18px] font-black uppercase" style={{color:'#1d5bbd'}}>לטיפול משפטי</p>
                <div><p className="text-[24px] md:text-[32px] font-black leading-none text-[#5b6cff]">{tabDatasets.legalCandidatesTab.length}</p></div>
              </div>
              <div className="kpi-card-glow min-h-[80px] md:min-h-[108px] rounded-[16px] md:rounded-[20px] bg-[rgba(255,255,255,0.90)] backdrop-blur-[12px] border border-[rgba(225,231,248,0.96)] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] p-3 md:p-4 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all" onClick={()=>setActiveTab('legal_process')}>
                <p className="text-[14px] md:text-[18px] font-black uppercase" style={{color:'#1d5bbd'}}>בהליך משפטי</p>
                <div><p className="text-[24px] md:text-[32px] font-black leading-none text-[#2bc9a8]">{tabDatasets.legalProcessTab.length}</p></div>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full space-y-4 md:space-y-6 p-3 md:p-6">

          {/* Import Status Bar */}
          <div className={`mb-6 px-5 py-3 rounded-xl border ${barBg[severity]} ${barBorder[severity]}`} dir="rtl">
            <div className="flex flex-row items-center justify-between gap-4">
              <div className="flex-1 text-right">
                <div className="text-slate-900 font-black" style={{fontSize:'16px'}}>העדכון האחרון בוצע: {formattedDate}</div>
                {hoursSince !== null && hoursSince >= 48 && !noDate && <div className="mt-0.5 text-sm text-red-700 font-medium">הנתונים לא עודכנו ב־48 השעות האחרונות – מומלץ לבצע ייבוא</div>}
                {hoursSince !== null && hoursSince >= 24 && hoursSince < 48 && !noDate && <div className="mt-0.5 text-sm text-yellow-800 font-medium">הנתונים לא עודכנו ב־24 השעות האחרונות – מומלץ לבצע ייבוא</div>}
                {noDate && <div className="mt-0.5 text-sm text-red-700 font-semibold">נדרש לייבא נתונים מעדכניים</div>}
                {syncError && <div className="mt-0.5 text-sm text-red-600 font-medium">{syncError}</div>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isAdmin && <Button onClick={handleSync} disabled={syncing} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 rounded-lg font-bold text-sm gap-2"><RefreshCw className={`w-4 h-4 ${syncing?'animate-spin':''}`}/>{syncing?'מסנכרן...':'סנכרן עכשיו'}</Button>}
                {isAdmin && showWarning && <Button onClick={()=>navigate(createPageUrl('Import'))} className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-lg font-bold text-sm gap-2"><Upload className="w-4 h-4"/>ייבוא נתונים</Button>}
              </div>
            </div>
          </div>

          {isAdmin && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <button onClick={()=>setActiveTab('debtors')} className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all ${activeTab==='debtors'?'bg-blue-600 text-white':'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}><Users className="w-3.5 h-3.5 flex-shrink-0"/><span>חייבים</span><span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab==='debtors'?'bg-white/25 text-white':'bg-blue-100 text-blue-700'}`}>{tabDatasets.debtorsTab.length}</span></button>
            <button onClick={()=>setActiveTab('warning')} className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all ${activeTab==='warning'?'bg-amber-500 text-white':'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}><Mail className="w-3.5 h-3.5 flex-shrink-0"/><span>מכתבי התראה</span><span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab==='warning'?'bg-white/25 text-white':'bg-amber-100 text-amber-700'}`}>{tabDatasets.warningTab.length}</span></button>
            <button onClick={()=>setActiveTab('legal_candidates')} className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all ${activeTab==='legal_candidates'?'bg-purple-600 text-white':'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0"/><span>לטיפול משפטי</span><span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab==='legal_candidates'?'bg-white/25 text-white':'bg-purple-100 text-purple-700'}`}>{tabDatasets.legalCandidatesTab.length}</span></button>
            <button onClick={()=>setActiveTab('legal_process')} className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all ${activeTab==='legal_process'?'bg-red-600 text-white':'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}><Scale className="w-3.5 h-3.5 flex-shrink-0"/><span>הליך משפטי</span><span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab==='legal_process'?'bg-white/25 text-white':'bg-red-100 text-red-700'}`}>{tabDatasets.legalProcessTab.length}</span></button>
            <button onClick={()=>setActiveTab('next_actions')} className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all ${activeTab==='next_actions'?'bg-orange-500 text-white':'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}><CalendarClock className="w-3.5 h-3.5 flex-shrink-0"/><span>פעולות</span><span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab==='next_actions'?'bg-white/25 text-white':'bg-orange-100 text-orange-700'}`}>{tabDatasets.nextActionsTab?.length||0}</span></button>
            <button onClick={()=>setActiveTab('archived')} className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all ${activeTab==='archived'?'bg-slate-600 text-white':'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}><Archive className="w-3.5 h-3.5 flex-shrink-0"/><span>ארכיון</span><span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab==='archived'?'bg-white/25 text-white':'bg-slate-100 text-slate-600'}`}>{archivedRecords.length}</span></button>
          </div>}

          {(activeTab==='debtors'||!isAdmin) && <DebtorsTable records={tabDatasets.debtorsTab} onRowClick={handleRowClick} isAdmin={isAdmin} settings={settings} allStatuses={allStatuses} onFilteredDataChange={setFilteredDataset} onRecordUpdate={handleRecordUpdate} showArchived={false}/>}
          {isAdmin && activeTab==='warning' && <DebtorsTable records={tabDatasets.warningTab} onRowClick={handleRowClick} isAdmin={isAdmin} settings={settings} allStatuses={allStatuses} onFilteredDataChange={setFilteredDataset} onRecordUpdate={handleRecordUpdate} showArchived={false}/>}
          {isAdmin && activeTab==='legal_candidates' && <DebtorsTable records={tabDatasets.legalCandidatesTab} onRowClick={handleRowClick} isAdmin={isAdmin} settings={settings} allStatuses={allStatuses} onFilteredDataChange={setFilteredDataset} onRecordUpdate={handleRecordUpdate} showArchived={false}/>}
          {isAdmin && activeTab==='legal_process' && <DebtorsTable records={tabDatasets.legalProcessTab} onRowClick={handleRowClick} isAdmin={isAdmin} settings={settings} allStatuses={allStatuses} onFilteredDataChange={setFilteredDataset} onRecordUpdate={handleRecordUpdate} showArchived={false}/>}
          {isAdmin && activeTab==='next_actions' && <DebtorsTable records={tabDatasets.nextActionsTab} onRowClick={handleRowClick} isAdmin={isAdmin} settings={settings} allStatuses={allStatuses} onFilteredDataChange={setFilteredDataset} onRecordUpdate={handleRecordUpdate} showArchived={false}/>}
          {isAdmin && activeTab==='archived' && <DebtorsTable records={archivedRecords} onRowClick={handleRowClick} isAdmin={isAdmin} settings={settings} allStatuses={allStatuses} onFilteredDataChange={setFilteredDataset} onRecordUpdate={handleRecordUpdate} showArchived={true}/>}

          <ApartmentDetailModal record={selectedRecord} isOpen={isModalOpen} onClose={()=>setIsModalOpen(false)} onSave={handleSaveRecord} isAdmin={isAdmin} settings={settings}/>
        </div>
      </div>
    </TooltipProvider>
  );
}
