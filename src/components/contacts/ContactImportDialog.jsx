import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Loader2, Upload, Download } from "lucide-react";
import { useAlert } from "@/components/notifications/AlertContext";
import * as XLSX from "xlsx";

export default function ContactImportDialog({ open, onClose, onImported }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [tags, setTags] = useState("");
  const fileRef = useRef();
  const { showAlert } = useAlert();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setPreview(rows.slice(0, 3));
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
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);
      let imported = 0;
      for (const row of rows) {
        const phone = String(row["phone"] || row["טלפון"] || row["Phone"] || "").trim();
        const name = String(row["name"] || row["שם"] || row["Name"] || "").trim();
        if (!phone || !name) continue;
        await base44.entities.Contact.create({
          name,
          phone,
          email: String(row["email"] || row["מייל"] || row["Email"] || "").trim(),
          tags: tagList,
          notes: String(row["notes"] || row["הערות"] || row["Notes"] || "").trim(),
        });
        imported++;
      }
      setLoading(false);
      showAlert(`יובאו ${imported} אנשי קשר`, "success");
      onImported();
      onClose();
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([["name", "phone", "email", "notes"], ["ישראל ישראלי", "972501234567", "israel@example.com", "הערה"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "אנשי קשר");
    XLSX.writeFile(wb, "contacts_template.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>ייבוא אנשי קשר מ-Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
            <Download className="w-4 h-4" /> הורד תבנית Excel
          </Button>
          <div>
            <Label>קובץ Excel</Label>
            <Input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="mt-1" onChange={handleFile} />
          </div>
          <div>
            <Label>תגיות לכל האנשי קשר המיובאים</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="לדוגמה: לקוח, ועד בית" className="mt-1" />
          </div>
          {preview && (
            <div className="text-xs bg-slate-50 rounded p-2 overflow-auto max-h-28">
              <p className="font-medium mb-1 text-slate-500">תצוגה מקדימה (3 שורות ראשונות):</p>
              {preview.map((r, i) => (
                <div key={i} className="text-slate-600">{JSON.stringify(r)}</div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={handleImport} disabled={loading} className="bg-[#3563d0] hover:bg-[#2a50b0] text-white gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> מייבא...</> : <><Upload className="w-4 h-4" /> ייבא</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}