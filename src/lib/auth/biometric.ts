import * as LocalAuthentication from 'expo-local-authentication';

export type LockCapability = 'biometric' | 'passcode' | 'none';

/**
 * What the device can use to gate the app:
 *  - 'biometric' — Face ID / Touch ID enrolled.
 *  - 'passcode'  — no biometrics, but a device passcode is set.
 *  - 'none'      — no device security at all (lock can't be offered).
 */
export async function getLockCapability(): Promise<LockCapability> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level >= LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK) return 'biometric';
    if (level === LocalAuthentication.SecurityLevel.SECRET) return 'passcode';
    return 'none';
  } catch {
    return 'none';
  }
}

export async function isLockAvailable(): Promise<boolean> {
  return (await getLockCapability()) !== 'none';
}

/** Human label for the available lock — used in Settings and prompts. */
export async function lockLabel(): Promise<string> {
  const cap = await getLockCapability();
  if (cap === 'passcode') return 'device passcode';
  if (cap === 'none') return 'device lock';
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'Touch ID';
  return 'biometrics';
}

/**
 * Prompts to unlock. Biometric devices get Face ID / Touch ID with NO passcode
 * fallback (so you get the scan, not the grey passcode screen). Passcode-only
 * devices use the device passcode. Returns success; never throws.
 */
export async function authenticate(prompt = 'Unlock Threadline'): Promise<boolean> {
  try {
    const cap = await getLockCapability();
    if (cap === 'none') return true; // nothing to verify against
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
      cancelLabel: 'Cancel',
      disableDeviceFallback: cap === 'biometric',
    });
    return result.success;
  } catch {
    return false;
  }
}
