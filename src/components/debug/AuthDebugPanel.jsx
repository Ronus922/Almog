import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, Shield } from "lucide-react";

export default function AuthDebugPanel({ currentUser }) {
  const [isVisible, setIsVisible] = useState(false);
  const [probeResults, setProbeResults] = useState(null);
  const [isProbing, setIsProbing] = useState(false);

  const runAccessProbe = async () => {
    setIsProbing(true);
    const results = {
      userInfo: {
        email: currentUser?.email || 'N/A',
        username: currentUser?.username || 'N/A',
        role: currentUser?.role || 'N/A',
        isBase44Admin: currentUser?.isBase44Admin || false,
      },
      endpoints: []
    };

    // Test 1: Status Management
    try {
      await base44.entities.Status.list();
      results.endpoints.push({
        name: 'Status Management',
        endpoint: 'Status.list()',
        status: 200,
        message: '✓ גישה מלאה'
      });
    } catch (error) {
      results.endpoints.push({
        name: 'Status Management',
        endpoint: 'Status.list()',
        status: error.response?.status || 500,
        message: error.message || 'שגיאה',
        error: true
      });
    }

    // Test 2: Settings
    try {
      await base44.entities.Settings.list();
      results.endpoints.push({
        name: 'Settings',
        endpoint: 'Settings.list()',
        status: 200,
        message: '✓ גישה מלאה'
      });
    } catch (error) {
      results.endpoints.push({
        name: 'Settings',
        endpoint: 'Settings.list()',
        status: error.response?.status || 500,
        message: error.message || 'שגיאה',
        error: true
      });
    }

    // Test 3: Debtor Records
    try {
      await base44.entities.DebtorRecord.list();
      results.endpoints.push({
        name: 'Debtor Records',
        endpoint: 'DebtorRecord.list()',
        status: 200,
        message: '✓ גישה מלאה'
      });
    } catch (error) {
      results.endpoints.push({
        name: 'Debtor Records',
        endpoint: 'DebtorRecord.list()',
        status: error.response?.status || 500,
        message: error.message || 'שגיאה',
        error: true
      });
    }

    setProbeResults(results);
    setIsProbing(false);
  };

  if (!currentUser) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50" dir="rtl">
      {!isVisible ? (
        <Button
          onClick={() => setIsVisible(true)}
          size="sm"
          variant="outline"
          className="shadow-lg bg-white hover:bg-slate-50"
        >
          <Shield className="w-4 h-4 ml-2" />
          אבחון הרשאות
        </Button>
      ) : (
        <Card className="w-96 shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">אבחון הרשאות</CardTitle>
              <Button
                onClick={() => setIsVisible(false)}
                size="sm"
                variant="ghost"
              >
                <EyeOff className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {/* User Info */}
            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600">אימייל:</span>
                <span className="font-mono text-slate-800">{probeResults?.userInfo.email || currentUser?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600">משתמש:</span>
                <span className="font-mono text-slate-800">{probeResults?.userInfo.username || currentUser?.username || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-600">תפקיד:</span>
                <Badge className={
                  (currentUser?.role === 'admin' || currentUser?.role === 'ADMIN' || 
                   currentUser?.role === 'SUPER_ADMIN' || currentUser?.isBase44Admin)
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-100 text-blue-700'
                }>
                  {probeResults?.userInfo.role || currentUser?.role || 'N/A'}
                </Badge>
              </div>
              {currentUser?.isBase44Admin && (
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-600">Base44 Admin:</span>
                  <Badge className="bg-purple-100 text-purple-700">✓ כן</Badge>
                </div>
              )}
            </div>

            {/* Access Probe */}
            <div>
              <Button
                onClick={runAccessProbe}
                disabled={isProbing}
                className="w-full"
                size="sm"
              >
                {isProbing ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    בודק גישה...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 ml-2" />
                    בדוק גישה ל-Endpoints
                  </>
                )}
              </Button>
            </div>

            {/* Results */}
            {probeResults && (
              <div className="space-y-2">
                <p className="font-bold text-slate-700">תוצאות בדיקה:</p>
                {probeResults.endpoints.map((result, idx) => (
                  <Alert 
                    key={idx}
                    className={result.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}
                  >
                    <AlertDescription className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {result.error ? (
                          <XCircle className="w-4 h-4 text-red-600" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        )}
                        <div>
                          <div className="font-bold">{result.name}</div>
                          <div className="text-slate-600">{result.endpoint}</div>
                        </div>
                      </div>
                      <div className="text-left">
                        <Badge className={result.error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                          {result.status}
                        </Badge>
                        <div className="text-slate-600 mt-1">{result.message}</div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Interpretation */}
            {probeResults && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-xs">
                  {probeResults.endpoints.every(r => !r.error) ? (
                    <div className="text-green-700 font-semibold">
                      ✓ כל ההרשאות פעילות – המערכת עובדת כראוי
                    </div>
                  ) : probeResults.endpoints.every(r => r.error) ? (
                    <div className="text-red-700 font-semibold">
                      ✗ כל הגישות נחסמו – בעיית הרשאות כללית
                    </div>
                  ) : (
                    <div className="text-orange-700 font-semibold">
                      ⚠ חסימה חלקית – יש בעיה ספציפית באחד מה-Entities
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}