import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Edit, Trash2, Users } from "lucide-react";

export default function RoleCard({ role, userCount, onEdit, onDelete, canDelete }) {
  return (
    <Card className="p-5 hover:shadow-xl transition-all duration-300 border-r-4 border-r-blue-600 bg-gradient-to-l from-white to-slate-50/50">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shadow-sm border border-blue-200/50">
              <Shield className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-900">{role.name}</h3>
              {role.description && (
                <p className="text-sm text-slate-500 mt-0.5">{role.description}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {role.is_system && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-bold">
                תפקיד מערכת
              </Badge>
            )}
            {!role.is_active && (
              <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300">
                לא פעיל
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm bg-slate-50/70 px-3 py-2.5 rounded-lg border border-slate-200/50">
          <Users className="w-4 h-4 text-slate-500" />
          <span className="text-slate-700 font-medium">{userCount} משתמשים</span>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-200">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(role)}
            className="flex-1 gap-2"
          >
            <Edit className="w-4 h-4" />
            ערוך הרשאות
          </Button>
          {canDelete && !role.is_system && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(role)}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}