import { Redirect, Stack } from 'expo-router';

import { LoadingView } from '@/components/ui/states';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/AuthContext';

/** Auth gate for everything inside the app. Unauthenticated users are bounced to
 *  the login/lock flow; the rest is a stack so screens can push details. Header
 *  styling here themes every pushed screen's nav bar. */
export default function AppLayout() {
  const { status } = useAuth();
  const theme = useTheme();

  if (status === 'loading') return <LoadingView label="Loading…" />;
  if (status === 'signedOut') return <Redirect href="/(auth)/login" />;
  if (status === 'locked') return <Redirect href="/(auth)/lock" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: theme.card },
        headerTitleStyle: { color: theme.text },
        headerTintColor: theme.primary,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        // A small, consistent breathing gap at the top of every screen.
        contentStyle: { backgroundColor: theme.background, paddingTop: 10 },
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
