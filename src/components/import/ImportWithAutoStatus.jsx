import React from 'react';
import ExcelImporter from './ExcelImporter';

export default function ImportWithAutoStatus({ onImportComplete }) {
  const handleImportComplete = async (importedRecords) => {
    // כאן נוסיף לוגיקת חישוב debt_status_auto
    if (onImportComplete) {
      await onImportComplete(importedRecords);
    }
  };

  return <ExcelImporter onImportComplete={handleImportComplete} />;
}