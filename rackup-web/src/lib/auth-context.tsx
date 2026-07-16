import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearSession,
  enterDemoMode,
  getStoredUser,
  getToken,
  isDemoMode,
  login as apiLogin,
  signup as apiSignup,
} from './api';
import type { User } from './types';

type AuthState = {
  user: User | null;
  token: string | null;
  demo: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  startDemo: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getToken());
  const [demo, setDemo] = useState(() => isDemoMode());

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    setUser(u);
    setToken(getToken());
    setDemo(false);
  }, []);

  const signup = useCallback(async (email: string, password: string, displayName: string) => {
    const u = await apiSignup(email, password, displayName);
    setUser(u);
    setToken(getToken());
    setDemo(false);
  }, []);

  const startDemo = useCallback(() => {
    const u = enterDemoMode();
    setUser(u);
    setToken('demo');
    setDemo(true);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setToken(null);
    setDemo(false);
  }, []);

  const value = useMemo(
    () => ({ user, token, demo, login, signup, startDemo, logout }),
    [user, token, demo, login, signup, startDemo, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}