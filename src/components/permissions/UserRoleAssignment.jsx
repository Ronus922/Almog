import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Save } from "lucide-react";
import { toast } from 'sonner';

export default function UserRoleAssignment() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['appUsers'],
    queryFn: () => base44.entities.AppUser.list()
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.filter({ is_active: true })
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, roleId }) => 
      base44.entities.AppUser.update(userId, { role_id: roleId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['appUsers']);
      toast.success('התפקיד עודכן בהצלחה');
    },
    onError: (error) => {
      console.error('Error updating user role:', error);
      toast.error('שגיאה בעדכון תפקיד');
    }
  });

  const handleRoleChange = (userId, roleId) => {
    updateUserMutation.mutate({ userId, roleId });
  };

  if (usersLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">הקצאת תפקידים למשתמשים</h3>
      
      <div className="grid gap-4">
        {users.map(user => {
          const userRole = roles.find(r => r.id === user.role_id);
          const isLegacyAdmin = user.role === 'ADMIN' && !user.role_id;
          
          return (
            <Card key={user.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{user.username}</p>
                    <p className="text-sm text-slate-500">{user.first_name} {user.last_name}</p>
                    {isLegacyAdmin && (
                      <Badge variant="outline" className="mt-1 bg-purple-50 text-purple-700 border-purple-200 text-xs">
                        Admin מורשת
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="w-64">
                  <Select
                    value={user.role_id || ''}
                    onValueChange={(roleId) => handleRoleChange(user.id, roleId)}
                    disabled={updateUserMutation.isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר תפקיד">
                        {userRole?.name || 'ללא תפקיד מותאם'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>ללא תפקיד מותאם</SelectItem>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}