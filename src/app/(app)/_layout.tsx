import { Redirect, Stack } from 'expo-router';

import { LoadingView } from '@/components/ui/states';
import { useAuth } from '@/lib/auth/AuthContext';

/** Auth gate for everything inside the app. Unauthenticated users are bounced to
 *  the login/lock flow; the rest is a stack so screens can push details. */
export default function AppLayout() {
  const { status } = useAuth();

  if (status === 'loading') return <LoadingView label="Loading…" />;
  if (status === 'signedOut') return <Redirect href="/(auth)/login" />;
  if (status === 'locked') return <Redirect href="/(auth)/lock" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
