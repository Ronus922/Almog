import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Search, Loader2, Shield, ExternalLink } from "lucide-react";
import ApartmentDetailModal from '../components/dashboard/ApartmentDetailModal';

export default function LinkedRecords() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const navigate = useNavigate();

  // קריאת פרמטרים מה-URL
  const urlParams = new URLSearchParams(window.location.search);
  const statusId = urlParams.get('statusId');
  const statusName = urlParams.get('statusName');

  React.useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: debtorRecords = [], isLoading } = useQuery({
    queryKey: ['debtorRecords'],
    queryFn: () => base44.entities.DebtorRecord.list(),
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => base44.entities.Status.list(),
  });

  const status = statuses.find(s => s.id === statusId);

  const linkedRecords = useMemo(() => {
    let filtered = debtorRecords.filter(r => r.legal_status_id === statusId);

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.apartmentNumber?.toLowerCase().includes(s) ||
        r.ownerName?.toLowerCase().includes(s) ||
        r.phonePrimary?.toLowerCase().includes(s)
      );
    }

    return filtered;
  }, [debtorRecords, statusId, search]);

  const formatCurrency = (num) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num || 0);

  const handleSave = async (updatedRecord) => {
    await base44.entities.DebtorRecord.update(updatedRecord.id, updatedRecord);
    setSelectedRecord(null);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h2 className="text-xl font-bold text-slate-800 mb-2">גישה מוגבלת</h2>
              <p className="text-slate-600 mb-4">אין לך הרשאה לגשת לדף זה</p>
              <Button onClick={() => navigate(createPageUrl('Dashboard'))}>חזור לדשבורד</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(createPageUrl('StatusManagement'))}
                className="gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                חזור לניהול סטטוסים
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mt-4">רשומות מקושרות</h1>
            {status && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-slate-600">סטטוס:</span>
                <Badge className={status.color + ' text-base px-3 py-1'}>
                  {status.name}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {linkedRecords.length} רשומות מקושרות
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="חיפוש..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10 h-10 rounded-xl"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {linkedRecords.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600">לא נמצאו רשומות מקושרות</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">מספר דירה</TableHead>
                    <TableHead className="text-right">שם בעלים</TableHead>
                    <TableHead className="text-right">טלפון</TableHead>
                    <TableHead className="text-right">סה״כ חוב</TableHead>
                    <TableHead className="text-center">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkedRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-slate-50 cursor-pointer">
                      <TableCell className="font-semibold">{record.apartmentNumber}</TableCell>
                      <TableCell>{record.ownerName || '-'}</TableCell>
                      <TableCell>{record.phonePrimary || '-'}</TableCell>
                      <TableCell className="font-bold text-rose-600">{formatCurrency(record.totalDebt)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRecord(record)}
                          className="gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          פתח
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedRecord && (
        <ApartmentDetailModal
          record={selectedRecord}
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onSave={handleSave}
          isAdmin={user?.role === 'admin'}
        />
      )}
    </div>
  );
}