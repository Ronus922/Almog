import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertCircle, Upload, Camera, Video, VideoIcon, X, Users } from "lucide-react";

export default function ReportIssue() {
  const [form, setForm] = useState({
    target_type: "room",
    target_id: "",
    priority: "medium",
    description: "",
    assigned_to: "",
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

  const { data: appUsers = [] } = useQuery({
    queryKey: ["appUsers"],
    queryFn: () => base44.entities.AppUser.list(),
  });

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
    setForm({ target_type: "room", target_id: "", priority: "medium", description: "", assigned_to: "" });
    setImages([]);
    setVideos([]);
    setError("");
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6" dir="rtl">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">הדיווח נשלח בהצלחה!</h2>
          <p className="text-slate-500 mb-8">נטפל בתקלה בהקדם האפשרי</p>
          <button
            onClick={handleReset}
            className="w-full h-14 rounded-2xl text-white font-bold text-base shadow-lg bg-gradient-to-l from-red-500 to-orange-400 hover:opacity-90 transition-all"
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
    <div className="min-h-screen bg-white" dir="rtl">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center shadow-sm flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">דיווח על תקלה</h1>
              <p className="text-sm text-slate-400 mt-0.5">דווח על בעיה או תקלה שזקוקה לטיפול</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7 space-y-6">
            <h2 className="text-lg font-bold text-slate-700 border-b border-slate-100 pb-3">פרטי התקלה</h2>

            {/* שורה 1: סוג מיקום + מספר חדר/אזור */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">סוג מיקום *</label>
                <Select value={form.target_type} onValueChange={(v) => setForm((p) => ({ ...p, target_type: v, target_id: "" }))}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 text-slate-700 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="room">חדר</SelectItem>
                    <SelectItem value="area">אזור</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  {form.target_type === "room" ? "מספר חדר *" : "אזור *"}
                </label>
                <Select value={form.target_id} onValueChange={(v) => setForm((p) => ({ ...p, target_id: v }))}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 text-slate-700 font-medium">
                    <SelectValue placeholder={form.target_type === "room" ? "...בחר חדר" : "...בחר אזור"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {targetOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* שורה 2: דחיפות + שתף עם */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">דחיפות *</label>
                <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 text-slate-700 font-medium">
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

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-400" />
                  שתף עם
                </label>
                <Select value={form.assigned_to} onValueChange={(v) => setForm((p) => ({ ...p, assigned_to: v }))}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 text-slate-700 font-medium">
                    <SelectValue placeholder="...בחר משתמש" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {appUsers.map((u) => (
                      <SelectItem key={u.id} value={u.username}>
                        {u.first_name} {u.last_name || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* שורה 3: תיאור */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">תיאור התקלה *</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="תאר את התקלה בפירוט... מה הבעיה? איפה בדיוק?"
                className="rounded-xl border-slate-200 bg-slate-50 min-h-[120px] resize-none text-right text-sm placeholder:text-slate-300"
                dir="rtl"
              />
            </div>

            {/* שורה 4: תמונות */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                תמונות
                <span className="text-slate-400 font-normal mr-1">(עד 5 תמונות)</span>
              </label>

              {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
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
                <label className={`flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${images.length >= 5 ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-green-300 hover:border-green-400 hover:bg-green-50/40'}`}>
                  <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-green-500" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">בחר מגלריה</span>
                  <span className="text-xs text-slate-400">{images.length}/5 תמונות</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImages || images.length >= 5} />
                </label>

                <label className={`flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${images.length >= 5 ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50/40'}`}>
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

            {/* שורה 5: סרטונים */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                סרטונים
                <span className="text-slate-400 font-normal mr-1">(עד 3 סרטונים)</span>
              </label>

              {videos.length > 0 && (
                <div className="flex flex-wrap gap-2">
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
                <label className={`flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${videos.length >= 3 ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-purple-300 hover:border-purple-400 hover:bg-purple-50/40'}`}>
                  <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-purple-500" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">בחר וידאו</span>
                  <span className="text-xs text-slate-400">{videos.length}/3 סרטונים</span>
                  <input type="file" multiple accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploadingVideos || videos.length >= 3} />
                </label>

                <label className={`flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${videos.length >= 3 ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-purple-300 hover:border-purple-400 hover:bg-purple-50/40'}`}>
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
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium text-right">
                {error}
              </div>
            )}

            {/* כפתורים: ביטול מימין, שלח משמאל */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="h-14 px-8 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-base hover:bg-slate-50 transition-all"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 h-14 text-base bg-gradient-to-l from-red-500 to-orange-400 hover:opacity-90 shadow-lg rounded-2xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
              >
                <AlertCircle className="w-5 h-5" />
                {saving ? "שולח..." : "שלח דיווח"}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}