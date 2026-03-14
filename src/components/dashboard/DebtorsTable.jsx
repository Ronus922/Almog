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
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, X, Download, FileText, Printer } from "lucide-react";
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
        {whatsappRecord &&
        <WhatsAppDialog
          open={!!whatsappRecord}
          onClose={() => setWhatsappRecord(null)}
          record={whatsappRecord} />

        }
        {commentRecord &&
        <QuickCommentDialog
          open={!!commentRecord}
          onClose={() => setCommentRecord(null)}
          record={commentRecord}
          currentUser={currentUser}
          isAdmin={isAdmin} />

        }
        <Card className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-200 p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-800">טבלת חייבים</CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    סה״כ {filteredRecords.length} רשומות
                  </p>
                </div>

                {/* Search and Filters */}
                <div className="hidden lg:flex flex-wrap items-center gap-3">
                  {/* Apartment Search */}
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="מספר דירה..."
                      value={apartmentSearch}
                      onChange={(e) => {setApartmentSearch(e.target.value);setPage(1);}}
                      className="pr-10 w-40 h-10 rounded-lg border-slate-300" />

                  </div>

                  {/* Min/Max Debt */}
                  






                  







                  {/* Legal Status Filter */}
                  <Select value={legalStatusFilter} onValueChange={(v) => {setLegalStatusFilter(v);setPage(1);}}>
                    <SelectTrigger className="w-44 h-10 rounded-lg border-slate-300">
                      <SelectValue placeholder="מצב משפטי" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="all">כל המצבים</SelectItem>
                      <SelectItem value="null">ללא סטטוס משפטי</SelectItem>
                      {activeLegalStatuses.map((status) =>
                      <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  {/* Phone Filter */}
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="חיפוש טלפון..."
                      value={phoneFilter}
                      onChange={(e) => {setPhoneFilter(e.target.value);setPage(1);}}
                      className="pr-10 w-40 h-10 rounded-lg border-slate-300" />

                  </div>

                  {/* Status Auto Filter */}
                  <Select value={statusFilter} onValueChange={(v) => {setStatusFilter(v);setPage(1);}}>
                    <SelectTrigger className="w-44 h-10 rounded-lg border-slate-300">
                      <SelectValue placeholder="כל הסטטוסים" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="all">כל הסטטוסים</SelectItem>
                      <SelectItem value="תקין">תקין</SelectItem>
                      <SelectItem value="לגבייה מיידית">לגבייה מיידית</SelectItem>
                      <SelectItem value="חריגה מופרזת">חריגה מופרזת</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Clear Button */}
                  {(statusFilter !== 'all' || search || apartmentSearch || minDebt || maxDebt || legalStatusFilter !== 'all' || phoneFilter) &&
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-10">
                      <X className="w-4 h-4 ml-1" />
                      נקה
                    </Button>
                  }

                  {/* Action Icons */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="p-2 hover:bg-slate-100 rounded">
                          <Download className="w-4 h-4 text-slate-600" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>ייצוא לאקסל</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="p-2 hover:bg-slate-100 rounded">
                          <FileText className="w-4 h-4 text-slate-600" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>ייצוא ל-PDF</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="p-2 hover:bg-slate-100 rounded">
                          <Printer className="w-4 h-4 text-slate-600" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>הדפסה</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
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
                allStatuses={allStatuses} />

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
                    <TableHead className="px-4 py-3 text-center text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('specialDebt')}>
                      מים חמים {sortField === 'specialDebt' && <ArrowUpDown className="w-4 h-4 inline ml-1" />}
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
                       <TableCell className="px-4 py-3 text-sm text-slate-700 font-semibold">{record.apartmentNumber}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-700">
                        {record.ownerName?.split(/[\/,]/)[0]?.trim() || '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-700">{formatPhoneForDisplay(getPhonePrimaryForTable(record))}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-semibold text-slate-900 text-center">{formatCurrency(record.totalDebt)}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-semibold text-slate-900 text-center">{formatCurrency(record.monthlyDebt)}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-semibold text-slate-900 text-center">{formatCurrency(record.specialDebt)}</TableCell>
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
                        onArchiveToggle={handleArchiveToggle} />

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
    </TooltipProvider>);

}