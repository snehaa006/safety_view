import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, getToken, decodeToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      const payload = decodeToken(token);
      if (payload && payload.exp > Date.now()) {
        setUser({
          id: payload.id,
          username: payload.sub,
          role: payload.role,
          device_id: payload.device_id ?? null,
          group_id: payload.group_id ?? null,
        });
      } else {
        apiLogout();
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    const { user: loggedInUser } = await apiLogin(username, password);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const value = { user, isLoading, login, logout, isAuthenticated: !!user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
