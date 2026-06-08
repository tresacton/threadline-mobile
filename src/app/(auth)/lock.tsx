import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/AuthContext';

export default function LockScreen() {
  const theme = useTheme();
  const { unlock, logout, user } = useAuth();
  const [tried, setTried] = useState(false);
  const prompting = useRef(false);

  const attempt = async () => {
    if (prompting.current) return; // never stack biometric prompts
    prompting.current = true;
    setTried(true);
    try {
      await unlock();
    } finally {
      prompting.current = false;
    }
  };

  // Prompt automatically on first show — the user expects Face ID immediately.
  useEffect(() => {
    attempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen>
      <View style={styles.center}>
        <Ionicons name="lock-closed" size={56} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>
          {user?.companion_name ? `Welcome back` : 'Locked'}
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Unlock Threadline to continue.
        </Text>
        <View style={styles.actions}>
          <Button label={tried ? 'Try again' : 'Unlock'} onPress={attempt} />
          <Button label="Sign in with password instead" variant="ghost" onPress={logout} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  title: { fontSize: 24, fontWeight: '700' },
  body: { fontSize: 16, textAlign: 'center' },
  actions: { marginTop: Spacing.five, gap: Spacing.three, alignSelf: 'stretch' },
});
