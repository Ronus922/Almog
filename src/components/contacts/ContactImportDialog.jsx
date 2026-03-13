import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Loader2, Upload, FileUp } from "lucide-react";
import { useAlert } from "@/components/notifications/AlertContext";
import * as XLSX from "xlsx";

export default function ContactImportDialog({ open, onClose, onImported }) {
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef();
  const { showAlert } = useAlert();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      fileRef.current.files = e.dataTransfer.files;
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

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

          console.log("Total rows:", rows.length);
          console.log("First row:", rows[0]);

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
              console.log("Creating contact:", contact);
              await base44.entities.Contact.create(contact);
              imported++;
            } catch (error) {
              console.error(`Error creating contact ${apartmentNumber}:`, error.message);
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



  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileUp className="w-5 h-5 text-blue-600" />
            יובאו דוחות חייבים מאקסל
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-12 px-6">
          <div className="mb-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-slate-400" />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-slate-900 mb-2">השלחות קובץ אקסל</h3>
          <p className="text-sm text-slate-600 text-center mb-6">בחר קובץ XLSX או XLS עם דוחות החייבים</p>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`w-full border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : "border-slate-300 hover:border-slate-400"
            }`}
            onClick={() => fileRef.current?.click()}
          >
            <p className="text-slate-700 font-medium">
              {selectedFile?.name || "גרור קובץ או לחץ לבחירה"}
            </p>
          </div>

          <p className="text-xs text-slate-500 mt-3">.xlsx, .xls, .csv קבלות</p>

          <Button
            onClick={handleImport}
            disabled={loading || !selectedFile}
            className="mt-8 bg-blue-600 hover:bg-blue-700 text-white gap-2 px-8"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                מייבא...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                בחר קובץ Excel
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}