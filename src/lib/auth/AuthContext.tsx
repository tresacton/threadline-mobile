import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

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
  const statusRef = useRef(status);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // A dead refresh token anywhere in the app forces a clean sign-out.
  useEffect(() => {
    sessionStore.onSignOut(() => {
      setUser(null);
      setStatus('signedOut');
    });
  }, []);

  // Re-lock when returning to the app from the background (the expected behaviour
  // for a biometric app-lock). Face ID/Touch ID prompts only move the app to
  // 'inactive', not 'background', so unlocking won't trigger a re-lock loop.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appState.current;
      appState.current = next;
      if (prev === 'background' && next === 'active' && biometricEnabled && statusRef.current === 'signedIn') {
        setStatus('locked');
      }
    });
    return () => sub.remove();
  }, [biometricEnabled]);

  // Entering the app is just a UI state change — the access token is refreshed
  // lazily by the API client on the next request. We do NOT refresh here, so a
  // transient network blip (or biometrics) can't bounce the user to the login
  // screen; a genuinely dead refresh token surfaces as a 401 -> onSignOut.
  const enterApp = useCallback((knownUser: AuthUser | null) => {
    if (knownUser) setUser(knownUser);
    setStatus('signedIn');
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
        enterApp(meta?.user ?? null);
      }
    })();
  }, [enterApp]);

  const unlock = useCallback(async (): Promise<boolean> => {
    const ok = await biometric.authenticate('Unlock Threadline');
    if (!ok) return false;
    const meta = await storage.getSessionMeta();
    enterApp(meta?.user ?? null);
    return true;
  }, [enterApp]);

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
