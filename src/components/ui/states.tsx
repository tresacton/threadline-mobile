import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';

export function LoadingView({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.primary} />
      {label ? <Text style={[styles.muted, { color: theme.textMuted }]}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {body ? <Text style={[styles.body, { color: theme.textSecondary }]}>{body}</Text> : null}
    </View>
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const theme = useTheme();
  const message = humanizeError(error);
  return (
    <View style={styles.center}>
      <Text style={[styles.title, { color: theme.text }]}>Something went wrong</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>{message}</Text>
      {onRetry ? <Button label="Try again" variant="secondary" fullWidth={false} onPress={onRetry} /> : null}
    </View>
  );
}

export function humanizeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.details.length) return error.details.join(', ');
    switch (error.code) {
      case 'ai_allowance_exceeded':
      case 'ai_quota_exceeded':
        return "You've reached this month's AI allowance. It resets next month.";
      case 'not_eligible':
        return 'Nothing has changed to scan yet.';
      default:
        return error.code ? error.code.replace(/_/g, ' ') : `Request failed (${error.status}).`;
    }
  }
  if (error instanceof Error) return error.message;
  return 'Please try again.';
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.six, gap: Spacing.three },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  muted: { fontSize: 14 },
});
