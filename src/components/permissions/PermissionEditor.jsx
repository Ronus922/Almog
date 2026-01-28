import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Shield } from "lucide-react";
import { toast } from 'sonner';
import { RESOURCES, ACTIONS } from './PermissionUtils';

export default function PermissionEditor({ role, isOpen, onClose }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen && role) {
      loadPermissions();
    }
  }, [isOpen, role]);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const perms = await base44.entities.Permission.filter({ role_id: role.id });
      
      // יצירת מבנה הרשאות מלא
      const permissionsMap = {};
      RESOURCES.forEach(resource => {
        const existing = perms.find(p => p.resource_type === resource.type);
        permissionsMap[resource.type] = existing || {
          role_id: role.id,
          resource_type: resource.type,
          can_read: true,
          can_create: false,
          can_update: false,
          can_delete: false
        };
      });
      
      setPermissions(permissionsMap);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast.error('שגיאה בטעינת הרשאות');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (resourceType, action) => {
    setPermissions(prev => ({
      ...prev,
      [resourceType]: {
        ...prev[resourceType],
        [`can_${action}`]: !prev[resourceType][`can_${action}`]
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // מחיקת כל ההרשאות הקיימות
      const existingPerms = await base44.entities.Permission.filter({ role_id: role.id });
      for (const perm of existingPerms) {
        await base44.entities.Permission.delete(perm.id);
      }

      // יצירת הרשאות חדשות
      const permsToCreate = Object.values(permissions).map(p => ({
        role_id: p.role_id,
        resource_type: p.resource_type,
        can_read: p.can_read,
        can_create: p.can_create,
        can_update: p.can_update,
        can_delete: p.can_delete
      }));

      await base44.entities.Permission.bulkCreate(permsToCreate);

      toast.success('ההרשאות נשמרו בהצלחה');
      queryClient.invalidateQueries(['permissions']);
      onClose();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('שגיאה בשמירת הרשאות');
    } finally {
      setSaving(false);
    }
  };

  if (!role) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-6 h-6 text-blue-600" />
            הרשאות תפקיד: {role.name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {RESOURCES.map(resource => {
              const perm = permissions[resource.type] || {};
              return (
                <div key={resource.type} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <h4 className="font-bold text-lg text-slate-900 mb-4">{resource.label}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {ACTIONS.map(action => (
                      <div key={action.key} className="flex items-center justify-between gap-2 p-3 bg-white rounded-lg border border-slate-200">
                        <Label htmlFor={`${resource.type}-${action.key}`} className="text-sm font-semibold cursor-pointer">
                          {action.label}
                        </Label>
                        <Switch
                          id={`${resource.type}-${action.key}`}
                          checked={perm[`can_${action.key}`] || false}
                          onCheckedChange={() => handleToggle(resource.type, action.key)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                ביטול
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    שמור הרשאות
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}