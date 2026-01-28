import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthContext';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Shield, AlertTriangle } from "lucide-react";
import { toast } from 'sonner';
import { isFullAdmin } from '@/components/permissions/PermissionUtils';

import RoleCard from '../components/permissions/RoleCard';
import RoleFormDialog from '../components/permissions/RoleFormDialog';
import PermissionEditor from '../components/permissions/PermissionEditor';
import UserRoleAssignment from '../components/permissions/UserRoleAssignment';

export default function RoleManagement() {
  const { currentUser, loading: authLoading, authChecked } = useAuth();
  const queryClient = useQueryClient();
  const [editingRole, setEditingRole] = useState(null);
  const [isRoleFormOpen, setIsRoleFormOpen] = useState(false);
  const [isPermissionEditorOpen, setIsPermissionEditorOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState(null);

  // בדיקת הרשאות
  if (authChecked && !currentUser) {
    return <Navigate to={createPageUrl('AppLogin')} replace />;
  }

  if (authChecked && !isFullAdmin(currentUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Alert className="max-w-md bg-red-50 border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-800 font-semibold">
            אין לך הרשאה לגשת לעמוד זה. נדרשות הרשאות מנהל.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list('order')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['appUsers'],
    queryFn: () => base44.entities.AppUser.list()
  });

  const createRoleMutation = useMutation({
    mutationFn: (roleData) => base44.entities.Role.create(roleData),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      setIsRoleFormOpen(false);
      toast.success('התפקיד נוצר בהצלחה');
    },
    onError: (error) => {
      console.error('Error creating role:', error);
      toast.error('שגיאה ביצירת תפקיד');
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Role.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      setIsRoleFormOpen(false);
      setEditingRole(null);
      toast.success('התפקיד עודכן בהצלחה');
    },
    onError: (error) => {
      console.error('Error updating role:', error);
      toast.error('שגיאה בעדכון תפקיד');
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId) => base44.entities.Role.delete(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      toast.success('התפקיד נמחק בהצלחה');
    },
    onError: (error) => {
      console.error('Error deleting role:', error);
      toast.error('שגיאה במחיקת תפקיד');
    }
  });

  const handleCreateRole = () => {
    setEditingRole(null);
    setIsRoleFormOpen(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setIsRoleFormOpen(true);
  };

  const handleEditPermissions = (role) => {
    setRoleToEdit(role);
    setIsPermissionEditorOpen(true);
  };

  const handleDeleteRole = async (role) => {
    const usersWithRole = users.filter(u => u.role_id === role.id).length;
    
    if (usersWithRole > 0) {
      toast.error(`לא ניתן למחוק תפקיד עם ${usersWithRole} משתמשים משוייכים`);
      return;
    }

    if (confirm(`האם אתה בטוח שברצונך למחוק את התפקיד "${role.name}"?`)) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  const handleSaveRole = (roleData) => {
    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data: roleData });
    } else {
      createRoleMutation.mutate(roleData);
    }
  };

  const getUserCount = (roleId) => {
    return users.filter(u => u.role_id === roleId).length;
  };

  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-700">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">ניהול תפקידים והרשאות</h1>
              <p className="text-sm text-slate-600 mt-1">הגדרת תפקידים, הרשאות, והקצאה למשתמשים</p>
            </div>
          </div>
          <Button onClick={handleCreateRole} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-5 h-5" />
            תפקיד חדש
          </Button>
        </div>

        {/* Roles Grid */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">תפקידים במערכת</h2>
          {roles.length === 0 ? (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-900">
                טרם נוצרו תפקידים. צור תפקיד ראשון כדי להתחיל.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map(role => (
                <RoleCard
                  key={role.id}
                  role={role}
                  userCount={getUserCount(role.id)}
                  onEdit={handleEditPermissions}
                  onDelete={handleDeleteRole}
                  canDelete={!role.is_system && getUserCount(role.id) === 0}
                />
              ))}
            </div>
          )}
        </div>

        {/* User Assignment */}
        <div>
          <UserRoleAssignment />
        </div>

        {/* Dialogs */}
        <RoleFormDialog
          role={editingRole}
          isOpen={isRoleFormOpen}
          onClose={() => {
            setIsRoleFormOpen(false);
            setEditingRole(null);
          }}
          onSave={handleSaveRole}
          saving={createRoleMutation.isLoading || updateRoleMutation.isLoading}
        />

        <PermissionEditor
          role={roleToEdit}
          isOpen={isPermissionEditorOpen}
          onClose={() => {
            setIsPermissionEditorOpen(false);
            setRoleToEdit(null);
          }}
        />
      </div>
    </div>
  );
}