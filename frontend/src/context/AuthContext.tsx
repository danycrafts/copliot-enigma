import { createContext } from 'preact';
import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks';
import type { ComponentChildren, FunctionalComponent } from 'preact';

import { GetSession, Login, Logout } from '../../wailsjs/go/main/App';
import type { AuthSession, LoginRequest } from '../types';

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  login: (payload: LoginRequest) => Promise<AuthSession>;
  logout: () => Promise<AuthSession>;
  refresh: () => Promise<AuthSession>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ComponentChildren;
}

export const AuthProvider: FunctionalComponent<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    const result = await GetSession();
    setSession(result);
    setLoading(false);
    return result;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleLogin = useCallback(async (payload: LoginRequest) => {
    const result = await Login(payload);
    setSession(result);
    setLoading(false);
    return result;
  }, []);

  const handleLogout = useCallback(async () => {
    const result = await Logout();
    setSession(result);
    return result;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      login: handleLogin,
      logout: handleLogout,
      refresh
    }),
    [handleLogin, handleLogout, loading, refresh, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
