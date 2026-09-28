import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    const token = localStorage.getItem('jispe_token');
    const storedUser = localStorage.getItem('jispe_user');

    if (!token || !storedUser) {
      setLoading(false);
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } catch (error) {
      localStorage.removeItem('jispe_token');
      localStorage.removeItem('jispe_user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user: loggedUser } = response.data;

    localStorage.setItem('jispe_token', token);
    localStorage.setItem('jispe_user', JSON.stringify(loggedUser));
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    setUser(loggedUser);

    return loggedUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('jispe_token');
    localStorage.removeItem('jispe_user');
    delete api.defaults.headers.common.Authorization;
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, loading }),
    [user, login, logout, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
