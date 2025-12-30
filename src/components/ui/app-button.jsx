import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg border-0',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300',
  outline: 'bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-300 hover:border-slate-400',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg border-0',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 border-0'
};

const SIZES = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-base',
  lg: 'h-12 px-6 text-lg'
};

export default function AppButton({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={cn(
        // Base styles
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        // Variant styles
        VARIANTS[variant],
        // Size styles
        SIZES[size],
        // Full width
        fullWidth && 'w-full',
        className
      )}
      {...props}>

      {loading ?
      <Loader2 className="w-5 h-5 animate-spin" /> :
      Icon ?
      <Icon className="w-5 h-5" /> :
      null}
      <span className="text-slate-50">{children}</span>
    </button>);

}