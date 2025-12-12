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
  Loader2, CheckCircle2, AlertTriangle
} from "lucide-react";
import { base44 } from '@/api/base44Client';

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
    buildingAddress: 'דוד אלעזר 10, חיפה'
  });
  const [settingsId, setSettingsId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsList = await base44.entities.Settings.list();
      if (settingsList.length > 0) {
        setSettings(settingsList[0]);
        setSettingsId(settingsList[0].id);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    // Validation
    if (settings.threshold_ok_max >= settings.threshold_collect_from) {
      setError('סף תקין חייב להיות קטן מסף לגבייה מיידית');
      setIsSaving(false);
      return;
    }
    if (settings.threshold_collect_from >= settings.threshold_legal_from) {
      setError('סף לגבייה מיידית חייב להיות קטן מסף טיפול משפטי');
      setIsSaving(false);
      return;
    }

    try {
      if (settingsId) {
        await base44.entities.Settings.update(settingsId, settings);
      } else {
        const created = await base44.entities.Settings.create(settings);
        setSettingsId(created.id);
      }
      
      // Recalculate all records
      const records = await base44.entities.DebtorRecord.list();
      for (const record of records) {
        const newStatus = calculateDebtStatus(record.totalDebt || 0);
        if (record.debt_status_auto !== newStatus) {
          await base44.entities.DebtorRecord.update(record.id, { debt_status_auto: newStatus });
        }
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'שגיאה בשמירת ההגדרות');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateDebtStatus = (totalDebt) => {
    if (totalDebt <= settings.threshold_ok_max) return 'תקין';
    if (totalDebt > settings.threshold_ok_max && totalDebt < settings.threshold_legal_from) return 'לגבייה מיידית';
    return 'לטיפול משפטי';
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
          <AlertDescription className="text-green-700">ההגדרות נשמרו והסטטוסים עודכנו בהתאם לספים החדשים</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
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
    </div>
  );
}