import React from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';

export default function AppWrapper({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}