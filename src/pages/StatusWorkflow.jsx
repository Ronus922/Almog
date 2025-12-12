import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowRight, CheckCircle2, SkipForward, ExternalLink, 
  ListTodo, Loader2, Home, Phone, Wallet, PartyPopper
} from "lucide-react";
import { toast } from "sonner";

export default function StatusWorkflow() {
  const [user, setUser] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedStatusId, setSelectedStatusId] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: allStatuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => base44.entities.Status.list(),
  });

  const { data: allRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['debtorRecords'],
    queryFn: () => base44.entities.DebtorRecord.list('apartmentNumber'),
  });

  const legalStatuses = allStatuses.filter(s => s.type === 'LEGAL' && s.is_active);
  const defaultStatus = allStatuses.find(s => s.type === 'LEGAL' && s.is_default === true);

  // רשימת דירות שדורשות טיפול
  const pendingRecords = allRecords.filter(r => r.legal_status_id === defaultStatus?.id);
  const currentRecord = pendingRecords[currentIndex];
  const remainingCount = pendingRecords.length;

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DebtorRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      toast.success('סטטוס עודכן בהצלחה');
      setSelectedStatusId('');
      // לא משנים את currentIndex - הרשימה תתעדכן והדירה הבאה תהיה באותו אינדקס
    },
  });

  const handleSaveAndNext = async () => {
    if (!selectedStatusId) {
      toast.error('בחר סטטוס לפני שמירה');
      return;
    }

    if (!currentRecord) return;

    await updateMutation.mutateAsync({
      id: currentRecord.id,
      data: { 
        legal_status_id: selectedStatusId,
        legal_status_overridden: true
      }
    });
  };

  const handleSkip = () => {
    if (currentIndex < pendingRecords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedStatusId('');
    } else {
      setCurrentIndex(0);
      setSelectedStatusId('');
    }
  };

  const handleOpenDetails = () => {
    navigate(createPageUrl('Dashboard') + `?openRecord=${currentRecord.id}`);
  };

  const formatCurrency = (num) => 
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num || 0);

  const formatPhone = (phone) => {
    if (!phone) return 'אין מספר';
    const cleaned = phone.replace(/\D/g, '');
    if (/^0+$/.test(cleaned)) return 'אין מספר';
    return phone;
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ListTodo className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">גישה מוגבלת</h2>
              <p className="text-slate-600 mb-4">רק מנהלים יכולים לגשת לדף זה</p>
              <Button onClick={() => navigate(createPageUrl('Dashboard'))}>חזור לדשבורד</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (recordsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // מסך סיום - אין דירות לטיפול
  if (remainingCount === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <PartyPopper className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-3">מעולה! אין דירות לטיפול</h1>
            <p className="text-lg text-slate-600 mb-8">כל הדירות שויכו לסטטוס משפטי</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate(createPageUrl('Dashboard'))} className="rounded-xl">
                חזור לדשבורד
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate(createPageUrl('StatusManagement'))}
                className="rounded-xl"
              >
                ניהול סטטוסים
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* כותרת ומונה */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">טיפול דירה-דירה</h1>
            <p className="text-slate-600 mt-1">שיוך סטטוס משפטי לכל דירה</p>
          </div>
          <div className="text-left">
            <div className="text-sm text-slate-500 font-semibold">נותרו לטיפול</div>
            <div className="text-4xl font-extrabold text-orange-600">{remainingCount}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(createPageUrl('StatusManagement'))}
              className="rounded-xl mt-3 w-full"
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              חזרה לסטטוסים
            </Button>
          </div>
        </div>

        {/* התקדמות */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="flex items-center justify-between">
            <span className="font-semibold text-blue-900">
              דירה {currentIndex + 1} מתוך {remainingCount}
            </span>
            <Badge variant="outline" className="bg-white">
              {Math.round(((currentIndex + 1) / remainingCount) * 100)}%
            </Badge>
          </AlertDescription>
        </Alert>

        {/* כרטיס הדירה הנוכחית */}
        {currentRecord && (
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardHeader className="bg-gradient-to-l from-blue-50 to-slate-50">
              <CardTitle className="text-2xl flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Home className="w-6 h-6 text-white" />
                </div>
                דירה {currentRecord.apartmentNumber}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* פרטים עיקריים */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-xs text-slate-500 font-semibold mb-1">בעל דירה</div>
                  <div className="font-bold text-slate-800">{currentRecord.ownerName || '-'}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <div className="text-xs text-slate-500 font-semibold">טלפון</div>
                  </div>
                  <div className="font-bold text-slate-800">{formatPhone(currentRecord.phonePrimary)}</div>
                </div>
                <div className="bg-rose-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="w-4 h-4 text-rose-600" />
                    <div className="text-xs text-rose-600 font-semibold">סה"כ חוב</div>
                  </div>
                  <div className="font-bold text-rose-600 text-lg">{formatCurrency(currentRecord.totalDebt)}</div>
                </div>
              </div>

              <Separator />

              {/* בחירת סטטוס */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-base font-bold text-slate-800">בחר סטטוס משפטי</label>
                  {selectedStatusId && (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle2 className="w-4 h-4 ml-1" />
                      נבחר
                    </Badge>
                  )}
                </div>
                <Select value={selectedStatusId} onValueChange={setSelectedStatusId}>
                  <SelectTrigger className="h-14 rounded-xl text-lg">
                    <SelectValue placeholder="בחר סטטוס משפטי..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {legalStatuses
                      .filter(s => !s.is_default)
                      .map((status) => (
                        <SelectItem key={status.id} value={status.id} className="h-12">
                          <div className="flex items-center gap-3">
                            <Badge className={status.color}>
                              {status.name}
                            </Badge>
                            {status.description && (
                              <span className="text-xs text-slate-500">{status.description}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* כפתורי פעולה */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleSaveAndNext}
                  disabled={!selectedStatusId || updateMutation.isPending}
                  className="flex-1 h-14 text-lg rounded-xl bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 ml-2" />
                      שמור ועבור הבא
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  disabled={updateMutation.isPending}
                  className="h-14 px-6 rounded-xl"
                >
                  <SkipForward className="w-5 h-5 ml-2" />
                  דלג
                </Button>
                <Button
                  variant="outline"
                  onClick={handleOpenDetails}
                  disabled={updateMutation.isPending}
                  className="h-14 px-6 rounded-xl"
                >
                  <ExternalLink className="w-5 h-5 ml-2" />
                  פרטים
                </Button>
              </div>


            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}