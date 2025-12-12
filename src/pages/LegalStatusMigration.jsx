import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PlayCircle, CheckCircle2, XCircle, AlertTriangle, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_LEGAL_STATUSES = [
  { name: 'לא הוגדר', color: 'bg-blue-100 text-blue-700', description: 'סטטוס זמני – נדרש לקבוע סטטוס משפטי', is_default: true },
  { name: 'חייב משמעותי', color: 'bg-red-100 text-red-700', is_default: false },
  { name: 'מכתב התראה', color: 'bg-orange-100 text-orange-700', is_default: false },
  { name: 'מועמד לתביעה', color: 'bg-amber-100 text-amber-700', is_default: false },
  { name: 'תביעה משפטית', color: 'bg-rose-100 text-rose-700', is_default: false },
  { name: 'הסדר תשלומים', color: 'bg-blue-100 text-blue-700', is_default: false },
  { name: 'בפריסה', color: 'bg-indigo-100 text-indigo-700', is_default: false },
  { name: 'לא עונה', color: 'bg-slate-100 text-slate-700', is_default: false },
  { name: 'סדיר', color: 'bg-green-100 text-green-700', is_default: false }
];

export default function LegalStatusMigration() {
  const [user, setUser] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => base44.entities.Status.list(),
  });

  const { data: debtorRecords = [] } = useQuery({
    queryKey: ['debtorRecords'],
    queryFn: () => base44.entities.DebtorRecord.list(),
  });

  const legalStatuses = statuses.filter(s => s.type === 'LEGAL');

  const runMigration = async () => {
    setIsRunning(true);
    setMigrationResult(null);

    try {
      const result = {
        seedCreated: 0,
        seedSkipped: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        recordsNoStatus: 0,
        newStatusesCreated: 0,
        errors: []
      };

      // שלב 1: יצירת סטטוסים ברירת מחדל (seed)
      for (const defaultStatus of DEFAULT_LEGAL_STATUSES) {
        const existing = statuses.find(s => 
          s.type === 'LEGAL' && 
          s.name.trim().toLowerCase() === defaultStatus.name.trim().toLowerCase()
        );

        if (existing) {
          result.seedSkipped++;
          // עדכן is_default אם צריך
          if (defaultStatus.is_default && !existing.is_default) {
            await base44.entities.Status.update(existing.id, { is_default: true });
          }
        } else {
          await base44.entities.Status.create({
            name: defaultStatus.name,
            type: 'LEGAL',
            description: defaultStatus.description || '',
            color: defaultStatus.color,
            is_active: true,
            is_default: defaultStatus.is_default || false
          });
          result.seedCreated++;
        }
      }

      // רענון רשימת הסטטוסים
      await queryClient.invalidateQueries({ queryKey: ['statuses'] });
      const updatedStatuses = await base44.entities.Status.list();
      const updatedLegalStatuses = updatedStatuses.filter(s => s.type === 'LEGAL');
      
      // מציאת סטטוס ברירת מחדל
      const defaultStatus = updatedLegalStatuses.find(s => s.is_default === true);

      // שלב 2: מיגרציה של רשומות DebtorRecord
      for (const record of debtorRecords) {
        // אם כבר יש legal_status_id תקין ושונה ידנית - דלג
        const hasValidStatus = record.legal_status_id && updatedLegalStatuses.find(s => s.id === record.legal_status_id);
        if (hasValidStatus && record.legal_status_overridden) {
          result.recordsSkipped++;
          continue;
        }

        // אם אין סטטוס תקין - הצב default
        if (!hasValidStatus) {
          if (defaultStatus) {
            await base44.entities.DebtorRecord.update(record.id, {
              legal_status_id: defaultStatus.id,
              legal_status_overridden: false
            });
            result.recordsUpdated++;
          } else {
            result.recordsNoStatus++;
          }
          continue;
        }

        // אם יש legal_status_manual אבל אין legal_status_id
        if (!record.legal_status_manual || record.legal_status_manual.trim() === '') {
          if (defaultStatus && !hasValidStatus) {
            await base44.entities.DebtorRecord.update(record.id, {
              legal_status_id: defaultStatus.id,
              legal_status_overridden: false
            });
            result.recordsUpdated++;
          } else {
            result.recordsNoStatus++;
          }
          continue;
        }

        const normalized = record.legal_status_manual.trim();
        
        // חיפוש סטטוס קיים
        let matchingStatus = updatedLegalStatuses.find(s => 
          s.name.trim().toLowerCase() === normalized.toLowerCase()
        );

        // אם לא נמצא - צור חדש
        if (!matchingStatus) {
          const maxOrder = Math.max(...updatedLegalStatuses.map(s => s.order || 0), 0);
          const newStatus = await base44.entities.Status.create({
            name: normalized,
            type: 'LEGAL',
            color: 'bg-slate-100 text-slate-700',
            order: maxOrder + 1,
            is_active: true
          });
          matchingStatus = newStatus;
          updatedLegalStatuses.push(newStatus);
          result.newStatusesCreated++;
        }

        // עדכן את הרשומה
        await base44.entities.DebtorRecord.update(record.id, {
          legal_status_id: matchingStatus.id
        });
        result.recordsUpdated++;
      }

      setMigrationResult(result);
      await queryClient.invalidateQueries({ queryKey: ['statuses'] });
      await queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      toast.success('המיגרציה הושלמה בהצלחה');
    } catch (error) {
      toast.error('שגיאה במהלך המיגרציה');
      console.error(error);
    } finally {
      setIsRunning(false);
    }
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
              <Button onClick={() => window.location.href = '/'}>חזור לדשבורד</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">מיגרציה לסטטוסים משפטיים</h1>
          <p className="text-slate-600 mt-2">המרה אוטומטית של סטטוסים משפטיים ישנים למערכת חדשה</p>
        </div>

        <Alert className="bg-blue-50 border-blue-300" dir="rtl">
          <AlertTriangle className="w-5 h-5 text-blue-600" />
          <AlertDescription className="text-blue-800 font-semibold text-right">
            תהליך זה יבצע מיגרציה חד-פעמית של הנתונים. מומלץ לבצע גיבוי לפני תחילת התהליך.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>סטטוסי LEGAL קיימים במערכת</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {legalStatuses.length === 0 ? (
                <p className="text-slate-600">אין עדיין סטטוסים משפטיים במערכת</p>
              ) : (
                legalStatuses.map((status) => (
                  <Badge key={status.id} className={status.color}>
                    {status.name}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>סטטוסים שייווצרו (ברירת מחדל)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_LEGAL_STATUSES.map((status) => (
                <Badge key={status.name} className={status.color}>
                  {status.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>סטטיסטיקות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">סה״כ רשומות:</span>
              <span className="font-bold">{debtorRecords.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">רשומות עם legal_status_id:</span>
              <span className="font-bold">{debtorRecords.filter(r => r.legal_status_id).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">רשומות עם legal_status_manual:</span>
              <span className="font-bold">{debtorRecords.filter(r => r.legal_status_manual).length}</span>
            </div>
          </CardContent>
        </Card>

        {migrationResult && (
          <Card className="border-green-300 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="w-6 h-6" />
                תוצאות המיגרציה
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-700">סטטוסים חדשים שנוצרו (seed):</span>
                <Badge className="bg-green-600 text-white">{migrationResult.seedCreated}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700">סטטוסים שכבר היו קיימים:</span>
                <Badge variant="outline">{migrationResult.seedSkipped}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700">רשומות שעודכנו:</span>
                <Badge className="bg-blue-600 text-white">{migrationResult.recordsUpdated}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700">סטטוסים חדשים שנוצרו מהנתונים:</span>
                <Badge className="bg-amber-600 text-white">{migrationResult.newStatusesCreated}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700">רשומות שכבר מקושרות (דולגו):</span>
                <Badge variant="outline">{migrationResult.recordsSkipped}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700">רשומות ללא סטטוס:</span>
                <Badge variant="outline">{migrationResult.recordsNoStatus}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button 
            onClick={runMigration} 
            disabled={isRunning}
            className="gap-2"
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                מבצע מיגרציה...
              </>
            ) : (
              <>
                <PlayCircle className="w-5 h-5" />
                הפעל מיגרציה
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}