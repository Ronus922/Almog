/**
 * DataTableStyles - סגנונות וקלאסים מרכזיים לטבלאות בכל האתר
 * 
 * השתמש בקלאסים האלה כדי לשמור על עקביות עיצובית בכל הטבלאות
 */

export const tableStyles = {
  // סגנון עטיפת הטבלה
  wrapper: "bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden",
  
  // סגנון Header
  headerRow: "bg-slate-50 border-b border-slate-200",
  headerCell: "text-right font-semibold text-slate-700 text-sm p-4 h-12",
  stickyHeaderCell: "bg-white text-muted-foreground px-10 font-medium text-left h-10 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] sticky left-0 border-l border-slate-200 z-10",
  
  // סגנון Body
  bodyRow: "border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group",
  bodyCell: "text-right text-sm p-4 h-12",
  stickyCellActions: "text-right text-sm sticky left-0 bg-white border-l border-slate-200 z-10 group-hover:bg-slate-50 p-4 h-12",
  
  // סגנון טקסט
  textDefault: "text-slate-900",
  textMuted: "text-slate-500",
  textSecondary: "text-slate-600",
  
  // סגנון כפתורים בתוך טבלה
  actionButton: "p-1.5 rounded transition-all duration-200",
  actionButtonGreen: "text-green-600 hover:bg-green-50",
  actionButtonBlue: "text-blue-600 hover:bg-blue-50",
  actionButtonGray: "text-slate-600 hover:bg-slate-100",
  actionButtonRed: "text-red-600 hover:bg-red-50",
  
  // סגנון טעינה ומצב ריק
  loadingContainer: "flex items-center justify-center h-64",
  loadingSpinner: "animate-spin w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full",
  emptyContainer: "flex items-center justify-center h-64 text-slate-500",
};

/**
 * קומפוננט DataTableContainer - עטיפת טבלה סטנדרטית
 */
export function DataTableContainer({ children, isLoading, isEmpty, emptyMessage }) {
  if (isLoading) {
    return (
      <div className={tableStyles.loadingContainer}>
        <div className={tableStyles.loadingSpinner}></div>
      </div>
    );
  }
  
  if (isEmpty) {
    return (
      <div className={tableStyles.emptyContainer}>
        {emptyMessage || 'אין נתונים להצגה'}
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      {children}
    </div>
  );
}

/**
 * קומפוננט DataTableHeader - כותרת טבלה סטנדרטית
 */
export function DataTableHeader({ title, subtitle, actions }) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-slate-600 text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

/**
 * קומפוננט DataTableSearch - שדה חיפוש סטנדרטי
 */
export function DataTableSearch({ placeholder, value, onChange }) {
  const { Input } = require('@/components/ui/input');
  
  return (
    <div className="mb-6">
      <Input
        placeholder={placeholder || 'חפש...'}
        value={value}
        onChange={onChange}
        className="h-10 text-right"
        dir="rtl"
      />
    </div>
  );
}

/**
 * קומפוננט DataTableWrapper - עטיפה סטנדרטית
 */
export function DataTableWrapper({ children }) {
  return (
    <div className={tableStyles.wrapper}>
      {children}
    </div>
  );
}