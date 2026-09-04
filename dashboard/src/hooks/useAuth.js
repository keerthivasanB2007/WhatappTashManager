import { useState, useEffect } from 'react';
import api from '../api/axiosClient';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    JSON.parse(localStorage.getItem('auth_active') || 'false')
  );

  useEffect(() => {
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      localStorage.removeItem('auth_active');
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    if (res.data.success) {
      setIsAuthenticated(true);
      localStorage.setItem('auth_active', 'true');
    }
    return res.data;
  };

  const logout = async () => {
    try {
        await api.post('/api/auth/logout');
    } catch (e) {
        // silent fail on logout network error
    } finally {
        setIsAuthenticated(false);
        localStorage.removeItem('auth_active');
    }
  };

  return { isAuthenticated, login, logout, setIsAuthenticated };
}
