import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Loader2, Upload, FileUp } from "lucide-react";
import { useAlert } from "@/components/notifications/AlertContext";

export default function ContactImportDialog({ open, onClose, onImported }) {
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
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

  const mapHebrewColumns = (row) => {
    const data = {};
    
    // Apartment number - דיוק
    const apartmentNum = String(row["דירה"] || row["apartment_number"] || row["A"] || "").trim();
    if (apartmentNum) data.apartment_number = apartmentNum;
    
    // Owner name - בעל דירה
    const ownerName = String(row["שם בעלים"] || row["owner_name"] || row["B"] || "").trim();
    if (ownerName) data.owner_name = ownerName;
    
    // Owner phone
    const ownerPhone = String(row["טלפון בעלים"] || row["owner_phone"] || row["C"] || "").trim();
    if (ownerPhone) data.owner_phone = ownerPhone;
    
    // Owner email
    const ownerEmail = String(row["אימייל בעלים"] || row["owner_email"] || row["D"] || "").trim();
    if (ownerEmail) data.owner_email = ownerEmail;
    
    // Tenant name
    const tenantName = String(row["שם שוכר"] || row["tenant_name"] || row["E"] || "").trim();
    if (tenantName) data.tenant_name = tenantName;
    
    // Tenant phone
    const tenantPhone = String(row["טלפון שוכר"] || row["tenant_phone"] || row["F"] || "").trim();
    if (tenantPhone) data.tenant_phone = tenantPhone;
    
    // Tenant email
    const tenantEmail = String(row["אימייל שוכר"] || row["tenant_email"] || row["G"] || "").trim();
    if (tenantEmail) data.tenant_email = tenantEmail;
    
    // Contact type
    const contactType = String(row["contact_type"] || row["type"] || "owner").trim();
    if (contactType) data.contact_type = contactType;
    
    // Address
    const address = String(row["address"] || "").trim();
    if (address) data.address = address;
    
    // Notes
    const notes = String(row["notes"] || "").trim();
    if (notes) data.notes = notes;
    
    // Management fees
    const fees = parseFloat(row["תשלום חודשי"] || row["management_fees"] || row["H"] || 0);
    if (!isNaN(fees) && fees > 0) data.management_fees = fees;
    
    return data;
  };

  const handleImport = async () => {
    const file = selectedFile;
    if (!file) {
      showAlert("בחר קובץ Excel לייבוא", "error");
      return;
    }

    setLoading(true);
    setProgress(0);
    setProgressText("קורא קובץ...");

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          // Dynamic import for XLSX
          const XLSX = await import('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.mini.min.js');
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
          let skipped = 0;
          const totalRows = rows.length;

          setProgressText(`מייבא 0 מתוך ${totalRows}...`);

          for (let i = 0; i < totalRows; i++) {
            const row = rows[i];
            
            try {
              const contact = mapHebrewColumns(row);

              // דלג על שורות ללא מספר דירה
              if (!contact.apartment_number) {
                skipped++;
                const currentProgress = Math.round(((i + 1) / totalRows) * 100);
                setProgress(currentProgress);
                setProgressText(`מייבא ${imported + failed} מתוך ${totalRows}... (דלג על ${skipped})`);
                continue;
              }

              // כל שדה שלא תקין - פשוט תדלג עליו, המשך עם השאר
              await base44.entities.Contact.create(contact);
              imported++;
            } catch (error) {
              console.error(`Error processing row ${i + 1}:`, error.message);
              failed++;
            }

            const currentProgress = Math.round(((i + 1) / totalRows) * 100);
            setProgress(currentProgress);
            setProgressText(`מייבא ${imported + failed} מתוך ${totalRows}... (דלג על ${skipped})`);
          }

          setLoading(false);
          
          let message = `יובאו ${imported} אנשי קשר`;
          if (failed > 0) message += ` (${failed} שגיאות)`;
          if (skipped > 0) message += ` (דלג על ${skipped})`;
          
          showAlert(message, imported > 0 ? "success" : "error");
          
          if (imported > 0) {
            onImported();
            setTimeout(() => {
              onClose();
              setProgress(0);
              setProgressText("");
              setSelectedFile(null);
            }, 1000);
          }
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="mb-6">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
            <p className="text-lg font-semibold text-slate-900 mb-4">{progressText}</p>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-slate-600 mt-3">{progress}%</p>
          </div>
        ) : (
          <>
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
                disabled={!selectedFile}
                className="mt-8 bg-blue-600 hover:bg-blue-700 text-white gap-2 px-8"
              >
                <Upload className="w-4 h-4" />
                בחר קובץ Excel
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}