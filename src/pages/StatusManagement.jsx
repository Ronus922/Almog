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
import { Plus, Edit, Trash2, Shield, Loader2, Save, X } from "lucide-react";
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
  const [editingStatus, setEditingStatus] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'bg-slate-100 text-slate-700',
    order: 0,
    is_active: true,
    is_system: false
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

  const { data: statuses = [], isLoading } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => base44.entities.Status.list('order'),
  });

  const { data: debtorRecords = [] } = useQuery({
    queryKey: ['debtorRecords'],
    queryFn: () => base44.entities.DebtorRecord.list(),
  });

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
      setDeleteConfirm(null);
      toast.success('סטטוס נמחק בהצלחה');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: 'bg-slate-100 text-slate-700',
      order: 0,
      is_active: true,
      is_system: false
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
      description: status.description || '',
      color: status.color,
      order: status.order,
      is_active: status.is_active,
      is_system: status.is_system
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (status) => {
    const usageCount = debtorRecords.filter(r => r.status === status.name).length;
    setDeleteConfirm({ status, usageCount });
  };

  const confirmDelete = () => {
    if (deleteConfirm && deleteConfirm.usageCount === 0) {
      deleteMutation.mutate(deleteConfirm.status.id);
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('שם הסטטוס חובה');
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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-800">ניהול סטטוסים</h1>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="w-5 h-5" />
            הוסף סטטוס
          </Button>
        </div>

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
                  <TableHead className="text-right">סדר</TableHead>
                  <TableHead className="text-right">מקושרים</TableHead>
                  <TableHead className="text-right">פעיל</TableHead>
                  <TableHead className="text-right">סוג</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((status) => {
                  const usageCount = debtorRecords.filter(r => r.status === status.name).length;
                  return (
                    <TableRow key={status.id}>
                      <TableCell className="font-semibold">{status.name}</TableCell>
                      <TableCell className="text-slate-600">{status.description || '-'}</TableCell>
                      <TableCell>
                        <Badge className={status.color}>{status.name}</Badge>
                      </TableCell>
                      <TableCell>{status.order}</TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => navigate(createPageUrl('Dashboard') + `?status=${encodeURIComponent(status.name)}`)}
                          className="text-blue-600 hover:text-blue-800 font-bold underline decoration-2 hover:decoration-blue-800 transition-all text-lg"
                        >
                          {usageCount}
                        </button>
                      </TableCell>
                      <TableCell>
                        {status.is_active ? (
                          <Badge className="bg-green-100 text-green-700">פעיל</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500">לא פעיל</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {status.is_system && (
                          <Badge variant="outline" className="gap-1">
                            <Shield className="w-3 h-3" />
                            מערכת
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-start">
                          {!status.is_system && usageCount === 0 && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDelete(status)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleEdit(status)}>
                            <Edit className="w-4 h-4" />
                          </Button>
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
            <div>
              <Label>סדר תצוגה</Label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})}
                className="text-right"
                dir="rtl"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>סטטוס פעיל</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
            </div>
            {!editingStatus && (
              <div className="flex items-center justify-between">
                <Label>סטטוס מערכת (לא ניתן למחיקה)</Label>
                <Switch
                  checked={formData.is_system}
                  onCheckedChange={(checked) => setFormData({...formData, is_system: checked})}
                />
              </div>
            )}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת סטטוס</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              {deleteConfirm?.usageCount > 0 ? (
                <div className="space-y-2">
                  <p className="text-red-600 font-semibold">
                    הסטטוס "{deleteConfirm?.status.name}" נמצא בשימוש ב-{deleteConfirm?.usageCount} רשומות.
                  </p>
                  <p>לא ניתן למחוק סטטוס שנמצא בשימוש.</p>
                  <p className="text-sm text-slate-500">
                    יש לעדכן את הרשומות לסטטוס אחר לפני המחיקה.
                  </p>
                </div>
              ) : (
                <p>האם אתה בטוח שברצונך למחוק את הסטטוס "{deleteConfirm?.status.name}"?</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            {deleteConfirm?.usageCount === 0 && (
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                מחק
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}