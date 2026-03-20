import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Upload, X } from "lucide-react";

export default function ReportIssue() {
  const [form, setForm] = useState({
    target_type: "room",
    target_id: "",
    description: "",
    priority: "medium",
    reporter_email: "",
  });
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) {
      setError("ניתן להעלות עד 5 תמונות");
      return;
    }
    setUploading(true);
    setError("");
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setImages((prev) => [...prev, ...urls]);
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.target_id.trim() || !form.description.trim()) {
      setError("יש למלא את כל השדות הנדרשים");
      return;
    }
    setSaving(true);
    setError("");
    await base44.entities.IssueReport.create({
      ...form,
      images,
      status: "open",
    });
    setSaving(false);
    setSuccess(true);
    setForm({ target_type: "room", target_id: "", description: "", priority: "medium", reporter_email: "" });
    setImages([]);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6" dir="rtl">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">התקלה דווחה בהצלחה!</h2>
          <p className="text-slate-500 mb-6">נטפל בתקלה בהקדם האפשרי</p>
          <Button onClick={() => setSuccess(false)} className="bg-blue-600 hover:bg-blue-700 text-white w-full">
            דיווח תקלה נוספת
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">דיווח תקלה</h1>
          </div>
          <p className="text-slate-500 text-sm">מלא את הפרטים הבאים לדיווח על תקלה</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-700 border-b border-slate-100 pb-3">פרטי המיקום</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">סוג יעד</label>
                <Select value={form.target_type} onValueChange={(v) => setForm((p) => ({ ...p, target_type: v }))}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="room">חדר</SelectItem>
                    <SelectItem value="area">אזור</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">מזהה / שם המיקום *</label>
                <Input
                  value={form.target_id}
                  onChange={(e) => setForm((p) => ({ ...p, target_id: e.target.value }))}
                  placeholder="לדוגמה: חדר 5, מטבח..."
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-700 border-b border-slate-100 pb-3">פרטי התקלה</h3>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">תיאור התקלה *</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="תאר את התקלה בפירוט..."
                className="rounded-xl border-slate-200 min-h-[100px] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">דחיפות</label>
                <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">נמוכה</SelectItem>
                    <SelectItem value="medium">בינונית</SelectItem>
                    <SelectItem value="high">גבוהה</SelectItem>
                    <SelectItem value="urgent">דחוף</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">אימייל מדווח</label>
                <Input
                  type="email"
                  value={form.reporter_email}
                  onChange={(e) => setForm((p) => ({ ...p, reporter_email: e.target.value }))}
                  placeholder="your@email.com"
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-700 border-b border-slate-100 pb-3">תמונות (עד 5)</h3>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
              <Upload className="w-6 h-6 text-slate-400 mb-2" />
              <span className="text-sm text-slate-500">לחץ להעלאת תמונות</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading || images.length >= 5} />
            </label>
            {uploading && <p className="text-sm text-blue-600 text-center">מעלה תמונות...</p>}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                    <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-red-600 text-sm font-medium bg-red-50 rounded-xl px-4 py-3">{error}</p>}

          <Button type="submit" disabled={saving} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base font-bold">
            {saving ? "שולח..." : "שלח דיווח"}
          </Button>
        </form>
      </div>
    </div>
  );
}