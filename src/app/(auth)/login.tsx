import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';

export default function LoginScreen() {
  const theme = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setError('That email or password didn’t match.');
      else if (e instanceof ApiError && e.status === 429) setError('Too many attempts. Please wait a minute and try again.');
      else setError(humanizeError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <Text style={[styles.brand, { color: theme.primary }]}>Threadline</Text>
        <Text style={[styles.tagline, { color: theme.textSecondary }]}>
          Your memories, gently kept.
        </Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@example.com"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          placeholder="••••••••"
          error={error}
          onSubmitEditing={onSubmit}
          returnKeyType="go"
        />
        <Button label="Sign in" onPress={onSubmit} loading={submitting} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: Spacing.eight, marginBottom: Spacing.seven, gap: Spacing.two },
  brand: { fontSize: 36, fontWeight: '700', letterSpacing: 0.5 },
  tagline: { fontSize: 16 },
  form: { gap: Spacing.four },
});
