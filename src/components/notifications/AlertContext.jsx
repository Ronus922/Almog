import React, { createContext, useContext, useState, useCallback } from 'react';

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [alert, setAlert] = useState(null); // { message, type }
  const [confirm, setConfirm] = useState(null); // { message, onConfirm }

  const showAlert = useCallback((message, type = 'success') => {
    setAlert({ message, type });
    const timer = setTimeout(() => setAlert(null), 6000);
    return () => clearTimeout(timer);
  }, []);

  const dismissAlert = useCallback(() => setAlert(null), []);

  const showConfirm = useCallback((message, onConfirm) => {
    setConfirm({ message, onConfirm });
  }, []);

  const dismissConfirm = useCallback(() => setConfirm(null), []);

  const handleConfirm = useCallback(() => {
    if (confirm?.onConfirm) confirm.onConfirm();
    setConfirm(null);
  }, [confirm]);

  return (
    <AlertContext.Provider value={{ alert, showAlert, dismissAlert, confirm, showConfirm, dismissConfirm, handleConfirm }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within AlertProvider');
  return ctx;
}