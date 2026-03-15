import React, { useRef } from 'react';
import { Upload, CloudUpload } from 'lucide-react';

/**
 * אזור גרירה והעלאה גדול לתיקייה
 * תומך ב: drag-and-drop + לחיצה להעלאה
 */
export default function FolderDropZone({ onFiles, dragActive, onDragEnter, onDragLeave, onDragOver, onDrop, isEmpty }) {
  const inputRef = useRef(null);

  const handleClick = () => inputRef.current?.click();

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onFiles(files);
    e.target.value = '';
  };

  if (!isEmpty) {
    // כשיש קבצים — פס קטן יותר בחלק העליון
    return (
      <div
        className={`border-2 border-dashed rounded-xl p-4 mb-4 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
        }`}
        onClick={handleClick}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="flex items-center justify-center gap-3 text-slate-500">
          <Upload className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-medium">גרור קבצים או העלה</span>
        </div>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
      </div>
    );
  }

  // תיקייה ריקה — אזור מרכזי גדול
  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer transition-all min-h-64 ${
        dragActive
          ? 'border-blue-400 bg-blue-50'
          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/80'
      }`}
      onClick={handleClick}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <CloudUpload className={`w-16 h-16 mb-4 transition-colors ${dragActive ? 'text-blue-400' : 'text-slate-300'}`} />
      <p className={`text-xl font-semibold mb-1 transition-colors ${dragActive ? 'text-blue-600' : 'text-slate-500'}`}>
        גרור קבצים או העלה
      </p>
      <p className="text-sm text-slate-400">לחץ כאן לבחירת קבצים</p>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
    </div>
  );
}