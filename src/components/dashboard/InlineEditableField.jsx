import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, AlertTriangle } from 'lucide-react';

/**
 * InlineEditableField - קומפוננטה לעריכת שדות inline
 * תומכת בקליק על הטקסט עצמו או על העיפרון להיכנס למצב עריכה
 */
export default function InlineEditableField({
  icon: Icon,
  label,
  value,
  recordId,
  fieldName,
  isAdmin,
  onSave,
  formatDisplay,
  validate,
  inputType = 'text'
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  // Focus על input בכניסה למצב עריכה
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEnterEdit = () => {
    if (!isAdmin) return;
    
    console.log('[INLINE_EDIT] ENTER_EDIT', fieldName, recordId);
    setEditValue(value || '');
    setError('');
    setIsEditing(true);
  };

  const handleCancel = () => {
    console.log('[INLINE_EDIT] CANCEL_EDIT', fieldName, recordId);
    setIsEditing(false);
    setError('');
  };

  const handleSave = async () => {
    // Validation
    if (validate) {
      const validationError = validate(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    console.log('[INLINE_EDIT] SAVE_FIELD', fieldName, editValue, recordId);
    
    setSaving(true);
    setError('');

    try {
      await onSave(fieldName, editValue);
      console.log('[INLINE_EDIT] SAVE_OK', fieldName, recordId);
      setIsEditing(false);
    } catch (err) {
      console.error('[INLINE_EDIT] SAVE_FAIL', fieldName, recordId, err);
      setError('שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const displayValue = formatDisplay ? formatDisplay(value) : (value || '-');

  return (
    <div className="flex items-center gap-2 py-1.5" dir="rtl">
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-slate-600" />
      </div>
      
      <div className="flex-1 text-right min-w-0">
        <p className="text-xs text-slate-500 font-semibold">{label}</p>
        
        {!isEditing ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            <p 
              className={`text-sm md:text-base font-bold text-slate-800 text-right truncate ${isAdmin ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
              onClick={handleEnterEdit}
              title={isAdmin ? 'לחץ לעריכה' : displayValue}
            >
              {displayValue}
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleEnterEdit();
                }}
                className="p-0.5 hover:bg-slate-200 rounded transition-colors flex-shrink-0"
                title="ערוך"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-600" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              ref={inputRef}
              type={inputType}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-10 rounded-lg text-right"
              dir="rtl"
              disabled={saving}
            />
            {error && (
              <p className="text-xs text-red-600 font-semibold text-right flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {error}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
                className="h-8 px-3 rounded-lg"
              >
                <X className="w-3 h-3 ml-1" />
                ביטול
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin">⏳</span>
                    שומר...
                  </span>
                ) : (
                  <>
                    <Check className="w-3 h-3 ml-1" />
                    שמור
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}