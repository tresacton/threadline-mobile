import * as LocalAuthentication from 'expo-local-authentication';

/** Whether the device has biometrics (or a passcode) enrolled and usable. */
export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

/** A human label for the available biometric (Face ID / Touch ID / Biometrics). */
export async function biometricLabel(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'Touch ID';
  return 'biometrics';
}

/**
 * Prompts for Face ID / Touch ID only — device-passcode fallback is disabled so
 * the user gets the biometric scan, not the grey iOS passcode screen. Returns
 * success; never throws.
 */
export async function authenticate(prompt = 'Unlock Threadline'): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
      cancelLabel: 'Cancel',
      disableDeviceFallback: true,
    });
    return result.success;
  } catch {
    return false;
  }
}
