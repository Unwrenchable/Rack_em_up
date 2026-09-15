import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearSession,
  enterDemoMode,
  fetchMe,
  getStoredUser,
  getToken,
  isDemoMode,
  login as apiLogin,
  persistUser,
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
  updateUser: (patch: Partial<User>) => void;
};

const AuthContext = createContext<AuthState | null>(null);

function sessionStill(tokenAtStart: string | null) {
  return getToken() === tokenAtStart && !isDemoMode();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getToken());
  const [demo, setDemo] = useState(() => isDemoMode());

  useEffect(() => {
    const tokenAtStart = getToken();
    if (!tokenAtStart || isDemoMode()) return;
    fetchMe()
      .then((full) => {
        if (!sessionStill(tokenAtStart)) return;
        setUser(full);
        persistUser(full);
      })
      .catch(() => {
        /* keep stored session */
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    const nextToken = getToken();
    setUser(u);
    setToken(nextToken);
    setDemo(false);
    try {
      const full = await fetchMe();
      if (getToken() !== nextToken || isDemoMode()) return;
      setUser(full);
      persistUser(full);
    } catch {
      /* login payload still has ROC fields */
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, displayName: string) => {
    const u = await apiSignup(email, password, displayName);
    const nextToken = getToken();
    setUser(u);
    setToken(nextToken);
    setDemo(false);
    try {
      const full = await fetchMe();
      if (getToken() !== nextToken || isDemoMode()) return;
      setUser(full);
      persistUser(full);
    } catch {
      /* signup payload still has ROC fields */
    }
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

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      persistUser(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ user, token, demo, login, signup, startDemo, logout, updateUser }),
    [user, token, demo, login, signup, startDemo, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
