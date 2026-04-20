// src/context/AuthContext.js
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Set axios auth header whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Restore session on page load
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    axios.get(`${API}/api/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const me = res.data.users?.[0];
        if (me) setUser(me);
        else { setToken(null); setUser(null); }
      })
      .catch(() => { setToken(null); setUser(null); })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const login = useCallback(async (username, password) => {
    const res = await axios.post(`${API}/api/auth/login`, { username, password });
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await axios.post(`${API}/api/auth/logout`); } catch {}
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updated) => {
    setUser(prev => ({ ...prev, ...updated }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
