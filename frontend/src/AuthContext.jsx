import { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('token')));

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api
      .get('/auth/me')
      .then((r) => setUser(r.data.data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const save = ({ token, user }) => {
    localStorage.setItem('token', token);
    setUser(user);
  };
  const login = async (email, password) => save((await api.post('/auth/login', { email, password })).data.data);
  const register = async (name, email, password) =>
    save((await api.post('/auth/register', { name, email, password })).data.data);
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthCtx.Provider>
  );
}
