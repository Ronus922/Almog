import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  TableRow,
} from "@/components/ui/table";
import { Search, Filter, ArrowUpDown, Eye, ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_COLORS = {
  'סדיר': 'bg-green-100 text-green-700 border-green-200',
  'חייב': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'חייב משמעותי': 'bg-orange-100 text-orange-700 border-orange-200',
  'מועמד לתביעה': 'bg-slate-100 text-slate-700 border-slate-200',
  'בתביעה': 'bg-red-100 text-red-700 border-red-200',
  'בהסדר': 'bg-blue-100 text-blue-700 border-blue-200'
};

const LEGAL_STAGE_COLORS = {
  'אין': 'bg-slate-50 text-slate-500',
  'פנייה ראשונית': 'bg-blue-50 text-blue-600',
  'מכתב התראה': 'bg-amber-50 text-amber-600',
  'בתביעה': 'bg-red-50 text-red-600',
  'הסדר תשלומים': 'bg-green-50 text-green-600'
};

export default function DebtorsTable({ records, onRowClick, isAdmin }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [debtFilter, setDebtFilter] = useState('all');
  const [sortField, setSortField] = useState('totalDebt');
  const [sortDir, setSortDir] = useState('desc'); // ברירת מחדל: מהגדול לקטן
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const formatCurrency = (num) => 
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num || 0);

  const filteredRecords = useMemo(() => {
    let result = [...records];

    // חיפוש
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => 
        r.apartmentNumber?.toLowerCase().includes(s) ||
        r.ownerName?.toLowerCase().includes(s) ||
        r.tenantName?.toLowerCase().includes(s) ||
        r.phones?.toLowerCase().includes(s)
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
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-slate-700">טבלת חייבים</CardTitle>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="חיפוש..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pr-10 w-48"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
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
              <SelectTrigger className="w-36">
                <SelectValue placeholder="סינון חוב" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל החובות</SelectItem>
                <SelectItem value="above1000">מעל ₪1,000</SelectItem>
                <SelectItem value="above5000">מעל ₪5,000</SelectItem>
                <SelectItem value="special">חוב מיוחד בלבד</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-right font-semibold">דירה</TableHead>
                <TableHead className="text-right font-semibold">בעלים</TableHead>
                <TableHead className="text-right font-semibold">שוכר</TableHead>
                <TableHead className="text-right font-semibold">טלפון</TableHead>
                <TableHead className="text-right font-semibold cursor-pointer" onClick={() => toggleSort('totalDebt')}>
                  <div className="flex items-center gap-1">
                    סה״כ חוב
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'totalDebt' ? 'text-slate-700' : 'text-slate-400'}`} />
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">חוב חודשי</TableHead>
                <TableHead className="text-right font-semibold">חוב מיוחד</TableHead>
                <TableHead className="text-right font-semibold">סטטוס</TableHead>
                <TableHead className="text-right font-semibold">שלב משפטי</TableHead>
                <TableHead className="text-right font-semibold cursor-pointer" onClick={() => toggleSort('monthsInArrears')}>
                  <div className="flex items-center gap-1">
                    חודשי פיגור
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="text-center font-semibold">פעולות</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {paginatedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-10">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                        <Filter className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">לא נמצאו רשומות</p>
                      <p className="text-xs text-slate-400">נסה לשנות את הפילטרים או את החיפוש</p>
                    </div>
                  </TableCell>
                </TableRow>
                ) : (
                paginatedRecords.map((record) => (
                  <TableRow 
                    key={record.id} 
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => onRowClick(record)}
                  >
                    <TableCell className="font-medium">{record.apartmentNumber}</TableCell>
                    <TableCell>{record.ownerName || '-'}</TableCell>
                    <TableCell>{record.tenantName || '-'}</TableCell>
                    <TableCell className="text-sm">{record.phones || '-'}</TableCell>
                    <TableCell className="font-semibold text-rose-600">{formatCurrency(record.totalDebt)}</TableCell>
                    <TableCell>{formatCurrency(record.monthlyDebt)}</TableCell>
                    <TableCell>{formatCurrency(record.specialDebt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[record.status] || ''}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={LEGAL_STAGE_COLORS[record.legalStage] || ''}>
                        {record.legalStage || 'אין'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{record.monthsInArrears || 0}</TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); onRowClick(record); }}
                        title={isAdmin ? "צפה ערוך" : "צפה"}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
                )}
                </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-slate-500">
              מציג {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredRecords.length)} מתוך {filteredRecords.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-600">עמוד {page} מתוך {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}