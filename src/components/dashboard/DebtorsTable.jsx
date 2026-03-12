import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger } from
"@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, X, SlidersHorizontal, Archive, Undo2, MessageCircle, FileText } from "lucide-react";
import WhatsAppDialog from '../whatsapp/WhatsAppDialog';
import QuickCommentDialog from './QuickCommentDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DebtorCard from './DebtorCard';
import { normalizeApartmentNumber } from '../utils/apartmentNormalizer';
import { getPhonePrimaryForTable, formatPhoneForDisplay } from '../utils/phoneDisplay';
import { toast } from 'sonner';

const STATUS_COLORS = {
  'תקין': 'bg-green-100 text-green-700 border-green-200',
  'לגבייה מיידית': 'bg-orange-100 text-orange-700 border-orange-200',
  'חריגה מופרזת': 'bg-[#ff8080] text-white border-[#ff8080]'
};

export default function DebtorsTable({
  records,
  onRowClick,
  isAdmin,
  settings,
  allStatuses = [],
  hideStatusFilter = false,
  initialFilterKey = null,
  initialStatusFilter = null,
  initialAutoStatusFilter = null,
  onFilteredDataChange = null,
  onRecordUpdate = null,
  showArchived = false
}) {
  const [search, setSearch] = useState('');
  const [apartmentSearch, setApartmentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [autoStatusFilter, setAutoStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('totalDebt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [minDebt, setMinDebt] = useState('');
  const [maxDebt, setMaxDebt] = useState('');
  const [ownerNameFilter, setOwnerNameFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [legalStatusFilter, setLegalStatusFilter] = useState('all');
  const [archivingRecords, setArchivingRecords] = useState(new Set());
  const [whatsappRecord, setWhatsappRecord] = useState(null);
  const [commentRecord, setCommentRecord] = useState(null);

  const pageSize = 50;

  // Apply URL filters
  useEffect(() => {
    // Map filterKey to actual filters
    if (initialFilterKey) {
      switch (initialFilterKey) {
        case 'IMMEDIATE_COLLECTION':
          setAutoStatusFilter('לגבייה מיידית');
          break;
        case 'REQUIRES_LEGAL_ACTION':
          setAutoStatusFilter('חריגה מופרזת');
          break;
        case 'LEGAL_PROCESS':{
            const lawsuitStatus = allStatuses.find((s) => s.type === 'LEGAL' && s.name === 'תביעה משפטית');
            if (lawsuitStatus) {
              setLegalStatusFilter(lawsuitStatus.id);
            }
            break;
          }
        case 'WARNING_LETTER':{
            const warningStatus = allStatuses.find((s) => s.type === 'LEGAL' && s.name === 'מכתב התראה');
            if (warningStatus) {
              setLegalStatusFilter(warningStatus.id);
            }
            break;
          }
      }
    } else {
      // Legacy filter support
      if (initialStatusFilter) {
        const matchingStatus = allStatuses.find((s) => s.name === initialStatusFilter);
        if (matchingStatus) {
          setLegalStatusFilter(matchingStatus.id);
        }
      }
      if (initialAutoStatusFilter) {
        setAutoStatusFilter(initialAutoStatusFilter);
      }
    }
  }, [initialFilterKey, initialStatusFilter, initialAutoStatusFilter, allStatuses]);

  const legalStatuses = allStatuses.filter((s) => s.type === 'LEGAL');
  const activeLegalStatuses = legalStatuses.filter((s) => s.is_active);

  const getLegalStatusForRecord = (record) => {
    if (!record.legal_status_id) return null;
    return legalStatuses.find((s) => s.id === record.legal_status_id) || null;
  };

  const formatCurrency = (num) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num || 0);

  const formatPhone = (phone) => {
    if (!phone) return 'אין מספר';
    const cleaned = phone.replace(/\D/g, '');
    if (/^0+$/.test(cleaned)) return 'אין מספר';
    return phone;
  };

  const formatOwnerName = (ownerName) => {
    if (!ownerName) return '-';
    const isTenant = ownerName.includes('/') || ownerName.includes(',');
    const mainName = ownerName.split(/[\/,]/)[0]?.trim() || ownerName;
    return isTenant ? mainName + ' (שוכר)' : mainName;
  };

  const normApt = normalizeApartmentNumber;

  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (apartmentSearch) {
      const normQuery = normApt(apartmentSearch);
      result = result.filter((r) => normApt(r.apartmentNumber).includes(normQuery));
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter((r) =>
      r.apartmentNumber?.toLowerCase().includes(s) ||
      r.ownerName?.toLowerCase().includes(s) ||
      r.phonePrimary?.toLowerCase().includes(s)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((r) => r.debt_status_auto === statusFilter);
    }

    if (autoStatusFilter !== 'all') {
      result = result.filter((r) => r.debt_status_auto === autoStatusFilter);
    }

    if (minDebt !== '') {
      const min = parseFloat(minDebt);
      if (!isNaN(min)) {
        result = result.filter((r) => (r.totalDebt || 0) >= min);
      }
    }
    if (maxDebt !== '') {
      const max = parseFloat(maxDebt);
      if (!isNaN(max)) {
        result = result.filter((r) => (r.totalDebt || 0) <= max);
      }
    }

    if (ownerNameFilter) {
      const s = ownerNameFilter.toLowerCase();
      result = result.filter((r) => r.ownerName?.toLowerCase().includes(s));
    }

    if (phoneFilter) {
      const s = phoneFilter.toLowerCase();
      result = result.filter((r) =>
      r.phonePrimary?.toLowerCase().includes(s) ||
      r.phoneOwner?.toLowerCase().includes(s) ||
      r.phoneTenant?.toLowerCase().includes(s)
      );
    }

    if (legalStatusFilter && legalStatusFilter !== 'all') {
      if (legalStatusFilter === 'null') {
        // פילטר רשומות ללא סטטוס
        result = result.filter((r) => !r.legal_status_id);
      } else {
        result = result.filter((r) => r.legal_status_id === legalStatusFilter);
      }
    }

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // מיון מיוחד למספר דירה - מספרי
      if (sortField === 'apartmentNumber') {
        const aNum = parseInt(normApt(aVal)) || 0;
        const bNum = parseInt(normApt(bVal)) || 0;
        return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // מיון מיוחד למצב משפטי - לפי שם הסטטוס
      if (sortField === 'legal_status_id') {
        const aStatus = getLegalStatusForRecord(a);
        const bStatus = getLegalStatusForRecord(b);
        const aName = aStatus?.name || 'zzz'; // רשומות ללא סטטוס בסוף
        const bName = bStatus?.name || 'zzz';
        return sortDir === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      aVal = aVal || '';
      bVal = bVal || '';
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    return result;
  }, [records, search, apartmentSearch, statusFilter, autoStatusFilter, sortField, sortDir, minDebt, maxDebt, ownerNameFilter, phoneFilter, legalStatusFilter, allStatuses]);

  // Notify parent of filtered data changes
  useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(filteredRecords);
      console.log(`[DebtorsTable] Filtered dataset updated: ${filteredRecords.length} records`);
    }
  }, [filteredRecords, onFilteredDataChange]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const paginatedRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setAutoStatusFilter('all');
    setSearch('');
    setApartmentSearch('');
    setMinDebt('');
    setMaxDebt('');
    setOwnerNameFilter('');
    setPhoneFilter('');
    setLegalStatusFilter('all');
    setPage(1);
    window.history.pushState({}, '', window.location.pathname);
  };

  const clearAdvancedFilters = () => {
    setMinDebt('');
    setMaxDebt('');
    setOwnerNameFilter('');
    setPhoneFilter('');
    setLegalStatusFilter('all');
    setApartmentSearch('');
    setStatusFilter('all');
    setAutoStatusFilter('all');
    setSearch('');
    setPage(1);
  };

  const hasActiveFilters = statusFilter !== 'all' || autoStatusFilter !== 'all' || search !== '' || apartmentSearch !== '';
  const hasAdvancedFilters = minDebt !== '' || maxDebt !== '' || ownerNameFilter !== '' || phoneFilter !== '' || legalStatusFilter !== 'all' || apartmentSearch !== '';

  const handleArchiveToggle = async (record, e) => {
    e.stopPropagation();

    if (archivingRecords.has(record.id)) return;

    setArchivingRecords((prev) => new Set(prev).add(record.id));

    try {
      const { base44 } = await import('@/api/base44Client');
      await base44.entities.DebtorRecord.update(record.id, {
        isArchived: !record.isArchived
      });

      toast.success(showArchived ? 'הוחזר לחייבים' : 'הועבר לארכיון');

      // Call onRecordUpdate to refresh data immediately
      if (onRecordUpdate) {
        onRecordUpdate(record.id);
      }
    } catch (error) {
      console.error('Archive toggle error:', error);
      toast.error('שגיאה בעדכון הרשומה');
    } finally {
      setArchivingRecords((prev) => {
        const next = new Set(prev);
        next.delete(record.id);
        return next;
      });
    }
  };

  return (
    <>
    {whatsappRecord && (
      <WhatsAppDialog
        open={!!whatsappRecord}
        onClose={() => setWhatsappRecord(null)}
        record={whatsappRecord}
      />
    )}
    {commentRecord && (
      <QuickCommentDialog
        open={!!commentRecord}
        onClose={() => setCommentRecord(null)}
        record={commentRecord}
        currentUser={currentUser}
        isAdmin={isAdmin}
      />
    )}
    <TooltipProvider>
    <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
      <CardHeader className="bg-blue-50 pt-4 pb-4 p-6 flex flex-col space-y-1.5 md:pb-6 md:pt-6 from-white to-slate-50 border-b border-slate-200">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl md:text-2xl font-bold text-slate-800">טבלת חייבים</CardTitle>
              <p className="text-sm text-slate-600 mt-1 font-medium">
                סה״כ רשומות: <span className="font-bold text-blue-600">{filteredRecords.length}</span>
              </p>
            </div>
            
            {/* Mobile filters */}
            <div className="flex lg:hidden gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="מספר דירה..."
                    value={apartmentSearch}
                    onChange={(e) => {setApartmentSearch(e.target.value);setPage(1);}}
                    className="pr-10 h-10 rounded-xl border-slate-300 text-sm"
                    inputMode="numeric" />

              </div>
              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
                  <Button
                      variant="outline"
                      size="sm"
                      className="h-10 px-3 rounded-xl"
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        letterSpacing: 0,
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>

                    <SlidersHorizontal className="w-4 h-4" />
                    חיפוש מורחב
                    {(hasActiveFilters || hasAdvancedFilters) &&
                      <span className="mr-1 w-2 h-2 bg-blue-600 rounded-full"></span>
                      }
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 overflow-y-auto" dir="rtl">
                  <SheetHeader>
                    <SheetTitle className="text-right">חיפוש מורחב</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">מספר דירה</label>
                      <Input
                          placeholder="חפש מספר דירה..."
                          value={apartmentSearch}
                          onChange={(e) => {setApartmentSearch(e.target.value);setPage(1);}}
                          className="h-11 rounded-xl text-right"
                          dir="rtl"
                          inputMode="numeric" />

                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">שם בעלים</label>
                      <Input
                          placeholder="חיפוש לפי שם"
                          value={ownerNameFilter}
                          onChange={(e) => {setOwnerNameFilter(e.target.value);setPage(1);}}
                          className="h-11 rounded-xl text-right"
                          dir="rtl" />

                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">טלפון</label>
                      <Input
                          placeholder="חיפוש לפי טלפון"
                          value={phoneFilter}
                          onChange={(e) => {setPhoneFilter(e.target.value);setPage(1);}}
                          className="h-11 rounded-xl text-right"
                          dir="rtl" />

                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">טווח סכום חוב</label>
                      <div className="flex gap-2" dir="rtl">
                        <Input
                            type="number"
                            placeholder="מסכום"
                            value={minDebt}
                            onChange={(e) => {setMinDebt(e.target.value);setPage(1);}}
                            className="h-11 rounded-xl text-right flex-1"
                            dir="rtl" />

                        <Input
                            type="number"
                            placeholder="עד סכום"
                            value={maxDebt}
                            onChange={(e) => {setMaxDebt(e.target.value);setPage(1);}}
                            className="h-11 rounded-xl text-right flex-1"
                            dir="rtl" />

                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">סטטוס חוב</label>
                      <Select value={statusFilter} onValueChange={(v) => {setStatusFilter(v);setPage(1);}}>
                        <SelectTrigger className="w-full h-11 rounded-xl">
                          <SelectValue placeholder="כל הסטטוסים" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all">כל הסטטוסים</SelectItem>
                          <SelectItem value="תקין">תקין</SelectItem>
                          <SelectItem value="לגבייה מיידית">לגבייה מיידית</SelectItem>
                          <SelectItem value="חריגה מופרזת">חריגה מופרזת</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {!hideStatusFilter &&
                      <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">מצב משפטי</label>
                        <Select value={legalStatusFilter} onValueChange={(v) => {setLegalStatusFilter(v);setPage(1);}}>
                          <SelectTrigger className="w-full h-11 rounded-xl">
                            <SelectValue placeholder="כל המצבים" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="all">כל המצבים</SelectItem>
                            <SelectItem value="null">ללא סטטוס</SelectItem>
                            {activeLegalStatuses.map((status) =>
                            <SelectItem key={status.id} value={status.id}>
                                {status.name}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      }

                    <div className="pt-4 flex gap-2">
                      <Button
                          variant="outline"
                          className="flex-1 rounded-xl"
                          onClick={clearFilters}>

                        <X className="w-4 h-4 ml-1" />
                        נקה פילטרים
                      </Button>
                      <Button
                          className="flex-1 rounded-xl"
                          onClick={() => setIsFilterOpen(false)}>

                        סגור
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop filters */}
            <div className="hidden lg:flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                    placeholder="מספר דירה..."
                    value={apartmentSearch}
                    onChange={(e) => {setApartmentSearch(e.target.value);setPage(1);}}
                    className="pr-12 w-40 h-11 rounded-xl border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    inputMode="numeric" />

              </div>

              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                    placeholder="חיפוש שם או טלפון..."
                    value={search}
                    onChange={(e) => {setSearch(e.target.value);setPage(1);}}
                    className="pr-12 w-52 h-11 rounded-xl border-slate-300 focus:border-blue-500 focus:ring-blue-500" />

              </div>

              <Select value={statusFilter} onValueChange={(v) => {setStatusFilter(v);setPage(1);}}>
                <SelectTrigger className="w-44 h-11 rounded-xl border-slate-300">
                  <SelectValue placeholder="כל הסטטוסים" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="תקין">תקין</SelectItem>
                  <SelectItem value="לגבייה מיידית">לגבייה מיידית</SelectItem>
                  <SelectItem value="חריגה מופרזת">חריגה מופרזת</SelectItem>
                </SelectContent>
              </Select>

              <Button
                  variant={showAdvancedFilters ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="h-11 rounded-xl px-4"
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    letterSpacing: 0,
                    minHeight: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>

                <SlidersHorizontal className="w-4 h-4" />
                חיפוש מורחב
                {hasAdvancedFilters &&
                  <span className="mr-2 w-2 h-2 bg-white rounded-full"></span>
                  }
              </Button>

              {(hasActiveFilters || hasAdvancedFilters) &&
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-11 rounded-xl">

                  <X className="w-4 h-4 ml-1" />
                  נקה הכל
                </Button>
                }
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Mobile Card View */}
        <div className="block lg:hidden p-4 space-y-3">
          {paginatedRecords.length === 0 ?
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
                  <Filter className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600 font-semibold text-lg">לא נמצאו רשומות</p>
                <p className="text-sm text-slate-400">נסה לשנות את הפילטרים או את החיפוש</p>
              </div>
            </div> :

            paginatedRecords.map((record) =>
            <DebtorCard
              key={record.id}
              record={record}
              onClick={onRowClick}
              settings={settings}
              isAdmin={isAdmin}
              showArchived={showArchived}
              onArchiveToggle={(rec) => handleArchiveToggle(rec, { stopPropagation: () => {} })}
              allStatuses={allStatuses} />

            )
            }
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <Table className="border-separate border-spacing-0">
            <TableHeader>
              <TableRow className="bg-gradient-to-l from-slate-50 to-slate-100 hover:bg-gradient-to-l border-b-2 border-slate-200">
                <TableHead className="text-right font-bold text-slate-700 text-base py-4 px-6 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('apartmentNumber')}>
                  <div className="flex items-center gap-2 justify-end">
                    <ArrowUpDown className={`w-5 h-5 ${sortField === 'apartmentNumber' ? 'text-blue-600' : 'text-slate-400'}`} />
                    מס׳ דירה
                  </div>
                </TableHead>
                <TableHead className="text-right font-bold text-slate-700 text-base py-4 px-6">שם בעל הדירה</TableHead>
                <TableHead className="text-right font-bold text-slate-700 text-base py-4 px-6">טלפון</TableHead>
                <TableHead className="text-right font-bold text-slate-700 text-base py-4 px-6 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('totalDebt')}>
                  <div className="flex items-center gap-2 justify-end">
                    <ArrowUpDown className={`w-5 h-5 ${sortField === 'totalDebt' ? 'text-blue-600' : 'text-slate-400'}`} />
                    סה״כ חוב
                  </div>
                </TableHead>
                <TableHead className="text-right font-bold text-slate-700 text-base py-4 px-6 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('monthlyDebt')}>
                  <div className="flex items-center gap-2 justify-end">
                    <ArrowUpDown className={`w-5 h-5 ${sortField === 'monthlyDebt' ? 'text-blue-600' : 'text-slate-400'}`} />
                    דמי ניהול
                  </div>
                </TableHead>
                <TableHead className="text-right font-bold text-slate-700 text-base py-4 px-6 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('specialDebt')}>
                  <div className="flex items-center gap-2 justify-end">
                    <ArrowUpDown className={`w-5 h-5 ${sortField === 'specialDebt' ? 'text-blue-600' : 'text-slate-400'}`} />
                    מים חמים
                  </div>
                </TableHead>

                <TableHead className="text-right font-bold text-slate-700 text-base py-4 px-6 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('legal_status_id')}>
                  <div className="flex items-center gap-2 justify-end">
                    <ArrowUpDown className={`w-5 h-5 ${sortField === 'legal_status_id' ? 'text-blue-600' : 'text-slate-400'}`} />
                    מצב משפטי
                  </div>
                </TableHead>
                <TableHead className="text-center font-bold text-slate-700 text-base py-4 px-6" style={{ width: '56px' }}></TableHead>
                {isAdmin && <TableHead className="text-center font-bold text-slate-700 text-base py-4 px-6" style={{ width: '72px' }}>פעולות</TableHead>}
              </TableRow>
              
              {/* Advanced Filter Row */}
              {showAdvancedFilters &&
                <TableRow className="bg-blue-50/50 border-b-2 border-blue-200">
                  <TableHead className="py-3 px-4">
                    <Input
                      placeholder="מספר דירה"
                      value={apartmentSearch}
                      onChange={(e) => {setApartmentSearch(e.target.value);setPage(1);}}
                      className="h-9 rounded-lg text-sm text-right"
                      dir="rtl"
                      inputMode="numeric" />

                  </TableHead>
                  <TableHead className="py-3 px-4">
                    <Input
                      placeholder="שם בעלים"
                      value={ownerNameFilter}
                      onChange={(e) => {setOwnerNameFilter(e.target.value);setPage(1);}}
                      className="h-9 rounded-lg text-sm text-right"
                      dir="rtl" />

                  </TableHead>
                  <TableHead className="py-3 px-4">
                    <Input
                      placeholder="טלפון"
                      value={phoneFilter}
                      onChange={(e) => {setPhoneFilter(e.target.value);setPage(1);}}
                      className="h-9 rounded-lg text-sm text-right"
                      dir="rtl" />

                  </TableHead>
                  <TableHead className="py-3 px-4">
                    <div className="flex gap-2 items-center justify-end" dir="rtl">
                      <Input
                        type="number"
                        placeholder="מסכום"
                        value={minDebt}
                        onChange={(e) => {setMinDebt(e.target.value);setPage(1);}}
                        className="h-9 rounded-lg text-sm w-20 text-right"
                        dir="rtl" />

                      <span className="text-xs text-slate-500">-</span>
                      <Input
                        type="number"
                        placeholder="עד"
                        value={maxDebt}
                        onChange={(e) => {setMaxDebt(e.target.value);setPage(1);}}
                        className="h-9 rounded-lg text-sm w-20 text-right"
                        dir="rtl" />

                    </div>
                  </TableHead>
                  <TableHead className="py-3 px-4"></TableHead>
                  <TableHead className="py-3 px-4"></TableHead>
                  <TableHead className="py-3 px-4">
                    {!hideStatusFilter &&
                    <Select value={legalStatusFilter} onValueChange={(v) => {setLegalStatusFilter(v);setPage(1);}}>
                        <SelectTrigger className="h-9 rounded-lg text-sm">
                          <SelectValue placeholder="הכל" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                          <SelectItem value="all">הכל</SelectItem>
                          <SelectItem value="null">ללא סטטוס</SelectItem>
                          {activeLegalStatuses.map((status) =>
                        <SelectItem key={status.id} value={status.id}>
                              {status.name}
                            </SelectItem>
                        )}
                        </SelectContent>
                      </Select>
                    }
                    </TableHead>
                    <TableHead className="py-3 px-4"></TableHead>
                   {isAdmin && <TableHead className="py-3 px-4"></TableHead>}
                    </TableRow>
                }
              
              {/* Filter Actions Row */}
              {showAdvancedFilters &&
                <TableRow className="bg-blue-50/30 border-b border-blue-200">
                  <TableHead colSpan={isAdmin ? 9 : 8} className="py-3 px-6">
                    <div className="flex items-center justify-end" dir="rtl">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAdvancedFilters}
                        className="h-9 rounded-lg">

                        <X className="w-4 h-4 ml-1" />
                        נקה פילטרים
                      </Button>
                    </div>
                  </TableHead>
                </TableRow>
                }
            </TableHeader>
            <TableBody>
              {paginatedRecords.length === 0 ?
                <TableRow>
                  <TableCell colSpan={isAdmin ? 9 : 8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
                        <Filter className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-600 font-semibold text-lg">לא נמצאו רשומות</p>
                      <p className="text-sm text-slate-400">נסה לשנות את הפילטרים או את החיפוש</p>
                    </div>
                  </TableCell>
                </TableRow> :

                paginatedRecords.map((record, idx) =>
                <TableRow
                  key={record.id}
                  className={`hover:bg-blue-50/50 cursor-pointer transition-all duration-200 border-b-2 border-slate-200 ${idx % 2 === 1 ? 'bg-slate-100' : 'bg-white'}`}
                  onClick={() => onRowClick(record)}>

                    <TableCell className="font-bold text-slate-800 text-base py-6 px-6 align-middle">
                      {record.apartmentNumber}
                    </TableCell>
                    <TableCell className="text-slate-700 text-base py-6 px-6 align-middle">
                      <div className="line-clamp-2 break-words">
                        {record.ownerName ? (
                          <>
                            {record.ownerName.split(/[\/,]/)[0]?.trim() || record.ownerName}
                            {(record.ownerName.includes('/') || record.ownerName.includes(',')) && (
                              <span> (שוכר)</span>
                            )}
                          </>
                        ) : '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-base font-medium text-slate-600 py-6 px-6 align-middle text-right" dir="rtl">
                      {formatPhoneForDisplay(getPhonePrimaryForTable(record))}
                    </TableCell>
                    <TableCell className="py-6 px-6 align-middle text-center">
                      <span className="font-bold text-lg text-rose-600">{formatCurrency(record.totalDebt)}</span>
                    </TableCell>
                    <TableCell className="py-6 px-6 align-middle text-center">
                      <span className="font-bold text-base text-amber-600">{formatCurrency(record.monthlyDebt)}</span>
                    </TableCell>
                    <TableCell className="py-6 px-6 align-middle text-center">
                      <span className="font-bold text-base text-purple-600">{formatCurrency(record.specialDebt)}</span>
                    </TableCell>

                    <TableCell className="py-6 px-6 align-middle text-center">
                      {(() => {
                      const legalStatus = getLegalStatusForRecord(record);

                      return legalStatus ?
                      <Badge className={`${legalStatus.color} min-w-[96px] h-8 px-3 inline-flex items-center justify-center text-sm font-medium whitespace-nowrap transition-all duration-200 hover:opacity-80`}>
                            {legalStatus.name}
                          </Badge> :

                      <Badge className="bg-slate-100 text-slate-500 min-w-[96px] h-8 px-3 inline-flex items-center justify-center text-sm font-medium whitespace-nowrap transition-all duration-200 hover:opacity-80">
                            לא הוגדר
                          </Badge>;

                    })()}
                    </TableCell>
                    <TableCell className="py-6 px-2 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setWhatsappRecord(record)}
                            className="inline-flex items-center justify-center text-green-600 hover:text-green-700 transition-colors">
                            <svg viewBox="0 0 24 24" className="w-[30px] h-[30px]" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12.001 2C6.47813 2 2.00098 6.47715 2.00098 12C2.00098 13.8697 2.50415 15.6229 3.38687 17.1283L2.04492 21.9551L6.97168 20.6367C8.43179 21.4302 10.1614 21.9 12.001 21.9C17.5239 21.9 21.999 17.4249 21.999 11.9C22.001 6.47715 17.5239 2 12.001 2ZM12.001 20.1C10.3044 20.1 8.72168 19.6163 7.38477 18.7852L7.09961 18.6133L4.19629 19.3936L4.99121 16.5635L4.80176 16.2637C3.88672 14.8857 3.40283 13.2588 3.40283 11.5977C3.40283 6.97949 7.18457 3.19727 12.001 3.19727C16.8174 3.19727 20.5991 6.97949 20.5991 11.5977C20.5991 16.2163 16.8174 20 12.001 20.1ZM16.6025 14.0508C16.3525 13.9258 15.1025 13.3008 14.8525 13.2258C14.6025 13.1258 14.4275 13.1008 14.2525 13.3508C14.0775 13.6008 13.5775 14.1758 13.4275 14.3508C13.2775 14.5258 13.1025 14.5508 12.8525 14.4258C12.6025 14.3008 11.7275 14.0008 10.7025 13.1008C9.90254 12.4008 9.37754 11.5258 9.22754 11.2758C9.07754 11.0258 9.21254 10.9008 9.33754 10.7758C9.45254 10.6508 9.58754 10.5008 9.71254 10.3508C9.83754 10.2008 9.87754 10.1008 9.97754 9.92578C10.0775 9.75078 10.0275 9.60078 9.96504 9.47578C9.90254 9.35078 9.37754 8.10078 9.15254 7.57578C8.92754 7.07578 8.70254 7.12578 8.52754 7.12578C8.37754 7.12578 8.20254 7.10078 8.02754 7.10078C7.85254 7.10078 7.57754 7.16328 7.32754 7.41328C7.07754 7.66328 6.40234 8.28828 6.40234 9.53828C6.40234 10.7883 7.35254 12.0008 7.47754 12.1758C7.60254 12.3508 9.37754 15.1008 12.1275 16.1758C12.8775 16.4758 13.4525 16.6508 13.9025 16.7758C14.6525 17.0008 15.3275 16.9758 15.8525 16.9133C16.4275 16.8383 17.6275 16.3008 17.8525 15.7258C18.0775 15.1508 18.0775 14.6508 18.0025 14.5508C17.9275 14.4508 17.7775 14.3883 17.5275 14.2633L16.6025 14.0508Z"/>
                            </svg>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent><p>שלח וואטסאפ</p></TooltipContent>
                      </Tooltip>
                    </TableCell>
                    {isAdmin &&
                  <TableCell className="py-6 px-6 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                          onClick={(e) => handleArchiveToggle(record, e)}
                          disabled={archivingRecords.has(record.id)}
                          className="inline-flex items-center justify-center text-slate-600 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">

                              {showArchived ?
                          <Undo2 className="w-4 h-4" strokeWidth={2} /> :

                          <Archive className="w-4 h-4" strokeWidth={2} />
                          }
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{showArchived ? 'החזר לחייבים' : 'העבר לארכיון'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                  }
                    </TableRow>
                )
                }
                    </TableBody>
                    </Table>
                    </div>

        {totalPages > 1 &&
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 md:px-6 py-4 border-t bg-gradient-to-l from-slate-50 to-white">
            <p className="text-xs md:text-sm text-slate-600 font-medium">
              מציג {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredRecords.length)} מתוך {filteredRecords.length} רשומות
            </p>
            <div className="flex items-center gap-2 md:gap-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-9 md:h-10 px-3 md:px-4"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}>

                <ChevronRight className="w-4 h-4 ml-1" />
                <span className="hidden sm:inline">הקודם</span>
              </Button>
              <span className="text-xs md:text-sm font-bold text-slate-700 bg-slate-100 px-3 md:px-4 py-2 rounded-xl whitespace-nowrap">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-9 md:h-10 px-3 md:px-4"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}>

                <span className="hidden sm:inline">הבא</span>
                <ChevronLeft className="w-4 h-4 mr-1" />
              </Button>
            </div>
          </div>
          }
      </CardContent>
    </Card>
    </TooltipProvider>
    </>
  );

}