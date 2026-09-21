import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Safety timeout: ensure loading screen is never stuck indefinitely
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 4000);

    const checkAuth = async () => {
      const token = localStorage.getItem('dms_token');
      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        // Race against a 3.5s timeout to prevent infinite hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth request timed out')), 3500)
        );
        const res = await Promise.race([api.getMe(), timeoutPromise]);
        if (isMounted && res && res.user) {
          setUser(res.user);
        } else if (isMounted) {
          localStorage.removeItem('dms_token');
          setUser(null);
        }
      } catch (err) {
        console.warn('Session restoration error or timeout:', err.message || err);
        localStorage.removeItem('dms_token');
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    localStorage.setItem('dms_token', res.token);
    setUser(res.user);
    return res;
  };

  const register = async (userData) => {
    return await api.register(userData);
  };

  const logout = () => {
    localStorage.removeItem('dms_token');
    setUser(null);
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isAccountsHead = user?.role === 'ACCOUNTS_HEAD';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const isAccountsStaff = ['ACCOUNTS_HEAD', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(user?.role);
  const canAccessAccounts = ['ACCOUNTS_HEAD', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(user?.role);
  const canManageAccounts = ['ACCOUNTS_HEAD'].includes(user?.role);
  const isSalesman = user?.role === 'SALESMAN';

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        setUser, 
        loading, 
        login, 
        register, 
        logout, 
        isSuperAdmin, 
        isAdmin, 
        isAccountsHead,
        isAccountant,
        isAccountsStaff,
        canAccessAccounts,
        canManageAccounts,
        isSalesman 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
