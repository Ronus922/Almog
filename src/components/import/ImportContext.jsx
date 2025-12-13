import React, { createContext, useContext, useState, useCallback } from 'react';

const ImportContext = createContext(null);

export function ImportProvider({ children }) {
  const [importInProgress, setImportInProgress] = useState(false);
  const [abortController, setAbortController] = useState(null);

  const startImport = useCallback(() => {
    const controller = new AbortController();
    setAbortController(controller);
    setImportInProgress(true);
    console.log('[ImportGuard] Import started');
  }, []);

  const finishImport = useCallback(() => {
    setAbortController(null);
    setImportInProgress(false);
    console.log('[ImportGuard] Import finished');
  }, []);

  const cancelImport = useCallback(() => {
    if (abortController) {
      abortController.abort();
      console.log('[ImportGuard] Import cancelled');
    }
    setAbortController(null);
    setImportInProgress(false);
  }, [abortController]);

  return (
    <ImportContext.Provider value={{ 
      importInProgress, 
      startImport, 
      finishImport, 
      cancelImport,
      abortController 
    }}>
      {children}
    </ImportContext.Provider>
  );
}

export function useImport() {
  const context = useContext(ImportContext);
  if (!context) {
    throw new Error('useImport must be used within ImportProvider');
  }
  return context;
}