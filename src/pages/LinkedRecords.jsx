import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Loader2, Shield, Printer } from "lucide-react";
import DebtorsTable from '../components/dashboard/DebtorsTable';
import ApartmentDetailModal from '../components/dashboard/ApartmentDetailModal';
import ExcelExporter from '../components/export/ExcelExporter';
import PDFExporter from '../components/export/PDFExporter';
import AppButton from "@/components/ui/app-button";
import { useAuth } from '@/components/auth/AuthContext';
import { isManagerRole } from '@/components/utils/roles';

export default function LinkedRecords() {
  const { currentUser } = useAuth();
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // קריאת פרמטרים מה-URL
  const urlParams = new URLSearchParams(window.location.search);
  const statusId = urlParams.get('statusId');
  const statusName = urlParams.get('statusName');

  const { data: debtorRecords = [], isLoading } = useQuery({
    queryKey: ['debtorRecords'],
    queryFn: () => base44.entities.DebtorRecord.list(),
  });

  const { data: allStatuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => base44.entities.Status.list(),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.Settings.list(),
  });

  const settings = settingsList[0] || {};
  const isAdmin = isManagerRole(currentUser);

  // סינון רשומות לפי סטטוס מקושר
  const linkedRecords = useMemo(() => {
    return debtorRecords.filter(r => r.legal_status_id === statusId);
  }, [debtorRecords, statusId]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DebtorRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      setIsModalOpen(false);
    },
  });

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleSaveRecord = async (editedRecord) => {
    await updateMutation.mutateAsync({ id: editedRecord.id, data: editedRecord });
  };

  if (!currentUser || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
        <Card className="max-w-md">
          <div className="p-6">
            <div className="text-center">
              <Shield className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h2 className="text-xl font-bold text-slate-800 mb-2">גישה מוגבלת</h2>
              <p className="text-slate-600 mb-4">אין לך הרשאה לגשת לדף זה</p>
              <Button onClick={() => navigate(createPageUrl('Dashboard'))}>חזור לדשבורד</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100" dir="rtl">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .debtors-table-container, .debtors-table-container * {
            visibility: visible;
          }
          .debtors-table-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button, .filter-controls {
            display: none !important;
          }
        }
      `}</style>
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
        {/* כותרת */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-extrabold text-slate-800">
              רשומות מקושרות לסטטוס
            </h1>
            <p className="text-xs md:text-sm text-slate-600 font-medium mt-1">
              <span className="font-bold text-blue-600">{statusName || 'לא ידוע'}</span>
              {' • '}
              סה״כ: <span className="font-bold text-blue-600">{linkedRecords.length}</span> דירות
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <AppButton 
              variant="outline" 
              size="md" 
              icon={Printer} 
              onClick={() => window.print()}
              className="hover:text-slate-900"
            >
              הדפס
            </AppButton>
            <ExcelExporter records={linkedRecords} statuses={allStatuses} />
            <PDFExporter records={linkedRecords} statuses={allStatuses} settings={settings} />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(createPageUrl('Dashboard'))}
              className="gap-2 rounded-xl h-10 px-4 font-semibold"
            >
              <ArrowRight className="w-4 h-4" />
              חזרה לדשבורד
            </Button>
          </div>
        </div>

        {/* טבלת חייבים - אותה טבלה מהדשבורד */}
        <DebtorsTable 
          records={linkedRecords} 
          onRowClick={handleRowClick}
          isAdmin={isAdmin}
          settings={settings}
          initialStatusFilter={statusName}
          allStatuses={allStatuses}
          hideStatusFilter={true}
        />

        {/* מודל פרטי דירה */}
        <ApartmentDetailModal
          record={selectedRecord}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveRecord}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}