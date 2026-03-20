import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertCircle, Upload, Camera, Video, VideoIcon, X } from "lucide-react";

export default function ReportIssue() {
  const [form, setForm] = useState({
    target_type: "room",
    target_id: "",
    priority: "medium",
    description: "",
    reporter_email: "",
  });
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const { data: areas = [] } = useQuery({
    queryKey: ["areas"],
    queryFn: () => base44.entities.Area.list(),
  });

  // Mock rooms list — in real scenario fetch from entity
  const rooms = Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1), name: `חדר ${i + 1}` }));

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) { setError("ניתן להעלות עד 5 תמונות"); return; }
    setUploadingImages(true);
    setError("");
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setImages((prev) => [...prev, ...urls]);
    setUploadingImages(false);
    e.target.value = "";
  };

  const handleVideoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (videos.length + files.length > 3) { setError("ניתן להעלות עד 3 סרטונים"); return; }
    setUploadingVideos(true);
    setError("");
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setVideos((prev) => [...prev, ...urls]);
    setUploadingVideos(false);
    e.target.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.target_id || !form.description.trim()) {
      setError("יש למלא את כל השדות הנדרשים");
      return;
    }
    setSaving(true);
    setError("");
    await base44.entities.IssueReport.create({ ...form, images, videos, status: "open" });
    setSaving(false);
    setSuccess(true);
  };

  const handleReset = () => {
    setSuccess(false);
    setForm({ target_type: "room", target_id: "", priority: "medium", description: "", reporter_email: "" });
    setImages([]);
    setVideos([]);
    setError("");
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6" dir="rtl">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">הדיווח נשלח בהצלחה!</h2>
          <p className="text-slate-500 mb-8">נטפל בתקלה בהקדם האפשרי</p>
          <button
            onClick={handleReset}
            className="w-full h-12 rounded-2xl bg-gradient-to-l from-orange-500 to-orange-400 text-white font-bold text-base shadow-md hover:shadow-lg transition-all"
          >
            דיווח תקלה נוספת
          </button>
        </div>
      </div>
    );
  }

  const targetOptions = form.target_type === "room"
    ? rooms
    : areas.filter((a) => a.active !== false).map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50" dir="rtl">
      <div className="max-w-lg mx-auto px-4 py-8 pb-24">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-800">דיווח על תקלה</h1>
            <p className="text-sm text-slate-400 mt-0.5">דווח על בעיה או תקלה שזקוקה לטיפול</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center shadow-sm">
            <AlertCircle className="w-6 h-6 text-orange-500" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* פרטי התקלה */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-5">
            <h2 className="text-base font-bold text-slate-700 text-right">פרטי התקלה</h2>

            {/* סוג מיקום */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 text-right">סוג מיקום *</label>
              <Select value={form.target_type} onValueChange={(v) => setForm((p) => ({ ...p, target_type: v, target_id: "" }))}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white text-right text-slate-700 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="room">חדר</SelectItem>
                  <SelectItem value="area">אזור</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* מספר חדר / אזור */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 text-right">
                {form.target_type === "room" ? "מספר חדר *" : "אזור *"}
              </label>
              <Select value={form.target_id} onValueChange={(v) => setForm((p) => ({ ...p, target_id: v }))}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white text-right text-slate-700 font-medium">
                  <SelectValue placeholder={form.target_type === "room" ? "...בחר חדר" : "...בחר אזור"} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {targetOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* דחיפות */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 text-right">דחיפות *</label>
              <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white text-right text-slate-700 font-medium">
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

            {/* תיאור */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 text-right">תיאור התקלה *</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="תאר את התקלה בפירוט... מה הבעיה? איפה בדיוק?"
                className="rounded-2xl border-slate-200 min-h-[110px] resize-none text-right text-sm placeholder:text-slate-300"
                dir="rtl"
              />
            </div>
          </div>

          {/* תמונות */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-700 text-right px-1">תמונות (עד 5 תמונות)</h2>

            {/* תמונות שהועלו */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {images.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded-xl border border-slate-200" />
                    <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* בחר מגלריה */}
              <label className={`relative flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${images.length >= 5 ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-green-300 hover:border-green-400 hover:bg-green-50/30'}`}>
                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-sm font-semibold text-slate-700">בחר מגלריה</span>
                <span className="text-xs text-slate-400">{images.length}/5 תמונות</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImages || images.length >= 5} />
              </label>

              {/* צלם תמונה */}
              <label className={`relative flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${images.length >= 5 ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50/30'}`}>
                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-sm font-semibold text-slate-700">צלם תמונה</span>
                <span className="text-xs text-slate-400">פתח מצלמה</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} disabled={uploadingImages || images.length >= 5} />
              </label>
            </div>
            {uploadingImages && <p className="text-xs text-blue-500 text-center">מעלה תמונות...</p>}
          </div>

          {/* סרטונים */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-700 text-right px-1">סרטונים (עד 3 סרטונים)</h2>

            {videos.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {videos.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center">
                    <VideoIcon className="w-6 h-6 text-slate-400" />
                    <button type="button" onClick={() => setVideos((p) => p.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* בחר וידאו */}
              <label className={`relative flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${videos.length >= 3 ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-purple-300 hover:border-purple-400 hover:bg-purple-50/30'}`}>
                <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-purple-500" />
                </div>
                <span className="text-sm font-semibold text-slate-700">בחר וידאו</span>
                <span className="text-xs text-slate-400">{videos.length}/3 סרטונים</span>
                <input type="file" multiple accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploadingVideos || videos.length >= 3} />
              </label>

              {/* צלם וידאו */}
              <label className={`relative flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${videos.length >= 3 ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-purple-300 hover:border-purple-400 hover:bg-purple-50/30'}`}>
                <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center">
                  <Video className="w-5 h-5 text-purple-500" />
                </div>
                <span className="text-sm font-semibold text-slate-700">צלם וידאו</span>
                <span className="text-xs text-slate-400">פתח מצלמה</span>
                <input type="file" accept="video/*" capture="environment" className="hidden" onChange={handleVideoUpload} disabled={uploadingVideos || videos.length >= 3} />
              </label>
            </div>
            {uploadingVideos && <p className="text-xs text-purple-500 text-center">מעלה סרטון...</p>}
          </div>

          {/* שגיאה */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium text-right">
              {error}
            </div>
          )}

          {/* כפתורים */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="h-14 rounded-2xl bg-gradient-to-l from-orange-500 to-orange-400 text-white font-bold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <AlertCircle className="w-5 h-5" />
              {saving ? "שולח..." : "שלח דיווח"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="h-14 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-base hover:bg-slate-50 transition-all"
            >
              ביטול
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}