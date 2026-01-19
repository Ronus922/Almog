import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Settings, Building2, Scale, Webhook, Save, 
  Loader2, CheckCircle2, AlertTriangle, RefreshCw, Mail
} from "lucide-react";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { calculateDebtStatus, validateThresholds } from '../utils/debtStatusCalculator';
import { useQuery } from '@tanstack/react-query';

export default function SettingsPanel() {
  const [settings, setSettings] = useState({
    threshold_ok_max: 1000,
    threshold_collect_from: 1500,
    threshold_legal_from: 5000,
    makeEnabled: false,
    makeWebhookStatusChangeUrl: '',
    makeWebhookNewLawsuitCandidateUrl: '',
    makeWebhookNewRecordUrl: '',
    buildingName: 'בניין אלמוג',
    buildingAddress: 'דוד אלעזר 10, חיפה',
    legal_alert_email: '',
    legal_alert_statuses: []
  });
  const [settingsId, setSettingsId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcSuccess, setRecalcSuccess] = useState(false);
  const [recalcMessage, setRecalcMessage] = useState('');

  const { data: allStatuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => base44.entities.Status.list('order'),
  });

  const legalStatuses = allStatuses.filter(s => s.type === 'LEGAL' && s.is_active);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsList = await base44.entities.Settings.list();
      if (settingsList.length > 0) {
        const loadedSettings = settingsList[0];
        setSettings({
          ...loadedSettings,
          legal_alert_statuses: loadedSettings.legal_alert_statuses || []
        });
        setSettingsId(loadedSettings.id);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const recalculateAllStatuses = async () => {
    // Validate thresholds before recalculation
    const validation = validateThresholds(settings);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsRecalculating(true);
    setRecalcSuccess(false);
    setRecalcMessage('');
    
    try {
      const allRecords = await base44.entities.DebtorRecord.list();
      
      let updated = 0;
      const batchSize = 10;
      
      for (let i = 0; i < allRecords.length; i += batchSize) {
        const batch = allRecords.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (record) => {
            const newStatus = calculateDebtStatus(record.totalDebt, settings);
            
            if (record.debt_status_auto !== newStatus) {
              await base44.entities.DebtorRecord.update(record.id, {
                debt_status_auto: newStatus
              });
              updated++;
            }
          })
        );
        
        // Throttle to avoid rate limits
        if (i + batchSize < allRecords.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      setRecalcSuccess(true);
      setRecalcMessage(`${updated} רשומות עודכנו מתוך ${allRecords.length}`);
      toast.success(`${updated} רשומות עודכנו בהצלחה`);
      setTimeout(() => {
        setRecalcSuccess(false);
        setRecalcMessage('');
      }, 5000);
    } catch (err) {
      setError('שגיאה בחישוב מחדש של הסטטוסים: ' + err.message);
      toast.error('שגיאה בחישוב מחדש');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    // Validate using centralized validator
    const validation = validateThresholds(settings);
    if (!validation.valid) {
      setError(validation.error);
      toast.error(validation.error);
      setIsSaving(false);
      return;
    }

    try {
      const oldSettings = settingsId ? await base44.entities.Settings.list().then(l => l[0]) : {};
      
      if (settingsId) {
        await base44.entities.Settings.update(settingsId, settings);
      } else {
        const created = await base44.entities.Settings.create(settings);
        setSettingsId(created.id);
      }
      
      setSaveSuccess(true);
      toast.success('ההגדרות נשמרו בהצלחה');
      
      // בדוק אם הספים השתנו
      const thresholdsChanged = oldSettings && (
        oldSettings.threshold_ok_max !== settings.threshold_ok_max ||
        oldSettings.threshold_collect_from !== settings.threshold_collect_from ||
        oldSettings.threshold_legal_from !== settings.threshold_legal_from
      );
      
      if (thresholdsChanged) {
        // הפעל ריענון אוטומטי
        toast.info('הספים השתנו - מעדכן סטטוסים אוטומטית...');
        setTimeout(() => {
          recalculateAllStatuses();
        }, 500);
      } else {
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      setError(err.message || 'שגיאה בשמירת ההגדרות');
      toast.error('שגיאה בשמירת ההגדרות');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* פרטי הבניין */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-600" />
            פרטי הבניין
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>שם הבניין</Label>
            <Input
              value={settings.buildingName || ''}
              onChange={(e) => setSettings({...settings, buildingName: e.target.value})}
              className="mt-1"
            />
          </div>
          <div>
            <Label>כתובת</Label>
            <Input
              value={settings.buildingAddress || ''}
              onChange={(e) => setSettings({...settings, buildingAddress: e.target.value})}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* הגדרות סטטוס */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-600" />
            ספי סטטוס חוב אוטומטי
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>סף תקין (₪)</Label>
              <Input
                type="number"
                value={settings.threshold_ok_max || 0}
                onChange={(e) => setSettings({...settings, threshold_ok_max: parseFloat(e.target.value) || 0})}
                className="mt-1"
                dir="rtl"
              />
              <p className="text-xs text-slate-500 mt-1">עד סכום זה הסטטוס: תקין (ירוק)</p>
            </div>
            <div>
              <Label>סף לגבייה מיידית (₪)</Label>
              <Input
                type="number"
                value={settings.threshold_collect_from || 0}
                onChange={(e) => setSettings({...settings, threshold_collect_from: parseFloat(e.target.value) || 0})}
                className="mt-1"
                dir="rtl"
              />
              <p className="text-xs text-slate-500 mt-1">מעל סכום זה הסטטוס: לגבייה מיידית (כתום)</p>
            </div>
            <div>
              <Label>סף טיפול משפטי (₪)</Label>
              <Input
                type="number"
                value={settings.threshold_legal_from || 0}
                onChange={(e) => setSettings({...settings, threshold_legal_from: parseFloat(e.target.value) || 0})}
                className="mt-1"
                dir="rtl"
              />
              <p className="text-xs text-slate-500 mt-1">מעל סכום זה הסטטוס: לטיפול משפטי (אדום)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* התראות מייל על שינוי סטטוס משפטי */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-600" />
            התראות מייל - שינוי סטטוס משפטי
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>כתובת מייל לקבלת התראות</Label>
            <Input
              type="email"
              value={settings.legal_alert_email || ''}
              onChange={(e) => setSettings({...settings, legal_alert_email: e.target.value})}
              placeholder="example@mail.com"
              className="mt-1"
              dir="ltr"
            />
            <p className="text-xs text-slate-500 mt-1">
              כשמשנים סטטוס משפטי לאחד מהסטטוסים שנבחרו, יישלח מייל עם PDF
            </p>
          </div>

          <div>
            <Label className="mb-2 block">סטטוסים שיפעילו התראה</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {legalStatuses.length === 0 ? (
                <p className="text-xs text-slate-400">אין סטטוסים משפטיים פעילים</p>
              ) : (
                legalStatuses.map((status) => (
                  <div key={status.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`status-${status.id}`}
                      checked={(settings.legal_alert_statuses || []).includes(status.id)}
                      onChange={(e) => {
                        const newStatuses = e.target.checked
                          ? [...(settings.legal_alert_statuses || []), status.id]
                          : (settings.legal_alert_statuses || []).filter(id => id !== status.id);
                        setSettings({...settings, legal_alert_statuses: newStatuses});
                      }}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <label htmlFor={`status-${status.id}`} className="text-sm cursor-pointer flex-1">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${status.color}`}>
                        {status.name}
                      </span>
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* חיבור MAKE */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Webhook className="w-4 h-4 text-slate-600" />
            חיבור MAKE (Webhooks)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>הפעל חיבור MAKE</Label>
              <p className="text-xs text-slate-500">שליחת התראות אוטומטיות ל-MAKE</p>
            </div>
            <Switch
              checked={settings.makeEnabled || false}
              onCheckedChange={(checked) => setSettings({...settings, makeEnabled: checked})}
            />
          </div>

          {settings.makeEnabled && (
            <>
              <Separator />
              <div>
                <Label>URL לשינוי סטטוס</Label>
                <Input
                  value={settings.makeWebhookStatusChangeUrl || ''}
                  onChange={(e) => setSettings({...settings, makeWebhookStatusChangeUrl: e.target.value})}
                  placeholder="https://hook.make.com/..."
                  className="mt-1"
                  dir="ltr"
                />
              </div>
              <div>
                <Label>URL למועמד לתביעה חדש</Label>
                <Input
                  value={settings.makeWebhookNewLawsuitCandidateUrl || ''}
                  onChange={(e) => setSettings({...settings, makeWebhookNewLawsuitCandidateUrl: e.target.value})}
                  placeholder="https://hook.make.com/..."
                  className="mt-1"
                  dir="ltr"
                />
              </div>
              <div>
                <Label>URL לרשומה חדשה</Label>
                <Input
                  value={settings.makeWebhookNewRecordUrl || ''}
                  onChange={(e) => setSettings({...settings, makeWebhookNewRecordUrl: e.target.value})}
                  placeholder="https://hook.make.com/..."
                  className="mt-1"
                  dir="ltr"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* כפתור שמירה */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {saveSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-700">
            ההגדרות נשמרו בהצלחה
            {isRecalculating && ' • הסטטוסים מתרעננים...'}
          </AlertDescription>
        </Alert>
      )}

      {recalcSuccess && (
        <Alert className="bg-blue-50 border-blue-200">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-700">{recalcMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={isSaving || isRecalculating} className="flex-1">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              שומר...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 ml-2" />
              שמור הגדרות
            </>
          )}
        </Button>
        
        <Button 
          onClick={recalculateAllStatuses} 
          disabled={isSaving || isRecalculating}
          variant="outline"
          className="flex-1"
        >
          {isRecalculating ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              מעדכן...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 ml-2" />
              רענן סטטוסים
            </>
          )}
        </Button>
      </div>
    </div>
  );
}