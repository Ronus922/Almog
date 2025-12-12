import React, { useState, useMemo } from 'react';
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
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Filter, ArrowUpDown, Eye, ChevronLeft, ChevronRight, X, SlidersHorizontal } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DebtorCard from './DebtorCard';

const STATUS_COLORS = {
  'סדיר': 'bg-green-100 text-green-700 border-green-200',
  'חייב': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'חייב משמעותי': 'bg-orange-100 text-orange-700 border-orange-200',
  'מועמד לתביעה': 'bg-slate-100 text-slate-700 border-slate-200',
  'בתביעה': 'bg-red-100 text-red-700 border-red-200',
  'בהסדר': 'bg-blue-100 text-blue-700 border-blue-200'
};

export default function DebtorsTable({ records, onRowClick, isAdmin }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [debtFilter, setDebtFilter] = useState('all');
  const [sortField, setSortField] = useState('totalDebt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const pageSize = 50;

  const formatCurrency = (num) => 
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num || 0);

  const formatPhone = (phone) => {
    if (!phone) return 'אין מספר';
    const cleaned = phone.replace(/\D/g, '');
    if (/^0+$/.test(cleaned)) return 'אין מספר';
    return phone;
  };

  const filteredRecords = useMemo(() => {
    let result = [...records];

    // חיפוש כללי
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => 
        r.apartmentNumber?.toLowerCase().includes(s) ||
        r.ownerName?.toLowerCase().includes(s) ||
        r.phonePrimary?.toLowerCase().includes(s)
      );
    }

    // סינון סטטוס
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }

    // סינון חוב
    if (debtFilter === 'special') {
      result = result.filter(r => (r.specialDebt || 0) > 0);
    } else if (debtFilter === 'above1000') {
      result = result.filter(r => (r.totalDebt || 0) >= 1000);
    } else if (debtFilter === 'above5000') {
      result = result.filter(r => (r.totalDebt || 0) >= 5000);
    }

    // מיון
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      aVal = aVal || '';
      bVal = bVal || '';
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    return result;
  }, [records, search, statusFilter, debtFilter, sortField, sortDir]);

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

  return (
    <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
      <CardHeader className="pb-6 pt-6 bg-gradient-to-l from-white to-slate-50 border-b border-slate-200">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-2xl font-bold text-slate-800">טבלת חייבים</CardTitle>
            
            <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="חיפוש לפי דירה, שם או טלפון..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pr-12 w-64 h-11 rounded-xl border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44 h-11 rounded-xl border-slate-300">
                <SelectValue placeholder="כל הסטטוסים" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="סדיר">סדיר</SelectItem>
                <SelectItem value="חייב">חייב</SelectItem>
                <SelectItem value="חייב משמעותי">חייב משמעותי</SelectItem>
                <SelectItem value="מועמד לתביעה">מועמד לתביעה</SelectItem>
                <SelectItem value="בתביעה">בתביעה</SelectItem>
                <SelectItem value="בהסדר">בהסדר</SelectItem>
              </SelectContent>
            </Select>

            <Select value={debtFilter} onValueChange={(v) => { setDebtFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44 h-11 rounded-xl border-slate-300">
                <SelectValue placeholder="כל החובות" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">כל החובות</SelectItem>
                <SelectItem value="above1000">מעל ₪1,000</SelectItem>
                <SelectItem value="above5000">מעל ₪5,000</SelectItem>
                <SelectItem value="special">חוב מיוחד בלבד</SelectItem>
              </SelectContent>
            </Select>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Mobile Card View */}
        <div className="block lg:hidden p-4 space-y-3">
          {paginatedRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
                  <Filter className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600 font-semibold text-lg">לא נמצאו רשומות</p>
                <p className="text-sm text-slate-400">נסה לשנות את הפילטרים או את החיפוש</p>
              </div>
            </div>
          ) : (
            paginatedRecords.map((record) => (
              <DebtorCard key={record.id} record={record} onClick={onRowClick} />
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <Table className="border-separate border-spacing-0">
            <TableHeader>
              <TableRow className="bg-gradient-to-l from-slate-50 to-slate-100 hover:bg-gradient-to-l border-b-2 border-slate-200">
                <TableHead className="text-right font-bold text-slate-700 text-base py-4 px-6">מס׳ דירה</TableHead>
                <TableHead className="text-right font-bold text-slate-700 text-base py-4 px-6">שם בעל הדירה</TableHead>
                <TableHead className="text-right font-bold text-slate-700 text-base py-4 px-6">טלפון</TableHead>
                <TableHead className="text-right font-bold text-slate-700 text-base py-4 px-6 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('totalDebt')}>
                  <div className="flex items-center gap-2 justify-end">
                    <ArrowUpDown className={`w-5 h-5 ${sortField === 'totalDebt' ? 'text-rose-600' : 'text-slate-400'}`} />
                    סה״כ חוב
                  </div>
                </TableHead>
                <TableHead className="text-right font-bold text-slate-700 text-base py-4 px-6 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('monthlyDebt')}>
                  <div className="flex items-center gap-2 justify-end">
                    <ArrowUpDown className={`w-5 h-5 ${sortField === 'monthlyDebt' ? 'text-amber-600' : 'text-slate-400'}`} />
                    חוב חודשי
                  </div>
                </TableHead>
                <TableHead className="text-right font-bold text-slate-700 text-base py-4 px-6 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('specialDebt')}>
                  <div className="flex items-center gap-2 justify-end">
                    <ArrowUpDown className={`w-5 h-5 ${sortField === 'specialDebt' ? 'text-purple-600' : 'text-slate-400'}`} />
                    חוב מיוחד
                  </div>
                </TableHead>
                <TableHead className="text-right font-bold text-slate-700 text-base py-4 px-6 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('status')}>
                  <div className="flex items-center gap-2 justify-end">
                    <ArrowUpDown className={`w-5 h-5 ${sortField === 'status' ? 'text-blue-600' : 'text-slate-400'}`} />
                    סטטוס
                  </div>
                </TableHead>
                <TableHead className="text-right font-bold text-slate-700 text-base py-4 px-6 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('monthsInArrears')}>
                  <div className="flex items-center gap-2 justify-end">
                    <ArrowUpDown className={`w-5 h-5 ${sortField === 'monthsInArrears' ? 'text-rose-600' : 'text-slate-400'}`} />
                    חודשי פיגור
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
                <TableBody>
                {paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
                          <Filter className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-600 font-semibold text-lg">לא נמצאו רשומות</p>
                        <p className="text-sm text-slate-400">נסה לשנות את הפילטרים או את החיפוש</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                paginatedRecords.map((record, idx) => (
                  <TableRow 
                    key={record.id} 
                    className={`hover:bg-blue-50/50 cursor-pointer transition-all duration-200 border-b border-slate-100 ${idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}
                    onClick={() => onRowClick(record)}
                  >
                    <TableCell className="font-bold text-slate-800 text-base py-5 px-6 align-middle">{record.apartmentNumber}</TableCell>
                    <TableCell className="text-slate-700 text-base py-5 px-6 align-middle">{record.ownerName || '-'}</TableCell>
                    <TableCell className="text-base font-medium text-slate-600 py-5 px-6 align-middle text-right" dir="rtl">{formatPhone(record.phonePrimary)}</TableCell>
                    <TableCell className="font-bold text-lg text-rose-600 py-5 px-6 align-middle text-center">{formatCurrency(record.totalDebt)}</TableCell>
                    <TableCell className="text-amber-600 font-semibold text-base py-5 px-6 align-middle text-center">{formatCurrency(record.monthlyDebt)}</TableCell>
                    <TableCell className="text-purple-600 font-semibold text-base py-5 px-6 align-middle text-center">{formatCurrency(record.specialDebt)}</TableCell>
                    <TableCell className="py-5 px-6 align-middle">
                      <Badge variant="outline" className={`${STATUS_COLORS[record.status] || 'bg-slate-100 text-slate-700'} font-semibold text-sm`}>
                        {record.status || 'סדיר'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-700 text-base py-5 px-6 align-middle">{record.monthsInArrears || 0}</TableCell>
                  </TableRow>
                ))
                )}
                </TableBody>
          </Table>
        </div>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 md:px-6 py-4 border-t bg-gradient-to-l from-slate-50 to-white">
            <p className="text-xs md:text-sm text-slate-600 font-medium">
              מציג {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredRecords.length)} מתוך {filteredRecords.length} רשומות
            </p>
            <div className="flex items-center gap-2 md:gap-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-9 md:h-10 px-3 md:px-4"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
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
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <span className="hidden sm:inline">הבא</span>
                <ChevronLeft className="w-4 h-4 mr-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}