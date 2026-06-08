import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/lib/auth/AuthContext';

export default function AuthLayout() {
  const { status } = useAuth();
  if (status === 'signedIn') return <Redirect href="/(app)/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
