import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Shield, Eye } from "lucide-react";

export default function RoleIndicator({ role }) {
  const isAdmin = role === 'admin';
  
  return (
    <Badge 
      variant="outline" 
      className={isAdmin 
        ? "bg-purple-50 text-purple-700 border-purple-200" 
        : "bg-blue-50 text-blue-700 border-blue-200"
      }
    >
      {isAdmin ? (
        <>
          <Shield className="w-3 h-3 ml-1" />
          מנהל מערכת
        </>
      ) : (
        <>
          <Eye className="w-3 h-3 ml-1" />
          צופה
        </>
      )}
    </Badge>
  );
}