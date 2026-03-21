import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Navigate, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import StatusWorkflowWizard from '../components/workflow/StatusWorkflowWizard';
import ApartmentDetailModal from '../components/dashboard/ApartmentDetailModal';
import AuthDebugPanel from '../components/debug/AuthDebugPanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
"@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import { AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger } from
"@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Shield, Loader2, Save, X, ArrowRight, SlidersHorizontal, Wrench, Palette } from "lucide-react";
import { toast } from "sonner";
import { isManagerRole, getUserRoleDisplay } from '@/components/utils/roles';
import ColorPicker from '../components/status/ColorPicker';
import ColorBulkEditor from '../components/status/ColorBulkEditor';

const COLOR_OPTIONS = [
{ value: 'bg-green-100 text-green-700 border-green-200', label: 'ירוק', preview: 'bg-green-100 border-green-200' },
{ value: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'צהוב', preview: 'bg-yellow-100 border-yellow-200' },
{ value: 'bg-orange-100 text-orange-700 border-orange-200', label: 'כתום', preview: 'bg-orange-100 border-orange-200' },
{ value: 'bg-red-100 text-red-700 border-red-200', label: 'אדום', preview: 'bg-red-100 border-red-200' },
{ value: 'bg-blue-100 text-blue-700 border-blue-200', label: 'כחול', preview: 'bg-blue-100 border-blue-200' },
{ value: 'bg-purple-100 text-purple-700 border-purple-200', label: 'סגול', preview: 'bg-purple-100 border-purple-200' },
{ value: 'bg-pink-100 text-pink-700 border-pink-200', label: 'ורוד', preview: 'bg-pink-100 border-pink-200' },
{ value: 'bg-indigo-100 text-indigo-700 border-indigo-200', label: 'אינדיגו', preview: 'bg-indigo-100 border-indigo-200' },
{ value: 'bg-teal-100 text-teal-700 border-teal-200', label: 'טורקיז', preview: 'bg-teal-100 border-teal-200' },
{ value: 'bg-slate-100 text-slate-700 border-slate-200', label: 'אפור', preview: 'bg-slate-100 border-slate-200' },
{ value: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'ירוק כהה', preview: 'bg-emerald-100 border-emerald-200' },
{ value: 'bg-cyan-100 text-cyan-700 border-cyan-200', label: 'תכלת', preview: 'bg-cyan-100 border-cyan-200' }];


export default function StatusManagement() {
  const { currentUser, loading: authLoading } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [reassignTargetId, setReassignTargetId] = useState('');
  const [editingStatus, setEditingStatus] = useState(null);
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState(null);
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
  const [workflowStatusId, setWorkflowStatusId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isBulkColorEditorOpen, setIsBulkColorEditorOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'LEGAL',
    description: '',
    color: 'bg-slate-100 text-slate-700',
    is_active: true,
    is_default: false,
    notification_emails: ''
  });

  const queryClient = useQueryClient();
  const navigate = useNavigate();



  const { data: allStatuses = [], isLoading, error: statusError } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => base44.entities.Status.list('order'),
    retry: 2,
    retryDelay: 1000
  });

  const statuses = allStatuses.
  filter((s) => s.type === 'LEGAL').
  sort((a, b) => {
    // סטטוס default תמיד ראשון
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    // שאר הסטטוסים לפי שם (א-ב)
    return (a.name || '').localeCompare(b.name || '');
  });

  const { data: debtorRecords = [] } = useQuery({
    queryKey: ['debtorRecords'],
    queryFn: () => base44.entities.DebtorRecord.list()
  });



  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Status.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('סטטוס נוסף בהצלחה');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Status.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      setIsEditDialogOpen(false);
      setEditingStatus(null);
      toast.success('סטטוס עודכן בהצלחה');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Status.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      setDeleteConfirm(null);
      setReassignTargetId('');
      toast.success('הסטטוס נמחק בהצלחה');
    }
  });

  const handleFixAll = async () => {
    setIsFixing(true);
    setFixResult(null);

    try {
      const result = {
        totalScanned: debtorRecords.length,
        fixed: 0,
        alreadyValid: 0,
        locked: 0
      };

      const validLegalStatusIds = statuses.
      filter((s) => s.type === 'LEGAL' && s.is_active).
      map((s) => s.id);

      console.log('[SCAN] Starting scan, valid status IDs:', validLegalStatusIds);

      for (const record of debtorRecords) {
        const hasValidStatus = record.legal_status_id && validLegalStatusIds.includes(record.legal_status_id);
        const isLocked = record.legal_status_lock === true;

        console.log(`[SCAN] Record ${record.apartmentNumber}:`, {
          statusId: record.legal_status_id,
          hasValid: hasValidStatus,
          locked: isLocked
        });

        if (isLocked) {
          result.locked++;
        } else if (hasValidStatus) {
          result.alreadyValid++;
        } else {
          result.fixed++;
        }
      }

      setFixResult(result);
      toast.success(`סריקה הושלמה: ${result.alreadyValid} תקינות, ${result.fixed} ללא סטטוס, ${result.locked} נעולות (ידני)`);
    } catch (error) {
      console.error('Error scanning statuses:', error);
      toast.error('שגיאה בסריקה');
    } finally {
      setIsFixing(false);
    }
  };

  const reassignMutation = useMutation({
    mutationFn: async ({ sourceId, targetId, recordsToUpdate }) => {
      // עדכון כל הרשומות בבת אחת
      for (const record of recordsToUpdate) {
        await base44.entities.DebtorRecord.update(record.id, { legal_status_id: targetId });
      }
      return { count: recordsToUpdate.length };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      const targetStatus = statuses.find((s) => s.id === variables.targetId);
      toast.success(`בוצעה העברה בהצלחה: ${data.count} רשומות עודכנו לסטטוס '${targetStatus?.name}'`);
      setReassignTargetId('');
      // רענון מונה הקשרים
      setDeleteConfirm({
        ...deleteConfirm,
        usageCount: 0
      });
    },
    onError: () => {
      toast.error('כשל בביצוע ההעברה. לא בוצעו שינויים.');
    }
  });



  const resetForm = () => {
    setFormData({
      name: '',
      type: 'LEGAL',
      description: '',
      color: 'bg-slate-100 text-slate-700',
      is_active: true,
      is_default: false,
      notification_emails: ''
    });
  };

  const handleAdd = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEdit = (status) => {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      type: status.type || 'LEGAL',
      description: status.description || '',
      color: status.color,
      is_active: status.is_active,
      is_default: status.is_default || false,
      notification_emails: status.notification_emails || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (status) => {
    if (status.is_default) {
      toast.error('לא ניתן למחוק סטטוס ברירת מחדל');
      return;
    }
    const usageCount = debtorRecords.filter((r) => r.legal_status_id === status.id).length;
    setDeleteConfirm({ status, usageCount });
  };

  const confirmDelete = () => {
    if (deleteConfirm && deleteConfirm.usageCount === 0) {
      deleteMutation.mutate(deleteConfirm.status.id);
    }
  };

  const handleOpenWorkflow = (statusId) => {
    setWorkflowStatusId(statusId);
    setIsWorkflowOpen(true);
  };

  const handleOpenDetailsFromWorkflow = (record) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleSaveDetail = async (updatedRecord) => {
    try {
      await base44.entities.DebtorRecord.update(updatedRecord.id, updatedRecord);
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      setIsDetailModalOpen(false);
      toast.success('הרשומה עודכנה בהצלחה');
    } catch (err) {
      toast.error('שמירה נכשלה');
    }
  };

  const handleReassign = () => {
    if (!reassignTargetId) {
      toast.error('יש לבחור סטטוס חלופי כדי להמשיך');
      return;
    }

    if (reassignTargetId === deleteConfirm.status.id) {
      toast.error('לא ניתן לבחור את אותו הסטטוס כחלופי. בחר סטטוס אחר');
      return;
    }

    const targetStatus = statuses.find((s) => s.id === reassignTargetId);
    if (!targetStatus || !targetStatus.is_active) {
      toast.error('לא ניתן להעביר לסטטוס לא פעיל. בחר סטטוס פעיל');
      return;
    }

    const recordsToUpdate = debtorRecords.filter((r) => r.legal_status_id === deleteConfirm.status.id);

    reassignMutation.mutate({
      sourceId: deleteConfirm.status.id,
      targetId: reassignTargetId,
      recordsToUpdate
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('שם הסטטוס חובה');
      return;
    }

    // אם מגדירים כ-default, צריך לוודא שרק אחד כזה
    if (formData.is_default) {
      const otherDefault = statuses.find((s) => s.is_default && s.id !== editingStatus?.id);
      if (otherDefault) {
        toast.error('כבר קיים סטטוס ברירת מחדל. ניתן להגדיר רק אחד.');
        return;
      }
    }

    // אם זה סטטוס default, לא לאפשר השבתה
    if (editingStatus?.is_default && !formData.is_active) {
      toast.error('לא ניתן להשבית סטטוס ברירת מחדל');
      return;
    }

    if (editingStatus) {
      updateMutation.mutate({ id: editingStatus.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>);

  }

  if (!currentUser) {
    return <Navigate to={createPageUrl('AppLogin')} replace />;
  }

  if (statusError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 mx-auto text-orange-400 mb-4" />
              <h2 className="text-xl font-bold text-slate-800 mb-2">שגיאה בטעינה</h2>
              <p className="text-slate-600 mb-4">
                {statusError?.message || 'לא ניתן לטעון את הנתונים'}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.location.reload()}>
                  נסה שוב
                </Button>
                <Button variant="outline" onClick={() => navigate(createPageUrl('Dashboard'))}>
                  חזור לדשבורד
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>);

  }

  const isAdmin = isManagerRole(currentUser);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h2 className="text-xl font-bold text-slate-800 mb-2">גישה מוגבלת</h2>
              <p className="text-slate-600 mb-4">
                אין לך הרשאה לגשת לדף זה<br />
                תפקיד נוכחי: {getUserRoleDisplay(currentUser)}
              </p>
              <Button onClick={() => window.location.href = '/'}>חזור לדשבורד</Button>
            </div>
          </CardContent>
        </Card>
      </div>);

  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ניהול סטטוסים משפטיים</h1>
            <p className="text-slate-600 mt-1">ניהול סטטוסים משפטיים המקושרים לרשומות החייבים</p>
            </div>
            <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => setIsBulkColorEditorOpen(true)}
              className="gap-2 bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-700">

              <Palette className="w-5 h-5" />
              ערוך צבעים
            </Button>

            <Button onClick={handleAdd} className="bg-[#3563d0] text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 h-9 gap-2">
              <Plus className="w-5 h-5" />
              הוסף סטטוס
            </Button>
          </div>
        </div>



        <Card>
          <CardHeader>
            <CardTitle>רשימת סטטוסים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto" style={{WebkitOverflowScrolling: 'touch'}}>
          <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם סטטוס</TableHead>
                  <TableHead className="text-right">תיאור</TableHead>
                  <TableHead className="text-right">תצוגה</TableHead>
                  <TableHead className="text-center">מקושרים</TableHead>
                  <TableHead className="text-center">פעיל</TableHead>
                  <TableHead className="text-center">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((status) => {
                  const usageCount = debtorRecords.filter((r) => r.legal_status_id === status.id).length;
                  return (
                    <TableRow key={status.id}>
                      <TableCell className="font-semibold">{status.name}</TableCell>
                      <TableCell className="text-slate-600">{status.description || '-'}</TableCell>
                      <TableCell>
                        <Badge className={`${status.color} border transition-all duration-200 hover:opacity-80`}>{status.name}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => {
                                  navigate(createPageUrl('LinkedRecords') + `?statusId=${status.id}&statusName=${encodeURIComponent(status.name)}`);
                                }}
                                className="font-bold underline decoration-2 transition-all text-lg text-blue-600 hover:text-blue-800 hover:decoration-blue-800">

                                {usageCount}
                              </button>
                              </TooltipTrigger>
                              <TooltipContent>
                              <p className="text-sm font-semibold">
                                {usageCount} דירות מקושרות לסטטוס זה - לחץ לצפייה
                              </p>
                              </TooltipContent>
                              </Tooltip>
                              </TooltipProvider>
                              </TableCell>
                      <TableCell className="text-center">
                        {status.is_active ?
                        <Badge className="bg-green-100 text-green-700">פעיל</Badge> :

                        <Badge className="bg-slate-100 text-slate-500">לא פעיל</Badge>
                        }
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(status)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!status.is_default ?
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(status)}
                            disabled={usageCount > 0}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={usageCount > 0 ? 'לא ניתן למחוק סטטוס מקושר לרשומות' : ''}>

                              <Trash2 className="w-4 h-4" />
                            </Button> :

                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="opacity-30 cursor-not-allowed"
                            title="זהו סטטוס ברירת מחדל במערכת ולא ניתן למחיקה">

                              <Trash2 className="w-4 h-4" />
                            </Button>
                          }
                        </div>
                      </TableCell>
                    </TableRow>);

                })}
              </TableBody>
            </Table>
          </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          setEditingStatus(null);
        }
      }}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingStatus ? 'עריכת סטטוס' : 'הוספת סטטוס חדש'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם הסטטוס *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="הזן שם סטטוס..."
                className="text-right"
                dir="rtl" />

            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="הזן תיאור..."
                className="text-right"
                dir="rtl"
                rows={3} />

            </div>
            <div>
              <Label>צבע תג</Label>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={`${formData.color} border px-4 py-2 text-sm font-semibold`}>
                  {formData.name || 'תצוגה מקדימה'}
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsColorPickerOpen(true)}
                  className="gap-2">

                  <Palette className="w-4 h-4" />
                  בחר צבע
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>סטטוס פעיל</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                disabled={editingStatus?.is_default} />

            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>סטטוס ברירת מחדל</Label>
                <p className="text-xs text-slate-500">רשומות חדשות יקבלו סטטוס זה</p>
              </div>
              <Switch
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })} />

            </div>
            <div>
              <Label>אימיילים לשליחת התראות</Label>
              <Input
                value={formData.notification_emails}
                onChange={(e) => setFormData({ ...formData, notification_emails: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
                className="text-right"
                dir="rtl" />

              <p className="text-xs text-slate-500 mt-1">הזן כתובות מייל מופרדות בפסיקים - יישלח PDF עם פרטי הדירה בכל שינוי סטטוס</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              setIsEditDialogOpen(false);
              setEditingStatus(null);
            }}>
              <X className="w-4 h-4 ml-2" />
              ביטול
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="w-4 h-4 ml-2" />
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete/Reassign Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => {
        setDeleteConfirm(null);
        setReassignTargetId('');
      }}>
        <AlertDialogContent dir="rtl" className="max-w-lg w-[95vw]">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת סטטוס משפטי</AlertDialogTitle>
            <AlertDialogDescription className="text-right space-y-4">
              {deleteConfirm?.usageCount > 0 ?
              <>
                  <div className="space-y-2">
                    <p className="text-red-600 font-semibold text-base">
                      לא ניתן למחוק סטטוס שמקושר ל-{deleteConfirm?.usageCount} רשומות.
                    </p>
                    <p className="text-slate-700">
                      כדי למחוק אותו, יש לבחור סטטוס חלופי ולהעביר אליו את כל הרשומות המקושרות.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-700">סטטוס חלופי להעברה</Label>
                    <Select value={reassignTargetId} onValueChange={setReassignTargetId}>
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="בחר סטטוס…" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {statuses.
                      filter((s) => s.id !== deleteConfirm?.status.id && s.is_active).
                      map((status) =>
                      <SelectItem key={status.id} value={status.id}>
                              <div className="flex items-center gap-2">
                                <Badge className={`${status.color} border text-xs transition-all duration-200 hover:opacity-80`}>
                                  {status.name}
                                </Badge>
                              </div>
                            </SelectItem>
                      )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      הפעולה תעדכן את כל הרשומות המקושרות ותעביר אותן לסטטוס שבחרת.
                    </p>
                  </div>
                </> :

              <div className="space-y-2">
                  <p className="text-slate-700">
                    הסטטוס הזה אינו מקושר לאף דירה/חייב. ניתן למחוק אותו לצמיתות.
                  </p>
                  <p className="text-sm text-amber-600 font-semibold">
                    מחיקה היא פעולה בלתי הפיכה.
                  </p>
                </div>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={reassignMutation.isPending}>ביטול</AlertDialogCancel>
            {deleteConfirm?.usageCount === 0 ?
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}>

                {deleteMutation.isPending ? 'מוחק...' : 'מחק לצמיתות'}
              </AlertDialogAction> :

            <Button
              onClick={handleReassign}
              disabled={reassignMutation.isPending || !reassignTargetId}
              className="bg-blue-600 hover:bg-blue-700">

                {reassignMutation.isPending ?
              <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מעביר רשומות...
                  </> :

              'העבר וקשר'
              }
              </Button>
            }
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>

        <StatusWorkflowWizard
        isOpen={isWorkflowOpen}
        onClose={() => {
          setIsWorkflowOpen(false);
          setWorkflowStatusId(null);
        }}
        initialStatusId={workflowStatusId}
        onOpenDetails={handleOpenDetailsFromWorkflow} />


        {selectedRecord &&
      <ApartmentDetailModal
        record={selectedRecord}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onSave={handleSaveDetail}
        isAdmin={isAdmin} />

      }

      {/* Color Picker */}
      <ColorPicker
        open={isColorPickerOpen}
        onClose={() => setIsColorPickerOpen(false)}
        currentColor={formData.color}
        onSelectColor={(color) => setFormData({ ...formData, color })}
        statusName={formData.name || 'סטטוס'} />


      {/* Bulk Color Editor */}
      <ColorBulkEditor
        open={isBulkColorEditorOpen}
        onClose={() => setIsBulkColorEditorOpen(false)}
        statuses={statuses}
        onUpdateStatus={async (statusId, updateData) => {
          await updateMutation.mutateAsync({ id: statusId, data: updateData });
        }} />


          {/* Debug Panel */}
          <AuthDebugPanel currentUser={currentUser} />
          </div>);

}