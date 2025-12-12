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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Advanced filters
  const [minDebt, setMinDebt] = useState('');
  const [maxDebt, setMaxDebt] = useState('');
  const [ownerNameFilter, setOwnerNameFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [minMonthsArrears, setMinMonthsArrears] = useState('');
  const [maxMonthsArrears, setMaxMonthsArrears] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
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

    // Advanced filters - טווח סכום
    if (minDebt !== '') {
      const min = parseFloat(minDebt);
      if (!isNaN(min)) {
        result = result.filter(r => (r.totalDebt || 0) >= min);
      }
    }
    if (maxDebt !== '') {
      const max = parseFloat(maxDebt);
      if (!isNaN(max)) {
        result = result.filter(r => (r.totalDebt || 0) <= max);
      }
    }

    // סינון שם בעלים
    if (ownerNameFilter) {
      const s = ownerNameFilter.toLowerCase();
      result = result.filter(r => r.ownerName?.toLowerCase().includes(s));
    }

    // סינון טלפון
    if (phoneFilter) {
      const s = phoneFilter.toLowerCase();
      result = result.filter(r => 
        r.phonePrimary?.toLowerCase().includes(s) ||
        r.phoneOwner?.toLowerCase().includes(s) ||
        r.phoneTenant?.toLowerCase().includes(s)
      );
    }

    // חודשי פיגור
    if (minMonthsArrears !== '') {
      const min = parseInt(minMonthsArrears);
      if (!isNaN(min)) {
        result = result.filter(r => (r.monthsInArrears || 0) >= min);
      }
    }
    if (maxMonthsArrears !== '') {
      const max = parseInt(maxMonthsArrears);
      if (!isNaN(max)) {
        result = result.filter(r => (r.monthsInArrears || 0) <= max);
      }
    }

    // תאריכים
    if (fromDate) {
      result = result.filter(r => {
        if (!r.lastContactDate) return false;
        return new Date(r.lastContactDate) >= new Date(fromDate);
      });
    }
    if (toDate) {
      result = result.filter(r => {
        if (!r.lastContactDate) return false;
        return new Date(r.lastContactDate) <= new Date(toDate);
      });
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
  }, [records, search, statusFilter, debtFilter, sortField, sortDir, minDebt, maxDebt, ownerNameFilter, phoneFilter, minMonthsArrears, maxMonthsArrears, fromDate, toDate]);

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
    setDebtFilter('all');
    setSearch('');
    setMinDebt('');
    setMaxDebt('');
    setOwnerNameFilter('');
    setPhoneFilter('');
    setMinMonthsArrears('');
    setMaxMonthsArrears('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const clearAdvancedFilters = () => {
    setMinDebt('');
    setMaxDebt('');
    setOwnerNameFilter('');
    setPhoneFilter('');
    setMinMonthsArrears('');
    setMaxMonthsArrears('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const hasActiveFilters = statusFilter !== 'all' || debtFilter !== 'all' || search !== '';
  const hasAdvancedFilters = minDebt !== '' || maxDebt !== '' || ownerNameFilter !== '' || phoneFilter !== '' || minMonthsArrears !== '' || maxMonthsArrears !== '' || fromDate !== '' || toDate !== '';

  return (
    <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
      <CardHeader className="pb-4 md:pb-6 pt-4 md:pt-6 bg-gradient-to-l from-white to-slate-50 border-b border-slate-200">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-xl md:text-2xl font-bold text-slate-800">טבלת חייבים</CardTitle>
            
            {/* Mobile filters */}
            <div className="flex lg:hidden gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="חיפוש..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pr-10 h-10 rounded-xl border-slate-300 text-sm"
                />
              </div>
              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 px-3 rounded-xl">
                    <SlidersHorizontal className="w-4 h-4 ml-1" />
                    חיפוש מורחב
                    {(hasActiveFilters || hasAdvancedFilters) && (
                      <span className="mr-1 w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 overflow-y-auto" dir="rtl">
                  <SheetHeader>
                    <SheetTitle className="text-right">חיפוש מורחב</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">שם בעלים</label>
                      <Input
                        placeholder="חיפוש לפי שם"
                        value={ownerNameFilter}
                        onChange={(e) => { setOwnerNameFilter(e.target.value); setPage(1); }}
                        className="h-11 rounded-xl text-right"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">טלפון</label>
                      <Input
                        placeholder="חיפוש לפי טלפון"
                        value={phoneFilter}
                        onChange={(e) => { setPhoneFilter(e.target.value); setPage(1); }}
                        className="h-11 rounded-xl text-right"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">טווח סכום חוב</label>
                      <div className="flex gap-2" dir="rtl">
                        <Input
                          type="number"
                          placeholder="מסכום"
                          value={minDebt}
                          onChange={(e) => { setMinDebt(e.target.value); setPage(1); }}
                          className="h-11 rounded-xl text-right flex-1"
                          dir="rtl"
                        />
                        <Input
                          type="number"
                          placeholder="עד סכום"
                          value={maxDebt}
                          onChange={(e) => { setMaxDebt(e.target.value); setPage(1); }}
                          className="h-11 rounded-xl text-right flex-1"
                          dir="rtl"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">סטטוס</label>
                      <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-full h-11 rounded-xl">
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
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">חודשי פיגור</label>
                      <div className="flex gap-2" dir="rtl">
                        <Input
                          type="number"
                          placeholder="מ־"
                          value={minMonthsArrears}
                          onChange={(e) => { setMinMonthsArrears(e.target.value); setPage(1); }}
                          className="h-11 rounded-xl text-right flex-1"
                          dir="rtl"
                        />
                        <Input
                          type="number"
                          placeholder="עד"
                          value={maxMonthsArrears}
                          onChange={(e) => { setMaxMonthsArrears(e.target.value); setPage(1); }}
                          className="h-11 rounded-xl text-right flex-1"
                          dir="rtl"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">תאריך קשר אחרון</label>
                      <div className="flex gap-2" dir="rtl">
                        <Input
                          type="date"
                          placeholder="מתאריך"
                          value={fromDate}
                          onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                          className="h-11 rounded-xl text-right flex-1"
                          dir="rtl"
                        />
                        <Input
                          type="date"
                          placeholder="עד תאריך"
                          value={toDate}
                          onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                          className="h-11 rounded-xl text-right flex-1"
                          dir="rtl"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 rounded-xl"
                        onClick={clearFilters}
                      >
                        <X className="w-4 h-4 ml-1" />
                        נקה פילטרים
                      </Button>
                      <Button 
                        className="flex-1 rounded-xl"
                        onClick={() => setIsFilterOpen(false)}
                      >
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

              <Button 
                variant={showAdvancedFilters ? "default" : "outline"}
                size="sm" 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="h-11 rounded-xl"
              >
                <SlidersHorizontal className="w-4 h-4 ml-1" />
                חיפוש מורחב
                {hasAdvancedFilters && (
                  <span className="mr-2 w-2 h-2 bg-white rounded-full"></span>
                )}
              </Button>

              {(hasActiveFilters || hasAdvancedFilters) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="h-11 rounded-xl"
                >
                  <X className="w-4 h-4 ml-1" />
                  נקה הכל
                </Button>
              )}
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
              
              {/* Advanced Filter Row */}
              {showAdvancedFilters && (
                <TableRow className="bg-blue-50/50 border-b-2 border-blue-200">
                  <TableHead className="py-3 px-4">
                    <Input
                      placeholder="מספר דירה"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      className="h-9 rounded-lg text-sm text-right"
                      dir="rtl"
                    />
                  </TableHead>
                  <TableHead className="py-3 px-4">
                    <Input
                      placeholder="שם בעלים"
                      value={ownerNameFilter}
                      onChange={(e) => { setOwnerNameFilter(e.target.value); setPage(1); }}
                      className="h-9 rounded-lg text-sm text-right"
                      dir="rtl"
                    />
                  </TableHead>
                  <TableHead className="py-3 px-4">
                    <Input
                      placeholder="טלפון"
                      value={phoneFilter}
                      onChange={(e) => { setPhoneFilter(e.target.value); setPage(1); }}
                      className="h-9 rounded-lg text-sm text-right"
                      dir="rtl"
                    />
                  </TableHead>
                  <TableHead className="py-3 px-4">
                    <div className="flex gap-2 items-center justify-end" dir="rtl">
                      <Input
                        type="number"
                        placeholder="מסכום"
                        value={minDebt}
                        onChange={(e) => { setMinDebt(e.target.value); setPage(1); }}
                        className="h-9 rounded-lg text-sm w-20 text-right"
                        dir="rtl"
                      />
                      <span className="text-xs text-slate-500">-</span>
                      <Input
                        type="number"
                        placeholder="עד"
                        value={maxDebt}
                        onChange={(e) => { setMaxDebt(e.target.value); setPage(1); }}
                        className="h-9 rounded-lg text-sm w-20 text-right"
                        dir="rtl"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="py-3 px-4"></TableHead>
                  <TableHead className="py-3 px-4"></TableHead>
                  <TableHead className="py-3 px-4">
                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                      <SelectTrigger className="h-9 rounded-lg text-sm">
                        <SelectValue placeholder="הכל" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="all">הכל</SelectItem>
                        <SelectItem value="סדיר">סדיר</SelectItem>
                        <SelectItem value="חייב">חייב</SelectItem>
                        <SelectItem value="חייב משמעותי">חייב משמעותי</SelectItem>
                        <SelectItem value="מועמד לתביעה">מועמד לתביעה</SelectItem>
                        <SelectItem value="בתביעה">בתביעה</SelectItem>
                        <SelectItem value="בהסדר">בהסדר</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableHead>
                  <TableHead className="py-3 px-4">
                    <div className="flex gap-2 items-center justify-end" dir="rtl">
                      <Input
                        type="number"
                        placeholder="מ־"
                        value={minMonthsArrears}
                        onChange={(e) => { setMinMonthsArrears(e.target.value); setPage(1); }}
                        className="h-9 rounded-lg text-sm w-16 text-right"
                        dir="rtl"
                      />
                      <span className="text-xs text-slate-500">-</span>
                      <Input
                        type="number"
                        placeholder="עד"
                        value={maxMonthsArrears}
                        onChange={(e) => { setMaxMonthsArrears(e.target.value); setPage(1); }}
                        className="h-9 rounded-lg text-sm w-16 text-right"
                        dir="rtl"
                      />
                    </div>
                  </TableHead>
                </TableRow>
              )}
              
              {/* Filter Actions Row */}
              {showAdvancedFilters && (
                <TableRow className="bg-blue-50/30 border-b border-blue-200">
                  <TableHead colSpan={8} className="py-3 px-6">
                    <div className="flex items-center gap-3 justify-between" dir="rtl">
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-slate-600 font-semibold">תאריך קשר אחרון:</span>
                        <Input
                          type="date"
                          placeholder="מתאריך"
                          value={fromDate}
                          onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                          className="h-9 rounded-lg text-sm w-36 text-right"
                          dir="rtl"
                        />
                        <span className="text-xs text-slate-500">עד</span>
                        <Input
                          type="date"
                          placeholder="עד תאריך"
                          value={toDate}
                          onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                          className="h-9 rounded-lg text-sm w-36 text-right"
                          dir="rtl"
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearAdvancedFilters}
                        className="h-9 rounded-lg"
                      >
                        <X className="w-4 h-4 ml-1" />
                        נקה פילטרים
                      </Button>
                    </div>
                  </TableHead>
                </TableRow>
              )}
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