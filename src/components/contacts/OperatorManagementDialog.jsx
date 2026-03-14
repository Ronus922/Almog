import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import { useAlert } from "@/components/notifications/AlertContext";

export default function OperatorManagementDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const { showAlert, showConfirm } = useAlert();
  const [showForm, setShowForm] = useState(false);
  const [editingOperator, setEditingOperator] = useState(null);
  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    phone: "",
    email: "",
    notes: "",
    is_active: true
  });

  const { data: operators = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: () => base44.entities.Operator.list()
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Operator.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      resetForm();
      showAlert("מפעיל נוצר בהצלחה", "success");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Operator.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      resetForm();
      showAlert("מפעיל עודכן בהצלחה", "success");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Operator.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      showAlert("מפעיל נמחק בהצלחה", "success");
    }
  });

  const resetForm = () => {
    setFormData({
      company_name: "",
      contact_name: "",
      phone: "",
      email: "",
      notes: "",
      is_active: true
    });
    setEditingOperator(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!formData.company_name.trim()) {
      showAlert("חובה להזין שם חברה", "error");
      return;
    }

    if (editingOperator) {
      updateMutation.mutate({ id: editingOperator.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (operator) => {
    const operatorUsed = contacts.some(c => c.operator_id === operator.id);
    
    if (operatorUsed) {
      showAlert("לא ניתן למחוק מפעיל שמשויך לדירות", "error");
      return;
    }

    showConfirm(`למחוק את ${operator.company_name}?`, () => {
      deleteMutation.mutate(operator.id);
    });
  };

  const handleEdit = (operator) => {
    setEditingOperator(operator);
    setFormData({
      company_name: operator.company_name,
      contact_name: operator.contact_name || "",
      phone: operator.phone || "",
      email: operator.email || "",
      notes: operator.notes || "",
      is_active: operator.is_active
    });
    setShowForm(true);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>ניהול מפעילים</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showForm ? (
            <>
              <Button onClick={() => setShowForm(true)} className="gap-2 bg-[#3563d0] text-white">
                <Plus className="w-4 h-4" /> הוסף מפעיל
              </Button>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {operators.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">אין מפעילים</div>
                ) : (
                  operators.map(operator => (
                    <Card key={operator.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-800">{operator.company_name}</h4>
                            {operator.contact_name && <p className="text-sm text-slate-600">{operator.contact_name}</p>}
                            {operator.phone && <p className="text-sm text-slate-600" dir="ltr">{operator.phone}</p>}
                            {operator.email && <p className="text-sm text-slate-600" dir="ltr">{operator.email}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(operator)}
                              className="text-blue-600 hover:bg-blue-50"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(operator)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-slate-800">
                {editingOperator ? "עריכת מפעיל" : "הוספת מפעיל חדש"}
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">שם חברה *</Label>
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="שם החברה"
                    dir="rtl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">שם איש קשר</Label>
                  <Input
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="שם איש קשר"
                    dir="rtl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">טלפון</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="טלפון"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">אימייל</Label>
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="אימייל"
                    dir="ltr"
                    type="email"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-200 cursor-pointer"
                    id="is_active"
                  />
                  <label htmlFor="is_active" className="text-sm text-slate-600 cursor-pointer">
                    מפעיל פעיל
                  </label>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={resetForm}>ביטול</Button>
                  <Button onClick={handleSave} className="bg-[#3563d0] text-white">
                    {editingOperator ? "שמור שינויים" : "הוסף מפעיל"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}