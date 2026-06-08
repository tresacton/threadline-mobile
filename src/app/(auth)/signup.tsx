import { Link } from 'expo-router';
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

export default function SignupScreen() {
  const theme = useTheme();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and a password.');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }
    if (password !== confirm) {
      setError('Those passwords don’t match.');
      return;
    }
    setSubmitting(true);
    try {
      await register(email.trim(), password, confirm);
      // On success the auth state flips to signed-in and the onboarding wizard runs.
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        setError(e.details[0] ?? 'That didn’t work — try a different email or password.');
      } else if (e instanceof ApiError && e.status === 429) {
        setError('Too many attempts. Please wait a minute and try again.');
      } else {
        setError(humanizeError(e));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <Text style={[styles.brand, { color: theme.primary }]}>Create your account</Text>
        <Text style={[styles.tagline, { color: theme.textSecondary }]}>
          A private, gentle home for your memories.
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
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="At least 8 characters"
        />
        <TextField
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="Re-enter your password"
          error={error}
          onSubmitEditing={onSubmit}
          returnKeyType="go"
        />
        <Button label="Create account" onPress={onSubmit} loading={submitting} />
        <Link href="/(auth)/login" style={[styles.link, { color: theme.primary }]}>
          Already have an account? Sign in
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: Spacing.seven, marginBottom: Spacing.six, gap: Spacing.two },
  brand: { fontSize: 28, fontWeight: '700', letterSpacing: 0.3, textAlign: 'center' },
  tagline: { fontSize: 16, textAlign: 'center' },
  form: { gap: Spacing.four },
  link: { fontSize: 15, textAlign: 'center', paddingVertical: Spacing.two },
});
