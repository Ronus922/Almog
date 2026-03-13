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
  const fileRef = useRef();
  const { showAlert } = useAlert();

  const handleImport = async () => {
    const file = fileRef.current?.files[0];
    if (!file) {
      showAlert("בחר קובץ Excel לייבוא", "error");
      return;
    }
    
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
          
          if (!rows || rows.length === 0) {
            showAlert("הקובץ ריק או לא קריא", "error");
            setLoading(false);
            return;
          }

          let imported = 0;
          let failed = 0;

          for (const row of rows) {
            const apartmentNumber = String(row["apartment_number"] || row["apartment"] || row["A"] || "").trim();
            if (!apartmentNumber) continue;

            const contact = {
              apartment_number: apartmentNumber,
              owner_name: String(row["owner_name"] || row["B"] || "").trim(),
              owner_phone: String(row["owner_phone"] || row["C"] || "").trim(),
              owner_email: String(row["owner_email"] || row["D"] || "").trim(),
              tenant_name: String(row["tenant_name"] || row["E"] || "").trim(),
              tenant_phone: String(row["tenant_phone"] || row["F"] || "").trim(),
              tenant_email: String(row["tenant_email"] || row["G"] || "").trim(),
              contact_type: String(row["contact_type"] || row["type"] || "owner").trim(),
              address: String(row["address"] || "").trim(),
              notes: String(row["notes"] || "").trim(),
              management_fees: parseFloat(row["management_fees"] || row["H"] || 0) || 0,
            };

            try {
              await base44.entities.Contact.create(contact);
              imported++;
            } catch (error) {
              failed++;
            }
          }

          setLoading(false);
          const message = failed > 0 
            ? `יובאו ${imported} אנשי קשר (${failed} נכשלו)`
            : `יובאו בהצלחה ${imported} אנשי קשר`;
          showAlert(message, failed > 0 ? "error" : "success");
          onImported();
          onClose();
        } catch (error) {
          setLoading(false);
          showAlert("שגיאה בקריאת הקובץ: " + error.message, "error");
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      setLoading(false);
      showAlert("שגיאה: " + error.message, "error");
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "apartment_number",
        "owner_name",
        "owner_phone",
        "owner_email",
        "tenant_name",
        "tenant_phone",
        "tenant_email",
        "contact_type",
        "address",
        "notes",
        "management_fees",
      ],
      [
        "1",
        "דוד כהן",
        "972501234567",
        "david@example.com",
        "אברהם לוי",
        "972502345678",
        "abraham@example.com",
        "owner",
        "רחוב ראשי 10",
        "דירה בקומה ראשונה",
        "500",
      ],
    ]);
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
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700">
            <p className="font-medium mb-1">תבנית קובץ:</p>
            <p>A: מספר דירה | B: שם בעל דירה | C: טלפון | D: מייל |</p>
            <p>E: שם שוכר | F: טלפון | G: מייל | H: דמי ניהול</p>
          </div>

          <Button variant="outline" size="sm" className="gap-2 w-full" onClick={downloadTemplate}>
            <Download className="w-4 h-4" /> הורד תבנית Excel
          </Button>

          <div>
            <Label>קובץ Excel</Label>
            <Input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="mt-1" required />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button
            onClick={handleImport}
            disabled={loading}
            className="bg-[#3563d0] hover:bg-[#2a50b0] text-white gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> מייבא...</> : <><Upload className="w-4 h-4" /> ייבא</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}