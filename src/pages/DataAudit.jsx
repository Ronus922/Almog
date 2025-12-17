import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/auth/AuthContext';
import { isManagerRole } from '@/components/utils/roles';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppButton from "@/components/ui/app-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Wrench,
  FileText,
  Loader2
} from "lucide-react";
import { toast } from 'sonner';

export default function DataAudit() {
  const { currentUser, authChecked } = useAuth();
  const queryClient = useQueryClient();
  const [auditResults, setAuditResults] = useState(null);
  const [suspiciousRecords, setSuspiciousRecords] = useState([]);
  const [isFixing, setIsFixing] = useState(false);

  const isAdmin = isManagerRole(currentUser);

  // Require authentication and admin
  if (authChecked && !currentUser) {
    return <Navigate to={createPageUrl('AppLogin')} replace />;
  }

  if (authChecked && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">אין הרשאת גישה</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">דף זה זמין למנהלים בלבד.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: allRecords = [], isLoading } = useQuery({
    queryKey: ['allDebtorRecordsAudit'],
    queryFn: () => base44.entities.DebtorRecord.list(),
  });

  const runAudit = () => {
    if (!allRecords.length) return;

    const A = allRecords.length;
    const B = allRecords.filter(r => r.isArchived === true).length;
    const C = allRecords.filter(r => r.isArchived === false || !r.isArchived).length;
    const D = allRecords.filter(r => 
      (r.isArchived === false || !r.isArchived) && 
      (!r.legal_status_id || r.legal_status_id === '')
    ).length;
    const E = allRecords.filter(r => 
      r.isArchived === true && 
      (!r.legal_status_id || r.legal_status_id === '')
    ).length;

    // Check for type issues
    const suspicious = allRecords
      .filter(r => {
        const val = r.isArchived;
        return (
          val === 'true' || 
          val === 'TRUE' || 
          val === '1' || 
          val === 1 || 
          val === 'yes' ||
          val === 'false' ||
          val === 'FALSE' ||
          val === '0' ||
          val === 0 ||
          val === 'no'
        );
      })
      .slice(0, 20)
      .map(r => ({
        apartmentNumber: r.apartmentNumber,
        isArchived: r.isArchived,
        typeOf: typeof r.isArchived,
        lastImportAt: r.lastImportAt,
        totalDebt: r.totalDebt
      }));

    setAuditResults({ A, B, C, D, E });
    setSuspiciousRecords(suspicious);
  };

  useEffect(() => {
    if (allRecords.length > 0 && !auditResults) {
      runAudit();
    }
  }, [allRecords]);

  const fixData = async () => {
    setIsFixing(true);
    try {
      let fixedCount = 0;
      const errors = [];

      for (const record of allRecords) {
        let needsUpdate = false;
        let updates = {};

        // Fix 1: Normalize boolean values
        const val = record.isArchived;
        if (val === 'true' || val === 'TRUE' || val === '1' || val === 1 || val === 'yes') {
          updates.isArchived = true;
          needsUpdate = true;
        } else if (val === 'false' || val === 'FALSE' || val === '0' || val === 0 || val === 'no' || !val) {
          updates.isArchived = false;
          needsUpdate = true;
        }

        // Fix 2: Restore records that were incorrectly archived
        // Condition: no legal_status_id, totalDebt > 0, currently archived
        if (
          (!record.legal_status_id || record.legal_status_id === '') &&
          (record.totalDebt || 0) > 0 &&
          record.isArchived === true
        ) {
          updates.isArchived = false;
          needsUpdate = true;
        }

        if (needsUpdate) {
          try {
            await base44.entities.DebtorRecord.update(record.id, updates);
            fixedCount++;
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (err) {
            errors.push({
              apartmentNumber: record.apartmentNumber,
              error: err.message
            });
          }
        }
      }

      toast.success(`תוקנו ${fixedCount} רשומות`);
      
      if (errors.length > 0) {
        console.error('Errors during fix:', errors);
        toast.warning(`${errors.length} רשומות נכשלו`);
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['allDebtorRecordsAudit'] });
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      queryClient.invalidateQueries({ queryKey: ['archivedRecords'] });
      queryClient.invalidateQueries({ queryKey: ['allDebtorRecords'] });
      
      // Re-run audit
      setTimeout(() => runAudit(), 1000);
    } catch (error) {
      console.error('Fix error:', error);
      toast.error('שגיאה בתיקון הנתונים');
    } finally {
      setIsFixing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">אודיט נתונים</h1>
            <p className="text-slate-600 mt-1">בדיקה ותיקון רשומות חייבים</p>
          </div>
          <div className="flex gap-3">
            <AppButton
              variant="outline"
              icon={RefreshCw}
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['allDebtorRecordsAudit'] });
                setTimeout(() => runAudit(), 500);
              }}
            >
              רענן
            </AppButton>
            <AppButton
              variant="primary"
              icon={Wrench}
              onClick={fixData}
              loading={isFixing}
              disabled={!auditResults || (auditResults.E === 0 && suspiciousRecords.length === 0)}
            >
              תקן נתונים
            </AppButton>
          </div>
        </div>

        {/* Audit Results */}
        {auditResults && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  דו"ח ספירה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <p className="text-2xl font-bold text-blue-600">{auditResults.A}</p>
                    <p className="text-sm text-slate-600 mt-1">סה"כ רשומות</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className="text-2xl font-bold text-slate-600">{auditResults.B}</p>
                    <p className="text-sm text-slate-600 mt-1">בארכיון</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <p className="text-2xl font-bold text-green-600">{auditResults.C}</p>
                    <p className="text-sm text-slate-600 mt-1">פעילות</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-xl">
                    <p className="text-2xl font-bold text-orange-600">{auditResults.D}</p>
                    <p className="text-sm text-slate-600 mt-1">פעילות ללא סטטוס</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <p className="text-2xl font-bold text-red-600">{auditResults.E}</p>
                    <p className="text-sm text-slate-600 mt-1">בארכיון ללא סטטוס</p>
                  </div>
                </div>

                {auditResults.E > 0 && (
                  <Alert className="mt-4 bg-red-50 border-red-200">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-800 text-right">
                      <strong>זוהתה בעיה:</strong> {auditResults.E} רשומות ללא סטטוס משפטי נמצאות בארכיון. 
                      זו כנראה הסיבה שרשומות "נעלמות".
                    </AlertDescription>
                  </Alert>
                )}

                {auditResults.E === 0 && suspiciousRecords.length === 0 && (
                  <Alert className="mt-4 bg-green-50 border-green-200">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-800 text-right">
                      <strong>הכל תקין!</strong> לא נמצאו בעיות בנתונים.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Suspicious Records */}
            {suspiciousRecords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    רשומות חשודות - בעיית טיפוס
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-4 bg-orange-50 border-orange-200">
                    <AlertDescription className="text-orange-800 text-right">
                      נמצאו {suspiciousRecords.length} רשומות שבהן isArchived לא מוגדר כבוליאני תקין.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" dir="rtl">
                      <thead>
                        <tr className="border-b">
                          <th className="text-right py-2 px-4">מספר דירה</th>
                          <th className="text-right py-2 px-4">ערך isArchived</th>
                          <th className="text-right py-2 px-4">טיפוס</th>
                          <th className="text-right py-2 px-4">חוב</th>
                          <th className="text-right py-2 px-4">ייבוא אחרון</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suspiciousRecords.map((record, idx) => (
                          <tr key={idx} className="border-b hover:bg-slate-50">
                            <td className="py-2 px-4">{record.apartmentNumber}</td>
                            <td className="py-2 px-4 font-mono">{String(record.isArchived)}</td>
                            <td className="py-2 px-4 font-mono text-xs">{record.typeOf}</td>
                            <td className="py-2 px-4">{record.totalDebt?.toFixed(2) || '0.00'}</td>
                            <td className="py-2 px-4 text-xs text-slate-600">
                              {record.lastImportAt 
                                ? new Date(record.lastImportAt).toLocaleString('he-IL')
                                : '—'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fix Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  פעולות תיקון
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <h4 className="font-bold text-blue-900 mb-2">תיקון 1: נרמול בוליאני</h4>
                    <p className="text-sm text-blue-800">
                      המרת ערכים כמו "true", "1", "false", "0" לבוליאני תקין (true/false)
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-xl">
                    <h4 className="font-bold text-green-900 mb-2">תיקון 2: החזרה מארכיון</h4>
                    <p className="text-sm text-green-800">
                      רשומות ללא סטטוס משפטי, עם חוב גדול מ-0, שנמצאות בארכיון - יוחזרו לרשימת החייבים
                    </p>
                  </div>

                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertDescription className="text-amber-800 text-right">
                      <strong>הערה:</strong> לאחר התיקון, מומלץ לרענן את דף הדשבורד כדי לראות את השינויים.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}