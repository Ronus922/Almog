import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Shield, Loader2, Save, X, ArrowRight, Wrench } from "lucide-react";
import { toast } from "sonner";

const COLOR_OPTIONS = [
  { value: 'bg-green-100 text-green-700', label: 'ירוק', preview: 'bg-green-100' },
  { value: 'bg-yellow-100 text-yellow-700', label: 'צהוב', preview: 'bg-yellow-100' },
  { value: 'bg-orange-100 text-orange-700', label: 'כתום', preview: 'bg-orange-100' },
  { value: 'bg-red-100 text-red-700', label: 'אדום', preview: 'bg-red-100' },
  { value: 'bg-blue-100 text-blue-700', label: 'כחול', preview: 'bg-blue-100' },
  { value: 'bg-purple-100 text-purple-700', label: 'סגול', preview: 'bg-purple-100' },
  { value: 'bg-slate-100 text-slate-700', label: 'אפור', preview: 'bg-slate-100' },
];

export default function StatusManagement() {
  const [user, setUser] = useState(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [reassignTargetId, setReassignTargetId] = useState('');
  const [editingStatus, setEditingStatus] = useState(null);
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'LEGAL',
    description: '',
    color: 'bg-slate-100 text-slate-700',
    is_active: true,
    is_default: false
  });

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  React.useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: allStatuses = [], isLoading } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => base44.entities.Status.list('order'),
  });

  const statuses = allStatuses
    .filter(s => s.type === 'LEGAL')
    .sort((a, b) => {
      // סטטוס default תמיד ראשון
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      // שאר הסטטוסים לפי שם (א-ב)
      return (a.name || '').localeCompare(b.name || '');
    });

  const { data: debtorRecords = [] } = useQuery({
    queryKey: ['debtorRecords'],
    queryFn: () => base44.entities.DebtorRecord.list(),
  });

  React.useEffect(() => {
    const ensureDefaultStatus = async () => {
      if (!allStatuses || allStatuses.length === 0) return;
      
      const legalStatuses = allStatuses.filter(s => s.type === 'LEGAL');
      const defaultStatus = legalStatuses.find(s => s.is_default === true);
      
      if (!defaultStatus) {
        console.log('[StatusManagement] No default status found, creating one...');
        try {
          await base44.entities.Status.create({
            name: 'לא הוגדר',
            type: 'LEGAL',
            description: 'סטטוס זמני – נדרש לקבוע סטטוס משפטי',
            color: 'bg-blue-100 text-blue-700',
            is_active: true,
            is_default: true
          });
          queryClient.invalidateQueries({ queryKey: ['statuses'] });
          console.log('[StatusManagement] Default status created successfully');
        } catch (err) {
          console.error('[StatusManagement] Failed to create default status:', err);
        }
      }
    };
    
    if (user?.role === 'admin') {
      ensureDefaultStatus();
    }
  }, [allStatuses, user, queryClient]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Status.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('סטטוס נוסף בהצלחה');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Status.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      setIsEditDialogOpen(false);
      setEditingStatus(null);
      toast.success('סטטוס עודכן בהצלחה');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Status.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      setDeleteConfirm(null);
      setReassignTargetId('');
      toast.success('הסטטוס נמחק בהצלחה');
    },
  });

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
      const targetStatus = statuses.find(s => s.id === variables.targetId);
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

  const handleFixAll = async () => {
    // חישוב defaultStatus בתוך הפונקציה
    const currentDefaultStatus = statuses.find(s => s.type === 'LEGAL' && s.is_default === true);
    
    if (!currentDefaultStatus) {
      toast.error('לא נמצא סטטוס ברירת מחדל במערכת');
      return;
    }

    setIsFixing(true);
    setFixResult(null);

    try {
      const result = {
        totalScanned: debtorRecords.length,
        fixed: 0,
        alreadyValid: 0
      };

      const validLegalStatusIds = statuses
        .filter(s => s.type === 'LEGAL' && s.is_active)
        .map(s => s.id);

      for (const record of debtorRecords) {
        const hasValidStatus = record.legal_status_id && validLegalStatusIds.includes(record.legal_status_id);

        if (!hasValidStatus) {
          await base44.entities.DebtorRecord.update(record.id, {
            legal_status_id: currentDefaultStatus.id,
            legal_status_overridden: false
          });
          result.fixed++;
        } else {
          result.alreadyValid++;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      await queryClient.invalidateQueries({ queryKey: ['statuses'] });
      
      setFixResult(result);
      toast.success(`תיקון הושלם: ${result.fixed} רשומות תוקנו`);
    } catch (error) {
      console.error('Error fixing statuses:', error);
      toast.error('שגיאה בתיקון הסטטוסים');
    } finally {
      setIsFixing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'LEGAL',
      description: '',
      color: 'bg-slate-100 text-slate-700',
      is_active: true,
      is_default: false
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
      is_default: status.is_default || false
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (status) => {
    if (status.is_default) {
      toast.error('לא ניתן למחוק סטטוס ברירת מחדל');
      return;
    }
    const usageCount = debtorRecords.filter(r => r.legal_status_id === status.id).length;
    setDeleteConfirm({ status, usageCount });
  };

  const confirmDelete = () => {
    if (deleteConfirm && deleteConfirm.usageCount === 0) {
      deleteMutation.mutate(deleteConfirm.status.id);
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

    const targetStatus = statuses.find(s => s.id === reassignTargetId);
    if (!targetStatus || !targetStatus.is_active) {
      toast.error('לא ניתן להעביר לסטטוס לא פעיל. בחר סטטוס פעיל');
      return;
    }

    const recordsToUpdate = debtorRecords.filter(r => r.legal_status_id === deleteConfirm.status.id);
    
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
      const otherDefault = statuses.find(s => s.is_default && s.id !== editingStatus?.id);
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

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h2 className="text-xl font-bold text-slate-800 mb-2">גישה מוגבלת</h2>
              <p className="text-slate-600 mb-4">אין לך הרשאה לגשת לדף זה</p>
              <Button onClick={() => window.location.href = '/'}>חזור לדשבורד</Button>
            </div>
          </CardContent>
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
              onClick={handleFixAll}
              disabled={isFixing}
              className="gap-2 bg-orange-50 hover:bg-orange-100 border-orange-300 text-orange-700"
            >
              {isFixing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  מתקן...
                </>
              ) : (
                <>
                  <Wrench className="w-5 h-5" />
                  תקן הכל עכשיו
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate(createPageUrl('StatusWorkflow'))}
              className="gap-2"
            >
              <ArrowRight className="w-5 h-5" />
              טיפול דירה-דירה
            </Button>
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="w-5 h-5" />
              הוסף סטטוס
            </Button>
          </div>
        </div>

        {fixResult && (
          <Alert className="bg-green-50 border-green-300">
            <AlertDescription className="space-y-2">
              <div className="font-bold text-green-900">תוצאות תיקון אוטומטי:</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-slate-600">סה"כ נסרקו</div>
                  <div className="text-xl font-bold text-slate-800">{fixResult.totalScanned}</div>
                </div>
                <div>
                  <div className="text-slate-600">תוקנו</div>
                  <div className="text-xl font-bold text-green-600">{fixResult.fixed}</div>
                </div>
                <div>
                  <div className="text-slate-600">היו תקינות</div>
                  <div className="text-xl font-bold text-blue-600">{fixResult.alreadyValid}</div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>רשימת סטטוסים</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
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
                  const usageCount = debtorRecords.filter(r => r.legal_status_id === status.id).length;
                  return (
                    <TableRow key={status.id}>
                      <TableCell className="font-semibold">{status.name}</TableCell>
                      <TableCell className="text-slate-600">{status.description || '-'}</TableCell>
                      <TableCell>
                        <Badge className={status.color}>{status.name}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => {
                                  if (status.is_default && usageCount > 0) {
                                    navigate(createPageUrl('StatusWorkflow'));
                                  } else {
                                    navigate(createPageUrl('LinkedRecords') + `?statusId=${status.id}&statusName=${encodeURIComponent(status.name)}`);
                                  }
                                }}
                                className={`font-bold underline decoration-2 transition-all text-lg ${
                                  status.is_default && usageCount > 0
                                    ? 'text-orange-600 hover:text-orange-800 hover:decoration-orange-800 animate-pulse'
                                    : 'text-blue-600 hover:text-blue-800 hover:decoration-blue-800'
                                }`}
                              >
                                {usageCount}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm font-semibold">
                                {status.is_default && usageCount > 0
                                  ? `${usageCount} דירות שעדיין לא הוגדר להן סטטוס משפטי - לחץ לטיפול`
                                  : `${usageCount} דירות מקושרות לסטטוס זה`}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-center">
                        {status.is_active ? (
                          <Badge className="bg-green-100 text-green-700">פעיל</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500">לא פעיל</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(status)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!status.is_default ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDelete(status)}
                              disabled={usageCount > 0}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={usageCount > 0 ? 'לא ניתן למחוק סטטוס מקושר לרשומות' : ''}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              disabled
                              className="opacity-30 cursor-not-allowed"
                              title="זהו סטטוס ברירת מחדל במערכת ולא ניתן למחיקה"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingStatus ? 'עריכת סטטוס' : 'הוספת סטטוס חדש'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם הסטטוס *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="הזן שם סטטוס..."
                className="text-right"
                dir="rtl"
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="הזן תיאור..."
                className="text-right"
                dir="rtl"
                rows={3}
              />
            </div>
            <div>
              <Label>צבע תג</Label>
              <Select value={formData.color} onValueChange={(v) => setFormData({...formData, color: v})}>
                <SelectTrigger className="text-right" dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {COLOR_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${opt.preview}`} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>סטטוס פעיל</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                disabled={editingStatus?.is_default}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>סטטוס ברירת מחדל</Label>
                <p className="text-xs text-slate-500">רשומות חדשות יקבלו סטטוס זה</p>
              </div>
              <Switch
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({...formData, is_default: checked})}
              />
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
        <AlertDialogContent dir="rtl" className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת סטטוס משפטי</AlertDialogTitle>
            <AlertDialogDescription className="text-right space-y-4">
              {deleteConfirm?.usageCount > 0 ? (
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
                        {statuses
                          .filter(s => s.id !== deleteConfirm?.status.id && s.is_active)
                          .map((status) => (
                            <SelectItem key={status.id} value={status.id}>
                              <div className="flex items-center gap-2">
                                <Badge className={status.color + ' text-xs'}>
                                  {status.name}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      הפעולה תעדכן את כל הרשומות המקושרות ותעביר אותן לסטטוס שבחרת.
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-slate-700">
                    הסטטוס הזה אינו מקושר לאף דירה/חייב. ניתן למחוק אותו לצמיתות.
                  </p>
                  <p className="text-sm text-amber-600 font-semibold">
                    מחיקה היא פעולה בלתי הפיכה.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={reassignMutation.isPending}>ביטול</AlertDialogCancel>
            {deleteConfirm?.usageCount === 0 ? (
              <AlertDialogAction 
                onClick={confirmDelete} 
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'מוחק...' : 'מחק לצמיתות'}
              </AlertDialogAction>
            ) : (
              <Button
                onClick={handleReassign}
                disabled={reassignMutation.isPending || !reassignTargetId}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {reassignMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מעביר רשומות...
                  </>
                ) : (
                  'העבר וקשר'
                )}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}