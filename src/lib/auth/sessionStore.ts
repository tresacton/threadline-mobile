import { API_V1 } from '../api/config';
import type { TokenPair } from '../api/types';
import * as storage from './storage';

/**
 * Holds the short-lived access token in memory and drives refresh-token rotation
 * against POST /session/refresh. Decoupled from React so the API client can call
 * it without importing context. The AuthProvider registers an onSignOut callback
 * so a dead refresh token (401: expired/reused) bubbles up to the UI.
 */
let accessToken: string | null = null;
let accessExpiresAt: number | null = null; // epoch ms
let inFlight: Promise<boolean> | null = null;
let signOutHandler: (() => void) | null = null;

const ACCESS_SKEW_MS = 5_000; // treat near-expiry as expired to avoid races

export function onSignOut(handler: () => void): void {
  signOutHandler = handler;
}

export async function setSession(pair: TokenPair): Promise<void> {
  accessToken = pair.access_token;
  accessExpiresAt = Date.parse(pair.access_expires_at);
  await storage.saveRefreshToken(pair.refresh_token);
}

export async function clearSession(): Promise<void> {
  accessToken = null;
  accessExpiresAt = null;
  await storage.deleteRefreshToken();
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function hasValidAccess(): boolean {
  return !!accessToken && !!accessExpiresAt && accessExpiresAt - Date.now() > ACCESS_SKEW_MS;
}

/**
 * Exchanges the stored refresh token for a fresh pair. Single-flight: concurrent
 * callers share one network round-trip. Returns false if there's no token or the
 * server rejects it (in which case we sign out); a transient network failure also
 * returns false but keeps the token so a later attempt can succeed.
 */
export function refresh(): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const refreshToken = await storage.getRefreshToken();
      if (!refreshToken) return false;

      let res: Response;
      try {
        res = await fetch(`${API_V1}/session/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
        return false; // offline / transient — keep the token, let caller retry
      }

      if (res.status === 401) {
        // Refresh token is dead (expired / reused / revoked): hard sign-out.
        await clearSession();
        signOutHandler?.();
        return false;
      }
      if (!res.ok) return false;

      const pair = (await res.json()) as TokenPair;
      await setSession(pair);
      return true;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
