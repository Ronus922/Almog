import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Loader2, Upload, Download } from "lucide-react";
import { useAlert } from "@/components/notifications/AlertContext";
import * as XLSX from "xlsx";

export default function ContactImportDialog({ open, onClose, onImported }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [tags, setTags] = useState("");
  const [defaultType, setDefaultType] = useState("");
  const fileRef = useRef();
  const { showAlert } = useAlert();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "", header: 1 });
      setPreview(rows.slice(0, 4));
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    const file = fileRef.current?.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // Read as array of arrays to use column positions A,B,C...
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "", header: 1 });

      const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);
      let imported = 0;

      // Skip header row if first cell looks like a header
      const dataRows = rows[0] && isNaN(rows[0][0]) ? rows.slice(1) : rows;

      for (const row of dataRows) {
        const apartmentNumber = String(row[0] || "").trim();
        const ownerName      = String(row[1] || "").trim();
        const ownerPhone     = String(row[2] || "").trim();
        const ownerEmail     = String(row[3] || "").trim();
        const tenantName     = String(row[4] || "").trim();
        const tenantPhone    = String(row[5] || "").trim();
        const tenantEmail    = String(row[6] || "").trim();

        if (!ownerName && !tenantName) continue;

        // Determine primary contact based on defaultType or availability
        const type = defaultType || (ownerName ? "בעל דירה" : "שוכר");
        const primaryName  = type === "שוכר" && tenantName ? tenantName : ownerName || tenantName;
        const primaryPhone = type === "שוכר" && tenantPhone ? tenantPhone : ownerPhone || tenantPhone;
        const primaryEmail = type === "שוכר" && tenantEmail ? tenantEmail : ownerEmail || tenantEmail;

        if (!primaryPhone) continue;

        await base44.entities.Contact.create({
          apartment_number: apartmentNumber,
          owner_name:  ownerName,
          owner_phone: ownerPhone,
          owner_email: ownerEmail,
          tenant_name:  tenantName,
          tenant_phone: tenantPhone,
          tenant_email: tenantEmail,
          contact_type: type,
          name:  primaryName,
          phone: primaryPhone,
          email: primaryEmail,
          tags:  tagList,
        });
        imported++;
      }

      setLoading(false);
      showAlert(`יובאו ${imported} אנשי קשר`, "success");
      onImported();
      handleClose();
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["מספר דירה", "שם בעל דירה", "טלפון בעל דירה", "אימייל בעל דירה", "שם שוכר", "טלפון שוכר", "אימייל שוכר"],
      ["101", "ישראל ישראלי", "972501234567", "israel@example.com", "משה כהן", "972509876543", "moshe@example.com"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "אנשי קשר");
    XLSX.writeFile(wb, "contacts_template.xlsx");
  };

  const handleClose = () => {
    setPreview(null);
    setTags("");
    setDefaultType("");
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>ייבוא אנשי קשר מ-Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Template download */}
          <Button variant="outline" size="sm" className="gap-2 w-full" onClick={downloadTemplate}>
            <Download className="w-4 h-4" /> הורד תבנית Excel (עם כותרות)
          </Button>

          {/* Column legend */}
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700 mb-2">מבנה הקובץ הנדרש:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <span><strong>A</strong> – מספר דירה</span>
              <span><strong>E</strong> – שם שוכר</span>
              <span><strong>B</strong> – שם בעל דירה</span>
              <span><strong>F</strong> – טלפון שוכר</span>
              <span><strong>C</strong> – טלפון בעל דירה</span>
              <span><strong>G</strong> – אימייל שוכר</span>
              <span><strong>D</strong> – אימייל בעל דירה</span>
            </div>
          </div>

          {/* File input */}
          <div>
            <Label>קובץ Excel / CSV</Label>
            <Input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="mt-1" onChange={handleFile} />
          </div>

          {/* Default contact type */}
          <div>
            <Label>איש קשר ראשי לשליחת וואטסאפ</Label>
            <Select value={defaultType} onValueChange={setDefaultType}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="בחר לפי זמינות..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>לפי זמינות (אוטומטי)</SelectItem>
                <SelectItem value="בעל דירה">בעל דירה תמיד</SelectItem>
                <SelectItem value="שוכר">שוכר תמיד</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <Label>תגיות לכל האנשי קשר המיובאים (מופרדות בפסיק)</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="לדוגמה: ועד בית, דייר" className="mt-1" />
          </div>

          {/* Preview */}
          {preview && (
            <div className="bg-blue-50 rounded-lg p-3 text-xs overflow-auto max-h-32">
              <p className="font-semibold text-blue-700 mb-2">תצוגה מקדימה:</p>
              {preview.map((r, i) => (
                <div key={i} className="text-slate-600 truncate">{r.slice(0, 7).join(" | ")}</div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleClose}>ביטול</Button>
          <Button onClick={handleImport} disabled={loading || !fileRef.current?.files?.length} className="bg-[#3563d0] hover:bg-[#2a50b0] text-white gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> מייבא...</> : <><Upload className="w-4 h-4" /> ייבא</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}