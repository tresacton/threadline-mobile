import { Link, Stack, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Auth } from '@/lib/api/endpoints';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    setSubmitting(true);
    try {
      await Auth.requestPasswordReset(email.trim());
      setSent(true);
    } catch (e) {
      setError(humanizeError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: true, title: 'Reset password' }} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.text }]}>Forgot your password?</Text>
        {sent ? (
          <>
            <Text style={[styles.lead, { color: theme.textSecondary }]}>
              If an account exists for {email.trim()}, we’ve sent a link to reset your password. Open it on
              the web to choose a new one, then come back and sign in.
            </Text>
            <Button label="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
          </>
        ) : (
          <>
            <Text style={[styles.lead, { color: theme.textSecondary }]}>
              Enter your email and we’ll send a link to set a new password. You’ll complete the reset on the
              Threadline website.
            </Text>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="you@example.com"
              error={error}
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />
            <Button label="Send reset link" onPress={onSubmit} loading={submitting} />
            <Link href="/(auth)/login" style={[styles.link, { color: theme.primary }]}>
              Back to sign in
            </Link>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.four, marginTop: Spacing.five },
  title: { fontSize: 24, fontWeight: '700' },
  lead: { fontSize: 15, lineHeight: 22 },
  link: { fontSize: 15, textAlign: 'center', paddingVertical: Spacing.two },
});
