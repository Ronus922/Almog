import React from "react";

export default function PrimaryActionButton({ 
  onClick, 
  children, 
  icon: Icon, 
  disabled = false,
  className = ""
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-l from-blue-500 to-cyan-400 text-white font-bold shadow-lg hover:opacity-90 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}