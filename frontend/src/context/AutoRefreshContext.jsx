import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useDataCache } from './DataCacheContext';

const AutoRefreshContext = createContext();

export function AutoRefreshProvider({ children }) {
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const { invalidateCache } = useDataCache();
  const syncingTimerRef = useRef(null);

  const triggerRefresh = useCallback((detail = {}) => {
    // Invalidate stale in-memory cache so fresh data is loaded
    try {
      if (invalidateCache) {
        invalidateCache();
      }
    } catch (e) {
      // quiet fail
    }

    setIsSyncing(true);
    setRefreshTick(prev => prev + 1);
    setLastRefreshedAt(new Date());

    if (syncingTimerRef.current) {
      clearTimeout(syncingTimerRef.current);
    }
    syncingTimerRef.current = setTimeout(() => {
      setIsSyncing(false);
    }, 800);
  }, [invalidateCache]);

  useEffect(() => {
    // 1. Listen for global 'dms:refresh' events dispatched by api mutations or custom actions
    const handleGlobalRefresh = (event) => {
      triggerRefresh(event?.detail || {});
    };
    window.addEventListener('dms:refresh', handleGlobalRefresh);

    // 2. Window focus listener - when user switches back to the tab, sync fresh data
    const handleWindowFocus = () => {
      triggerRefresh({ source: 'window_focus' });
    };
    window.addEventListener('focus', handleWindowFocus);

    // 3. Background heartbeat sync every 30 seconds when window is active
    const heartbeatInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        triggerRefresh({ source: 'heartbeat_poll' });
      }
    }, 30000);

    return () => {
      window.removeEventListener('dms:refresh', handleGlobalRefresh);
      window.removeEventListener('focus', handleWindowFocus);
      clearInterval(heartbeatInterval);
      if (syncingTimerRef.current) {
        clearTimeout(syncingTimerRef.current);
      }
    };
  }, [triggerRefresh]);

  return (
    <AutoRefreshContext.Provider
      value={{
        refreshTick,
        lastRefreshedAt,
        isSyncing,
        triggerRefresh,
      }}
    >
      {children}
    </AutoRefreshContext.Provider>
  );
}

export function useAutoRefreshContext() {
  const context = useContext(AutoRefreshContext);
  if (!context) {
    throw new Error('useAutoRefreshContext must be used within an AutoRefreshProvider');
  }
  return context;
}

/**
 * Custom hook for components to automatically re-fetch data whenever any mutation or refresh occurs.
 * @param {Function} fetchCallback - Async or sync data fetching function. Receives (isInitial: boolean).
 * @param {Object} options - { debounceMs: 250, enabled: true, runOnMount: true }
 */
export function useAutoRefresh(fetchCallback, options = {}) {
  const { debounceMs = 250, enabled = true, runOnMount = true } = options;
  const context = useContext(AutoRefreshContext);
  const refreshTick = context?.refreshTick || 0;
  
  const fetchRef = useRef(fetchCallback);
  fetchRef.current = fetchCallback;
  const isMountedRef = useRef(false);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    if (!isMountedRef.current) {
      isMountedRef.current = true;
      if (runOnMount && fetchRef.current) {
        fetchRef.current(true);
      }
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (fetchRef.current) {
        fetchRef.current(false);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [refreshTick, enabled, debounceMs, runOnMount]);
}
