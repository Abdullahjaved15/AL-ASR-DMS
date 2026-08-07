import React, { createContext, useContext, useState, useRef } from 'react';

const DataCacheContext = createContext();

export function DataCacheProvider({ children }) {
  const cacheRef = useRef({});
  const [, setForceUpdate] = useState(0);

  const getCache = (key) => cacheRef.current[key] || null;

  const setCache = (key, data) => {
    cacheRef.current[key] = {
      data,
      timestamp: Date.now()
    };
    setForceUpdate(n => n + 1);
  };

  const invalidateCache = (key) => {
    if (key) {
      delete cacheRef.current[key];
    } else {
      cacheRef.current = {};
    }
    setForceUpdate(n => n + 1);
  };

  return (
    <DataCacheContext.Provider value={{ getCache, setCache, invalidateCache }}>
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache() {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
}
