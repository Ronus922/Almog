import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import DebtorsTable from '@/components/dashboard/DebtorsTable';
import ApartmentDetailModal from '@/components/dashboard/ApartmentDetailModal';
import { Users, Archive, Mail, Scale, AlertTriangle, CalendarClock, Upload, RefreshCw, CreditCard, Droplets, Flame, Gavel, Zap } from "lucide-react";
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

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.isBase44Admin || currentUser?.roleData?.is_admin === true || currentUser?.accessiblePages === null;

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
    } catch (error) {}
  };
  const handleRecordUpdate = () => {
    setTimeout(() => queryClient.invalidateQueries({ queryKey: ['debtorRecords'] }), 500);
  };

  const handleSync = async () => {
    setSyncing(true); setSyncError(null);
    try {
      const response = await base44.functions.invoke('importBuildingDebtReport', {});
      const data = response.data;
      if (data.ok) {
        try {
          const settingsList = await base44.entities.Settings.list();
          const now = new Date().toISOString();
          if (settingsList.length > 0) { await base44.entities.Settings.update(settingsList[0].id, { last_import_at: now }); }
          else { await base44.entities.Settings.create({ last_import_at: now }); }
        } catch (e) {}
        queryClient.invalidateQueries({ queryKey: ['settings'] });
        queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      } else { setSyncError(data.error || 'שגיאה בסנכרון'); }
    } catch (err) { setSyncError(err?.response?.data?.error || err?.message || 'שגיאה בסנכרון'); }
    finally { setSyncing(false); }
  };

  const importDate = settings?.last_import_at || lastImportAt;
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

  const totalMonthly = records.reduce((s,r) => s + (r.monthlyDebt || 0), 0);
  const totalSpecial = records.reduce((s,r) => s + (r.specialDebt || 0), 0);
  const formatNum = (n) => new Intl.NumberFormat('he-IL').format(Math.round(n));

  const kpiCards = [
    { label: 'חוב דמי ניהול', value: `₪${formatNum(totalMonthly)}`, icon: <CreditCard className="w-5 h-5" />, iconBg: 'bg-purple-100', iconColor: 'text-purple-600', onClick: () => setActiveTab('debtors') },
    { label: 'חוב מים חמים', value: `₪${formatNum(totalSpecial)}`, icon: <Droplets className="w-5 h-5" />, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', onClick: () => setActiveTab('debtors') },
    { label: 'לגבייה מיידית', value: tabDatasets.immediateCollectCount, icon: <Zap className="w-5 h-5" />, iconBg: 'bg-orange-100', iconColor: 'text-orange-600', onClick: () => setActiveTab('debtors') },
    { label: 'מכתבי התראה', value: tabDatasets.warningTab.length, sub: `${tabDatasets.warningTab.length} מכתבים`, icon: <Mail className="w-5 h-5" />, iconBg: 'bg-[#fefaea]', iconColor: 'text-amber-500', onClick: () => setActiveTab('warning') },
    { label: 'לטיפול משפטי', value: tabDatasets.legalCandidatesTab.length, icon: <Flame className="w-5 h-5" />, iconBg: 'bg-red-100', iconColor: 'text-red-500', onClick: () => setActiveTab('legal_candidates') },
    { label: 'הליך משפטי', value: tabDatasets.legalProcessTab.length, icon: <Gavel className="w-5 h-5" />, iconBg: 'bg-[#fee2e2]', iconColor: 'text-slate-700', onClick: () => setActiveTab('legal_process') },
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 overflow-x-hidden" dir="rtl">

        <div className="px-3 md:px-6 pt-4 md:pt-6">
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {kpiCards.map((card, i) => (
                <div key={i} onClick={card.onClick}
                  className="bg-white rounded-2xl p-4 flex flex-col justify-between min-h-[120px] cursor-pointer hover:shadow-lg transition-all relative overflow-hidden border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center ${card.iconColor} flex-shrink-0`}>
                      {card.icon}
                    </div>
                    <span className="text-[18px] font-bold text-slate-700 leading-tight">{card.label}</span>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-2xl md:text-3xl font-black text-slate-900 leading-none">{card.value}</p>
                    {card.sub && <span className="text-xs font-medium text-slate-400">{card.sub}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full space-y-4 md:space-y-6 p-3 md:p-6">

          <div className={`px-5 py-3 rounded-xl border ${barBg[severity]} ${barBorder[severity]}`} dir="rtl">
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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <button onClick={()=>setActiveTab('debtors')} className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all ${activeTab==='debtors'?'bg-blue-600 text-white':'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}><Users className="w-3.5 h-3.5 flex-shrink-0"/><span>חייבים</span><span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab==='debtors'?'bg-white/25 text-white':'bg-blue-100 text-blue-700'}`}>{tabDatasets.debtorsTab.length}</span></button>
            <button onClick={()=>setActiveTab('warning')} className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all ${activeTab==='warning'?'bg-amber-500 text-white':'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}><Mail className="w-3.5 h-3.5 flex-shrink-0"/><span>מכתבי התראה</span><span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab==='warning'?'bg-white/25 text-white':'bg-amber-100 text-amber-700'}`}>{tabDatasets.warningTab.length}</span></button>
            <button onClick={()=>setActiveTab('legal_candidates')} className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all ${activeTab==='legal_candidates'?'bg-purple-600 text-white':'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0"/><span>לטיפול משפטי</span><span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab==='legal_candidates'?'bg-white/25 text-white':'bg-purple-100 text-purple-700'}`}>{tabDatasets.legalCandidatesTab.length}</span></button>
            <button onClick={()=>setActiveTab('legal_process')} className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all ${activeTab==='legal_process'?'bg-red-600 text-white':'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}><Scale className="w-3.5 h-3.5 flex-shrink-0"/><span>הליך משפטי</span><span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab==='legal_process'?'bg-white/25 text-white':'bg-red-100 text-red-700'}`}>{tabDatasets.legalProcessTab.length}</span></button>
            <button onClick={()=>setActiveTab('next_actions')} className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all ${activeTab==='next_actions'?'bg-orange-500 text-white':'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}><CalendarClock className="w-3.5 h-3.5 flex-shrink-0"/><span>פעולות</span><span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab==='next_actions'?'bg-white/25 text-white':'bg-orange-100 text-orange-700'}`}>{tabDatasets.nextActionsTab?.length||0}</span></button>
            <button onClick={()=>setActiveTab('archived')} className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all ${activeTab==='archived'?'bg-slate-600 text-white':'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}><Archive className="w-3.5 h-3.5 flex-shrink-0"/><span>ארכיון</span><span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab==='archived'?'bg-white/25 text-white':'bg-slate-100 text-slate-600'}`}>{archivedRecords.length}</span></button>
          </div>

          {activeTab==='debtors' && <DebtorsTable records={tabDatasets.debtorsTab} onRowClick={handleRowClick} isAdmin={isAdmin} settings={settings} allStatuses={allStatuses} onFilteredDataChange={setFilteredDataset} onRecordUpdate={handleRecordUpdate} showArchived={false}/>}
          {activeTab==='warning' && <DebtorsTable records={tabDatasets.warningTab} onRowClick={handleRowClick} isAdmin={isAdmin} settings={settings} allStatuses={allStatuses} onFilteredDataChange={setFilteredDataset} onRecordUpdate={handleRecordUpdate} showArchived={false}/>}
          {activeTab==='legal_candidates' && <DebtorsTable records={tabDatasets.legalCandidatesTab} onRowClick={handleRowClick} isAdmin={isAdmin} settings={settings} allStatuses={allStatuses} onFilteredDataChange={setFilteredDataset} onRecordUpdate={handleRecordUpdate} showArchived={false}/>}
          {activeTab==='legal_process' && <DebtorsTable records={tabDatasets.legalProcessTab} onRowClick={handleRowClick} isAdmin={isAdmin} settings={settings} allStatuses={allStatuses} onFilteredDataChange={setFilteredDataset} onRecordUpdate={handleRecordUpdate} showArchived={false}/>}
          {activeTab==='next_actions' && <DebtorsTable records={tabDatasets.nextActionsTab} onRowClick={handleRowClick} isAdmin={isAdmin} settings={settings} allStatuses={allStatuses} onFilteredDataChange={setFilteredDataset} onRecordUpdate={handleRecordUpdate} showArchived={false}/>}
          {activeTab==='archived' && <DebtorsTable records={archivedRecords} onRowClick={handleRowClick} isAdmin={isAdmin} settings={settings} allStatuses={allStatuses} onFilteredDataChange={setFilteredDataset} onRecordUpdate={handleRecordUpdate} showArchived={true}/>}

          <ApartmentDetailModal record={selectedRecord} isOpen={isModalOpen} onClose={()=>setIsModalOpen(false)} onSave={handleSaveRecord} isAdmin={isAdmin} settings={settings}/>
        </div>
      </div>
    </TooltipProvider>
  );
}