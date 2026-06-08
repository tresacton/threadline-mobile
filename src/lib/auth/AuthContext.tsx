import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { api } from '../api/client';
import type { AuthUser, LoginResponse } from '../api/types';
import * as biometric from './biometric';
import * as sessionStore from './sessionStore';
import * as storage from './storage';

export type AuthStatus = 'loading' | 'signedOut' | 'locked' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  biometricEnabled: boolean;
  login: (email: string, password: string, deviceName?: string) => Promise<void>;
  logout: () => Promise<void>;
  unlock: () => Promise<boolean>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const bootstrapped = useRef(false);

  // A dead refresh token anywhere in the app forces a clean sign-out.
  useEffect(() => {
    sessionStore.onSignOut(() => {
      setUser(null);
      setStatus('signedOut');
    });
  }, []);

  const enterSignedIn = useCallback(async (knownUser: AuthUser | null): Promise<boolean> => {
    const ok = await sessionStore.refresh();
    if (!ok) {
      setStatus('signedOut');
      return false;
    }
    if (knownUser) setUser(knownUser);
    setStatus('signedIn');
    return true;
  }, []);

  // Bootstrap once: resume a stored session, gated by biometrics if enabled.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    (async () => {
      const [refreshToken, meta, prefEnabled, available] = await Promise.all([
        storage.getRefreshToken(),
        storage.getSessionMeta(),
        storage.getBiometricPreference(),
        biometric.isBiometricAvailable(),
      ]);
      const useBiometric = prefEnabled && available;
      setBiometricEnabledState(useBiometric);

      if (!refreshToken) {
        setStatus('signedOut');
        return;
      }
      if (meta?.user) setUser(meta.user);

      if (useBiometric) {
        setStatus('locked');
      } else {
        await enterSignedIn(meta?.user ?? null);
      }
    })();
  }, [enterSignedIn]);

  const unlock = useCallback(async (): Promise<boolean> => {
    const ok = await biometric.authenticate('Unlock Threadline');
    if (!ok) return false;
    const meta = await storage.getSessionMeta();
    return enterSignedIn(meta?.user ?? null);
  }, [enterSignedIn]);

  const login = useCallback(async (email: string, password: string, deviceName?: string) => {
    const res = await api.post<LoginResponse>(
      '/session',
      { session: { email, password, device_name: deviceName ?? 'Threadline mobile' } },
      { noAuth: true },
    );
    await sessionStore.setSession(res);
    await storage.saveSessionMeta({ user: res.user });
    setUser(res.user);
    setStatus('signedIn');
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.delete('/session');
    } catch {
      // best-effort server revoke; local clear below is what matters
    }
    await sessionStore.clearSession();
    await storage.deleteSessionMeta();
    setUser(null);
    setStatus('signedOut');
  }, []);

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    await storage.setBiometricPreference(enabled);
    setBiometricEnabledState(enabled && (await biometric.isBiometricAvailable()));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, biometricEnabled, login, logout, unlock, setBiometricEnabled }),
    [status, user, biometricEnabled, login, logout, unlock, setBiometricEnabled],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
