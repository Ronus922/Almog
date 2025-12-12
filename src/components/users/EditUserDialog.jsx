import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

export default function EditUserDialog({ user, isOpen, onClose, onSave, existingUsernames }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    password: '',
    role: 'viewer_password',
    is_active: true
  });
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        password: '', // Always empty for edit
        role: user.role || 'viewer_password',
        is_active: user.is_active !== false
      });
    }
    setFormError('');
    setShowPassword(false);
  }, [user, isOpen]);

  const handleSubmit = () => {
    setFormError('');

    // Validation
    if (!formData.first_name.trim()) {
      setFormError('יש להזין שם פרטי');
      return;
    }

    if (!formData.username.trim()) {
      setFormError('נא להזין שם משתמש');
      return;
    }

    const englishOnly = /^[A-Za-z0-9._-]+$/;
    if (!englishOnly.test(formData.username)) {
      setFormError('שם משתמש חייב להיות באנגלית בלבד (אותיות, מספרים, . _ -)');
      return;
    }

    // Check if username already exists (excluding current user)
    if (existingUsernames.some(u => u !== user.username && u === formData.username)) {
      setFormError('שם משתמש כבר קיים במערכת');
      return;
    }

    // Password validation (only if provided)
    if (formData.password) {
      const passwordPattern = /^[A-Za-z0-9]{6,10}$/;
      if (!passwordPattern.test(formData.password)) {
        setFormError('סיסמה חייבת להיות 6-10 תווים (אותיות ומספרים בלבד)');
        return;
      }
    }

    onSave(formData);
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-md" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-2xl font-bold">עריכת משתמש</DialogTitle>
        </DialogHeader>

        {formError && (
          <Alert className="bg-red-50 border-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm font-medium">
                {formError}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="text-right">
            <Label className="text-sm font-bold text-slate-700 mb-2 block">
              שם פרטי <span className="text-red-600">*</span>
            </Label>
            <Input
              placeholder="שם פרטי"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="h-11 rounded-xl text-right"
              dir="rtl"
            />
          </div>

          <div className="text-right">
            <Label className="text-sm font-bold text-slate-700 mb-2 block">
              שם משפחה
            </Label>
            <Input
              placeholder="שם משפחה (אופציונלי)"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="h-11 rounded-xl text-right"
              dir="rtl"
            />
          </div>

          <div className="text-right">
            <Label className="text-sm font-bold text-slate-700 mb-2 block">
              שם משתמש (אנגלית בלבד) <span className="text-red-600">*</span>
            </Label>
            <Input
              placeholder="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="h-11 rounded-xl text-left"
              dir="ltr"
            />
          </div>

          <div className="text-right">
            <Label className="text-sm font-bold text-slate-700 mb-2 block">
              סיסמה חדשה (אופציונלי)
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="השאר ריק לשמירה ללא שינוי"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-11 rounded-xl text-left pr-10"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1 text-right">
              6-10 תווים, אותיות ומספרים בלבד
            </p>
          </div>

          <div className="text-right">
            <Label className="text-sm font-bold text-slate-700 mb-2 block">תפקיד</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger className="h-11 rounded-xl text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">מנהל</SelectItem>
                <SelectItem value="viewer_password">צפייה עם סיסמה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-right">
            <Label className="text-sm font-bold text-slate-700 mb-2 block">סטטוס</Label>
            <Select
              value={formData.is_active ? "active" : "inactive"}
              onValueChange={(value) => setFormData({ ...formData, is_active: value === "active" })}
            >
              <SelectTrigger className="h-11 rounded-xl text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">פעיל</SelectItem>
                <SelectItem value="inactive">מושבת</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl"
            >
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              שמור שינויים
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}