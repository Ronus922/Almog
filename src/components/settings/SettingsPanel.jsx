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
  Loader2, CheckCircle2, AlertTriangle, Tag
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { base44 } from '@/api/base44Client';

export default function SettingsPanel() {
  const [settings, setSettings] = useState({
    highDebtThreshold: 1000,
    lawsuitDebtThreshold: 5000,
    monthsBeforeLawsuit: 3,
    low_threshold: 1500,
    mid_threshold: 5000,
    label_low: '',
    label_mid: 'חוב משמעותי',
    label_high: 'לטיפול משפטי',
    status_update_policy: 'manual',
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

    try {
      if (settingsId) {
        await base44.entities.Settings.update(settingsId, settings);
      } else {
        const created = await base44.entities.Settings.create(settings);
        setSettingsId(created.id);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'שגיאה בשמירת ההגדרות');
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
            הגדרות סטטוס וחוב
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>סף חוב משמעותי (₪)</Label>
              <Input
                type="number"
                value={settings.highDebtThreshold || 0}
                onChange={(e) => setSettings({...settings, highDebtThreshold: parseFloat(e.target.value) || 0})}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">חוב מעל סכום זה ייחשב "משמעותי"</p>
            </div>
            <div>
              <Label>סף חוב לתביעה מיידית (₪)</Label>
              <Input
                type="number"
                value={settings.lawsuitDebtThreshold || 0}
                onChange={(e) => setSettings({...settings, lawsuitDebtThreshold: parseFloat(e.target.value) || 0})}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>חודשי פיגור לפני "מועמד לתביעה"</Label>
            <Input
              type="number"
              value={settings.monthsBeforeLawsuit || 0}
              onChange={(e) => setSettings({...settings, monthsBeforeLawsuit: parseInt(e.target.value) || 0})}
              className="mt-1 max-w-32"
            />
          </div>

          <Separator className="my-4" />

          {/* ספי צביעת חוב */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-600" />
              <Label className="text-base font-semibold">ספי צביעת חוב (תיוג חזותי)</Label>
            </div>
            <p className="text-xs text-slate-500 -mt-2">
              ספים אלו משמשים לתצוגה חזותית בטבלה בלבד, ולא משנים סטטוס ידני
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>סף חוב נמוך (ירוק) - עד</Label>
                <Input
                  type="number"
                  value={settings.low_threshold || 0}
                  onChange={(e) => setSettings({...settings, low_threshold: parseFloat(e.target.value) || 0})}
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">תצוגה בירוק עד סכום זה</p>
              </div>
              <div>
                <Label>סף חוב בינוני (כתום) - מ־</Label>
                <Input
                  type="number"
                  value={settings.mid_threshold || 0}
                  onChange={(e) => setSettings({...settings, mid_threshold: parseFloat(e.target.value) || 0})}
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">כתום מסף נמוך, אדום מסף זה</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>תווית ירוק (אופציונלי)</Label>
                <Input
                  value={settings.label_low || ''}
                  onChange={(e) => setSettings({...settings, label_low: e.target.value})}
                  placeholder="תקין / ריק"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>תווית כתום</Label>
                <Input
                  value={settings.label_mid || ''}
                  onChange={(e) => setSettings({...settings, label_mid: e.target.value})}
                  placeholder="חוב משמעותי"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>תווית אדום</Label>
                <Input
                  value={settings.label_high || ''}
                  onChange={(e) => setSettings({...settings, label_high: e.target.value})}
                  placeholder="לטיפול משפטי"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* מדיניות עדכון סטטוס */}
          <div className="space-y-3 pt-2">
            <Label className="text-base font-semibold">מדיניות עדכון סטטוס בייבוא</Label>
            <p className="text-xs text-slate-500 -mt-1">
              מה קורה כאשר חוב=0 בייבוא אך סטטוס ידני הוא "חייב"?
            </p>
            
            <RadioGroup 
              value={settings.status_update_policy || 'manual'} 
              onValueChange={(value) => setSettings({...settings, status_update_policy: value})}
              className="space-y-3"
            >
              <div className="flex items-start gap-3 p-3 rounded-lg border-2 border-blue-200 bg-blue-50">
                <RadioGroupItem value="manual" id="manual" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="manual" className="cursor-pointer font-semibold text-blue-900">
                    לא לעדכן סטטוס אוטומטית (מומלץ)
                  </Label>
                  <p className="text-xs text-blue-700 mt-1">
                    סטטוס יישאר ידני. המערכת תסמן פער ותאפשר עדכון ידני.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200">
                <RadioGroupItem value="recommendations" id="recommendations" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="recommendations" className="cursor-pointer font-semibold">
                    הצג רשימת המלצות לאישור
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    לאחר ייבוא - הצג רשימת חייבים עם פער ואפשר אישור מרוכז.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200">
                <RadioGroupItem value="auto" id="auto" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="auto" className="cursor-pointer font-semibold">
                    עדכן אוטומטית ל"סדיר" כשחוב=0
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    רק אם סטטוס לא נעול וחוב אכן 0.
                  </p>
                </div>
              </div>
            </RadioGroup>
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
          <AlertDescription className="text-green-700">ההגדרות נשמרו בהצלחה</AlertDescription>
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