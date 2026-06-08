import * as SecureStore from 'expo-secure-store';

import type { AuthUser } from '../api/types';

/**
 * Secure, on-device storage for the long-lived refresh token and a small session
 * meta blob. The refresh token is the durable credential; it lives in the
 * Keychain/Keystore with WHEN_UNLOCKED_THIS_DEVICE_ONLY so it never syncs to
 * iCloud and is unreadable while the device is locked. Per-read biometric prompts
 * are deliberately NOT used here — the app gates entry once at launch via
 * expo-local-authentication, which is better UX than prompting on every silent
 * token refresh. The access token is kept only in memory (see sessionStore).
 */
const REFRESH_KEY = 'threadline.refresh_token';
const META_KEY = 'threadline.session_meta';
const BIOMETRIC_PREF_KEY = 'threadline.biometric_lock';

const SECURE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export interface SessionMeta {
  user: AuthUser;
}

export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, token, SECURE_OPTS);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY, SECURE_OPTS);
}

export async function deleteRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_KEY, SECURE_OPTS);
}

export async function saveSessionMeta(meta: SessionMeta): Promise<void> {
  await SecureStore.setItemAsync(META_KEY, JSON.stringify(meta), SECURE_OPTS);
}

export async function getSessionMeta(): Promise<SessionMeta | null> {
  const raw = await SecureStore.getItemAsync(META_KEY, SECURE_OPTS);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionMeta;
  } catch {
    return null;
  }
}

export async function deleteSessionMeta(): Promise<void> {
  await SecureStore.deleteItemAsync(META_KEY, SECURE_OPTS);
}

export async function getBiometricPreference(): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(BIOMETRIC_PREF_KEY, SECURE_OPTS);
  return raw === 'true'; // opt-in: off until the user enables it (never traps a user)
}

export async function setBiometricPreference(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_PREF_KEY, String(enabled), SECURE_OPTS);
}
