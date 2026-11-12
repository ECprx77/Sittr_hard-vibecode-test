import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AppPublicConfig, AuthUser, PublicProfile, Role } from '../../../shared/types';
import { ApiError, api, fallbackConfig, getConfig, getMe } from '../api/client';

type RegisterPayload = {
  email: string;
  password: string;
  role: 'parent' | 'babysitter';
  firstName: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  config: AppPublicConfig;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  applyProfile: (profile: PublicProfile) => void;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AppPublicConfig>(fallbackConfig);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const next = await getConfig();
        if (active) setConfig(next);
      } catch {
        /* Le numéro de repli reste affiché. */
      }
      try {
        const me = await getMe();
        if (active) setUser(me);
      } catch (error) {
        if (active && (!(error instanceof ApiError) || error.status !== 401)) {
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await api<{ user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    await api('/api/auth/me', { method: 'DELETE' });
    setUser(null);
  }, []);

  const applyProfile = useCallback((profile: PublicProfile) => {
    setUser((current) => (current ? { ...current, profile } : current));
  }, []);

  const value = useMemo(
    () => ({ user, loading, config, login, register, logout, applyProfile, deleteAccount }),
    [user, loading, config, login, register, logout, applyProfile, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return value;
}

export function spacePath(role: Role | undefined): string {
  if (role === 'babysitter') return '/espace/baby-sitter';
  if (role === 'parent') return '/espace/parent';
  return '/espace';
}
