import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('dms_token');
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch (err) {
          console.error('Session restoration error:', err);
          localStorage.removeItem('dms_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
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

  const isAdmin = user?.role === 'ADMIN';
  const isSalesman = user?.role === 'SALESMAN';

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, isAdmin, isSalesman }}>
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
