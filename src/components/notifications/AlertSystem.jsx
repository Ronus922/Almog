import React, { createContext, useContext, useState, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

const AlertContext = createContext(null);

let alertIdCounter = 0;

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([]);

  const showAlert = useCallback((message, type = "success", duration = 4000) => {
    const id = ++alertIdCounter;
    setAlerts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-4 space-y-2 pointer-events-none">
        {alerts.map(alert => (
          <AlertBannerItem key={alert.id} alert={alert} onRemove={removeAlert} />
        ))}
      </div>
    </AlertContext.Provider>
  );
}

function AlertBannerItem({ alert, onRemove }) {
  const styles = {
    success: { bg: "bg-green-50 border-green-300", text: "text-green-800", icon: <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" /> },
    error:   { bg: "bg-red-50 border-red-300",   text: "text-red-800",   icon: <XCircle      className="w-5 h-5 text-red-600 flex-shrink-0" /> },
    warning: { bg: "bg-amber-50 border-amber-300", text: "text-amber-800", icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" /> },
    info:    { bg: "bg-blue-50 border-blue-300",  text: "text-blue-800",  icon: <Info         className="w-5 h-5 text-blue-600 flex-shrink-0" /> },
  };
  const s = styles[alert.type] || styles.info;

  return (
    <div className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg animate-in slide-in-from-top-2 ${s.bg}`} dir="rtl">
      {s.icon}
      <span className={`flex-1 text-sm font-medium ${s.text}`}>{alert.message}</span>
      <button onClick={() => onRemove(alert.id)} className={`${s.text} opacity-60 hover:opacity-100 transition-opacity`}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert must be used within AlertProvider");
  return ctx.showAlert;
}