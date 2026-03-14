import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import TableActionsCell from './TableActionsCell';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, X } from "lucide-react";
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
  'חריגה מופרזת': 'bg-red-100 text-red-700 border-red-200'
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
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [apartmentSearch, setApartmentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [autoStatusFilter, setAutoStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('totalDebt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
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
        result = result.filter((r) => !r.legal_status_id);
      } else {
        result = result.filter((r) => r.legal_status_id === legalStatusFilter);
      }
    }

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'apartmentNumber') {
        const aNum = parseInt(normApt(aVal)) || 0;
        const bNum = parseInt(normApt(bVal)) || 0;
        return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
      }

      if (sortField === 'legal_status_id') {
        const aStatus = getLegalStatusForRecord(a);
        const bStatus = getLegalStatusForRecord(b);
        const aName = aStatus?.name || 'zzz';
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

  useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(filteredRecords);
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
  };

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
    <TooltipProvider>
      <div>
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
        <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* TOOLBAR HEADER */}
          <div className="min-h-[58px] flex flex-col md:flex-row md:items-center md:justify-between md:gap-3 px-[18px] py-2 bg-gradient-to-b from-[rgba(252,253,255,0.98)] to-[rgba(246,248,255,0.98)] border-b border-[rgba(231,236,248,0.96)]">
            {/* Title */}
            <div className="hidden md:flex flex-col gap-0.5">
              <p className="text-[12px] font-bold text-[#5f698d]">טבלת חייבים</p>
              <p className="text-[11px] font-medium text-[#9aa5c9]">סה״כ {filteredRecords.length} רשומות</p>
            </div>

            {/* Filters Wrapper */}
            <div className="hidden lg:flex items-center gap-2 flex-wrap">
              {/* Apartment Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a2abc8]" />
                <Input
                  placeholder="מספר דירה..."
                  value={apartmentSearch}
                  onChange={(e) => {setApartmentSearch(e.target.value);setPage(1);}}
                  className="pr-9 w-28 h-[34px] text-[12px] rounded-[10px] border border-[rgba(224,230,246,0.96)] bg-white text-[#687395] placeholder-[#a2abc8] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:border-[#cfd8ff] outline-none"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => {setStatusFilter(v);setPage(1);}}>
                <SelectTrigger className="w-28 h-[34px] text-[12px] rounded-[10px] border border-[rgba(224,230,246,0.96)] bg-white text-[#687395] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent className="rounded-[10px]">
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="תקין">תקין</SelectItem>
                  <SelectItem value="לגבייה מיידית">לגבייה מיידית</SelectItem>
                  <SelectItem value="חריגה מופרזת">חריגה מופרזת</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Button */}
              {(statusFilter !== 'all' || search || apartmentSearch) &&
                <button
                  onClick={clearFilters}
                  className="h-[34px] px-3 rounded-[10px] border border-[rgba(224,230,246,0.96)] bg-white text-[#687395] font-semibold text-[12px] hover:bg-[#f8f9fb] transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              }
            </div>
          </div>

          {/* TABLE HEADER - DESKTOP ONLY */}
          <CardHeader className="hidden lg:block bg-white border-b border-[rgba(231,236,248,0.96)] p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <div></div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Mobile View */}
            <div className="block lg:hidden p-4 space-y-3">
              {paginatedRecords.length === 0 ?
                <div className="text-center py-12">
                  <p className="text-slate-600 font-semibold">לא נמצאו רשומות</p>
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
                  allStatuses={allStatuses}
                />
                )
              }
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200">
                    <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('apartmentNumber')}>
                      מס׳ דירה {sortField === 'apartmentNumber' && <ArrowUpDown className="w-4 h-4 inline ml-1" />}
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-700">שם בעל הדירה</TableHead>
                    <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-700">טלפון</TableHead>
                    <TableHead className="px-4 py-3 text-center text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('totalDebt')}>
                      סה״כ חוב {sortField === 'totalDebt' && <ArrowUpDown className="w-4 h-4 inline ml-1" />}
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('monthlyDebt')}>
                      דמי ניהול {sortField === 'monthlyDebt' && <ArrowUpDown className="w-4 h-4 inline ml-1" />}
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center text-sm font-semibold text-slate-700">מצב משפטי</TableHead>
                    <TableHead className="px-4 py-3 text-center text-sm font-semibold text-slate-700">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.length === 0 ?
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <p className="text-slate-600 font-semibold">לא נמצאו רשומות</p>
                      </TableCell>
                    </TableRow> :
                    paginatedRecords.map((record) =>
                    <TableRow
                      key={record.id}
                      className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer"
                      onClick={() => onRowClick(record)}>
                      <TableCell className="px-4 py-3 text-sm text-slate-700">{record.apartmentNumber}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-700">
                        {record.ownerName?.split(/[\/,]/)[0]?.trim() || '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-700">{formatPhoneForDisplay(getPhonePrimaryForTable(record))}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-semibold text-slate-900 text-center">{formatCurrency(record.totalDebt)}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-semibold text-slate-900 text-center">{formatCurrency(record.monthlyDebt)}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-center">
                        {(() => {
                          const legalStatus = getLegalStatusForRecord(record);
                          return legalStatus ?
                            <Badge className={`${legalStatus.color} rounded-full inline-block`}>
                              {legalStatus.name}
                            </Badge> :
                            <Badge className="bg-slate-100 text-slate-700 rounded-full inline-block">
                              -
                            </Badge>;
                        })()}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <TableActionsCell
                          record={record}
                          isAdmin={isAdmin}
                          showArchived={showArchived}
                          archivingRecords={archivingRecords}
                          onCommentClick={() => setCommentRecord(record)}
                          onWhatsAppClick={() => setWhatsappRecord(record)}
                          onArchiveToggle={handleArchiveToggle}
                        />
                      </TableCell>
                    </TableRow>
                    )
                  }
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 &&
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-white">
                <p className="text-sm text-slate-600">
                  מציג {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredRecords.length)} מתוך {filteredRecords.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}>
                    הקודם
                  </Button>
                  <span className="text-sm font-semibold text-slate-700">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}>
                    הבא
                  </Button>
                </div>
              </div>
            }
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}