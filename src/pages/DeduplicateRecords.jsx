import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/auth/AuthContext';
import { isManagerRole } from '@/components/utils/roles';
import { normalizeApartmentNumber } from '@/components/utils/apartmentNormalizer';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, AlertTriangle, CheckCircle2, Trash2, 
  RefreshCw, Copy, FileText 
} from "lucide-react";
import { toast } from 'sonner';

export default function DeduplicateRecords() {
  const { currentUser, loading, authChecked } = useAuth();
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [merging, setMerging] = useState(false);

  const isAdmin = isManagerRole(currentUser);

  if (authChecked && !currentUser) {
    return <Navigate to={createPageUrl('AppLogin')} replace />;
  }

  if (authChecked && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="w-5 h-5" />
          <AlertDescription>
            אין לך הרשאה לגשת לעמוד זה. נדרשות הרשאות מנהל.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { data: allRecords = [], isLoading, refetch } = useQuery({
    queryKey: ['allDebtorRecordsForDedup'],
    queryFn: () => base44.entities.DebtorRecord.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DebtorRecord.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allDebtorRecordsForDedup'] });
      queryClient.invalidateQueries({ queryKey: ['allDebtorRecords'] });
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DebtorRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allDebtorRecordsForDedup'] });
      queryClient.invalidateQueries({ queryKey: ['allDebtorRecords'] });
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
    },
  });

  const analyzeDuplicates = () => {
    setAnalyzing(true);
    try {
      const grouped = {};
      
      allRecords.forEach(record => {
        const normalizedApt = normalizeApartmentNumber(record.apartmentNumber);
        if (!normalizedApt) return;
        
        if (!grouped[normalizedApt]) {
          grouped[normalizedApt] = [];
        }
        grouped[normalizedApt].push(record);
      });

      const duplicateGroups = Object.entries(grouped)
        .filter(([_, records]) => records.length > 1)
        .map(([aptNumber, records]) => ({
          apartmentNumber: aptNumber,
          originalValues: records.map(r => r.apartmentNumber),
          records: records.sort((a, b) => 
            new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date)
          ),
          count: records.length
        }));

      setDuplicates(duplicateGroups);
      
      if (duplicateGroups.length === 0) {
        toast.success('לא נמצאו כפילויות במערכת');
      } else {
        toast.warning(`נמצאו ${duplicateGroups.length} דירות עם כפילויות`);
      }
    } catch (error) {
      console.error('Error analyzing duplicates:', error);
      toast.error('שגיאה בניתוח כפילויות');
    } finally {
      setAnalyzing(false);
    }
  };

  const mergeDuplicateGroup = async (group) => {
    setMerging(true);
    try {
      const [primary, ...duplicatesToRemove] = group.records;
      
      // Merge data from duplicates into primary
      const mergedData = {
        phoneOwner: primary.phoneOwner || duplicatesToRemove.find(r => r.phoneOwner)?.phoneOwner || '',
        phoneTenant: primary.phoneTenant || duplicatesToRemove.find(r => r.phoneTenant)?.phoneTenant || '',
        phonePrimary: primary.phonePrimary || duplicatesToRemove.find(r => r.phonePrimary)?.phonePrimary || '',
        notes: [primary.notes, ...duplicatesToRemove.map(r => r.notes)].filter(Boolean).join('\n---\n'),
      };

      // Update primary with merged data
      await updateMutation.mutateAsync({ id: primary.id, data: mergedData });

      // Delete duplicates
      for (const dup of duplicatesToRemove) {
        await deleteMutation.mutateAsync(dup.id);
      }

      toast.success(`מוזגו ${duplicatesToRemove.length} רשומות כפולות לדירה ${group.apartmentNumber}`);
      
      // Re-analyze
      setTimeout(() => analyzeDuplicates(), 500);
    } catch (error) {
      console.error('Error merging duplicates:', error);
      toast.error('שגיאה במיזוג רשומות');
    } finally {
      setMerging(false);
    }
  };

  const mergeAllDuplicates = async () => {
    if (!window.confirm(`האם למזג את כל ${duplicates.length} הכפילויות? פעולה זו היא בלתי הפיכה.`)) {
      return;
    }

    setMerging(true);
    let successCount = 0;
    let errorCount = 0;

    for (const group of duplicates) {
      try {
        await mergeDuplicateGroup(group);
        successCount++;
      } catch (error) {
        console.error(`Error merging group ${group.apartmentNumber}:`, error);
        errorCount++;
      }
    }

    setMerging(false);
    
    if (errorCount === 0) {
      toast.success(`בוצע מיזוג מוצלח של ${successCount} דירות`);
    } else {
      toast.warning(`בוצע מיזוג של ${successCount} דירות, ${errorCount} נכשלו`);
    }

    setTimeout(() => analyzeDuplicates(), 500);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ניקוי כפילויות</h1>
            <p className="text-sm text-slate-600 mt-1">זיהוי ומיזוג רשומות כפולות של דירות</p>
          </div>
          <Button onClick={() => window.location.href = createPageUrl('Dashboard')} variant="outline">
            חזור לדשבורד
          </Button>
        </div>

        <Card>
          <CardHeader className="bg-gradient-to-l from-blue-50 to-white border-b">
            <CardTitle className="text-lg">סריקת מערכת</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription>
                  <p className="font-semibold text-blue-900 mb-2">איך זה עובד?</p>
                  <ul className="text-sm text-blue-700 space-y-1 list-disc pr-5">
                    <li>המערכת תזהה דירות עם מספר דירה זהה (לאחר נרמול)</li>
                    <li>עבור כל קבוצת כפילויות, הרשומה העדכנית ביותר תישמר</li>
                    <li>נתונים (טלפונים, הערות) ימוזגו מכל הרשומות</li>
                    <li>רשומות כפולות ימחקו</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button 
                  onClick={analyzeDuplicates} 
                  disabled={analyzing}
                  className="flex-1"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      מנתח...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 ml-2" />
                      סרוק כפילויות
                    </>
                  )}
                </Button>

                {duplicates.length > 0 && (
                  <Button 
                    onClick={mergeAllDuplicates} 
                    disabled={merging}
                    variant="destructive"
                    className="flex-1"
                  >
                    {merging ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        ממזג...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 ml-2" />
                        מזג את כל הכפילויות ({duplicates.length})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {duplicates.length > 0 && (
          <Card>
            <CardHeader className="bg-gradient-to-l from-orange-50 to-white border-b">
              <CardTitle className="text-lg text-orange-800">
                נמצאו {duplicates.length} דירות עם כפילויות
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {duplicates.map((group, idx) => (
                  <div key={idx} className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">
                          דירה {group.apartmentNumber}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {group.count} רשומות כפולות
                        </p>
                        {group.originalValues.length > 1 && (
                          <p className="text-xs text-orange-600 mt-1">
                            ערכים מקוריים: {group.originalValues.join(', ')}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => mergeDuplicateGroup(group)}
                        disabled={merging}
                      >
                        <CheckCircle2 className="w-4 h-4 ml-1" />
                        מזג
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {group.records.map((record, ridx) => (
                        <div 
                          key={record.id} 
                          className={`p-3 rounded border text-sm ${
                            ridx === 0 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-slate-700">
                              {ridx === 0 ? '✓ רשומה ראשית (תישמר)' : `רשומה כפולה #${ridx + 1} (תמחק)`}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(record.updated_date || record.created_date).toLocaleDateString('he-IL')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-500">בעלים:</span>{' '}
                              <span className="font-medium">{record.ownerName || '-'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">טלפון:</span>{' '}
                              <span className="font-medium">{record.phonePrimary || '-'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">חוב:</span>{' '}
                              <span className="font-bold text-rose-600">
                                ₪{(record.totalDebt || 0).toLocaleString('he-IL')}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">הערות:</span>{' '}
                              <span className="font-medium">
                                {record.notes ? record.notes.substring(0, 30) + '...' : '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!analyzing && duplicates.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                המערכת נקייה
              </h3>
              <p className="text-sm text-slate-500">
                לא נמצאו כפילויות במערכת
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}