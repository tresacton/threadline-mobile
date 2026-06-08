import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { api } from '../api/client';
import { Auth } from '../api/endpoints';
import type { AuthUser, LoginResponse } from '../api/types';
import * as biometric from './biometric';
import * as sessionStore from './sessionStore';
import * as storage from './storage';

export type AuthStatus = 'loading' | 'signedOut' | 'locked' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  biometricEnabled: boolean; // the user's preference
  biometricAvailable: boolean; // whether this device supports it
  biometricLabel: string; // "Face ID" / "Touch ID" / "biometrics"
  login: (email: string, password: string, deviceName?: string) => Promise<void>;
  register: (email: string, password: string, passwordConfirmation: string) => Promise<void>;
  logout: () => Promise<void>;
  unlock: () => Promise<boolean>;
  lockNow: () => void;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
}

// Only re-lock after the app has been in the background this long — quick app
// switches shouldn't force a re-auth.
const LOCK_AFTER_MS = 5 * 60 * 1000;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false); // preference
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('biometrics');
  const bootstrapped = useRef(false);
  const statusRef = useRef(status);
  const backgroundedAt = useRef<number | null>(null);

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

  // Re-lock only after the app has been backgrounded for LOCK_AFTER_MS. Face
  // ID/Touch ID prompts move the app to 'inactive' (not 'background'), so they
  // never set backgroundedAt — no re-lock loop while unlocking.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        backgroundedAt.current = Date.now();
        return;
      }
      if (next === 'active') {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (
          since != null &&
          Date.now() - since > LOCK_AFTER_MS &&
          biometricEnabled &&
          biometricAvailable &&
          statusRef.current === 'signedIn'
        ) {
          setStatus('locked');
        }
      }
    });
    return () => sub.remove();
  }, [biometricEnabled, biometricAvailable]);

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
      const [refreshToken, meta, prefEnabled, available, label] = await Promise.all([
        storage.getRefreshToken(),
        storage.getSessionMeta(),
        storage.getBiometricPreference(),
        biometric.isLockAvailable(),
        biometric.lockLabel(),
      ]);
      setBiometricEnabledState(prefEnabled);
      setBiometricAvailable(available);
      setBiometricLabel(label);

      if (!refreshToken) {
        setStatus('signedOut');
        return;
      }
      if (meta?.user) setUser(meta.user);

      if (prefEnabled && available) {
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

  // Signup mints the same token pair as login and signs the user straight in;
  // the onboarding wizard then runs (gated on the fresh account's onboarded flag).
  const register = useCallback(async (email: string, password: string, passwordConfirmation: string) => {
    const res = await Auth.register(email, password, passwordConfirmation);
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
    setBiometricEnabledState(enabled);
  }, []);

  // Lock immediately — used by Settings to let the user test Face ID / Touch ID.
  const lockNow = useCallback(() => {
    if (biometricAvailable) setStatus('locked');
  }, [biometricAvailable]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      biometricEnabled,
      biometricAvailable,
      biometricLabel,
      login,
      register,
      logout,
      unlock,
      lockNow,
      setBiometricEnabled,
    }),
    [status, user, biometricEnabled, biometricAvailable, biometricLabel, login, register, logout, unlock, lockNow, setBiometricEnabled],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
