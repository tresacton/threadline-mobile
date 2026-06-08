import Constants from 'expo-constants';

/**
 * Base URL for the Threadline Rails API.
 *
 * Resolution order:
 *  1. `extra.apiUrl` in app.json (set this for staging/production).
 *  2. In dev, derive from the Expo dev-server host — Expo Go connects to Metro on
 *     your machine's LAN IP, and the Rails server runs on the same machine, so we
 *     reuse that IP on port 3000. This makes "npm start + scan QR" work on a
 *     physical iPhone/iPad with zero IP editing.
 *  3. Fallback to localhost (simulator / web).
 */
const API_PORT = 3000;

function deriveDevHost(): string | null {
  // e.g. "192.168.1.20:8081" (Metro) -> "http://192.168.1.20:3000"
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).expoGoConfig?.debuggerHost;
  if (!hostUri) return null;
  const host = String(hostUri).split(':')[0];
  if (!host) return null;
  return `http://${host}:${API_PORT}`;
}

const configured = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;

export const API_BASE_URL: string =
  configured?.replace(/\/$/, '') ?? deriveDevHost() ?? `http://localhost:${API_PORT}`;

export const API_V1 = `${API_BASE_URL}/api/v1`;
