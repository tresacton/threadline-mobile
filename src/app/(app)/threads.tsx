import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { OpenThreads } from '@/lib/api/endpoints';
import type { OpenThread } from '@/lib/api/types';

export default function ThreadsScreen() {
  const theme = useTheme();
  const threads = useQuery({ queryKey: ['open_threads'], queryFn: () => OpenThreads.list() });

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Open threads' }} />
      {threads.isLoading ? (
        <LoadingView />
      ) : threads.error ? (
        <ErrorView error={threads.error} onRetry={() => threads.refetch()} />
      ) : !threads.data || threads.data.length === 0 ? (
        <EmptyState title="No open threads" body="Loose ends the companion notices will appear here — nothing to revisit right now." />
      ) : (
        <FlatList contentInsetAdjustmentBehavior="never"
          data={threads.data}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ThreadCard thread={item} />}
        />
      )}
    </View>
  );
}

function ThreadCard({ thread }: { thread: OpenThread }) {
  const theme = useTheme();
  const qc = useQueryClient();
  const transition = useMutation({
    mutationFn: (action: 'resolve' | 'keep' | 'snooze' | 'set_aside') =>
      OpenThreads.transition(thread.id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['open_threads'] }),
    onError: (e) => humanizeError(e),
  });
  const discuss = useMutation({
    mutationFn: () => OpenThreads.discuss(thread.id),
    onSuccess: (conversation) => router.push(`/chat/${conversation.id}`),
    onError: (e) => Alert.alert('Could not start a chat', humanizeError(e)),
  });
  const busy = transition.isPending || discuss.isPending;

  return (
    <Card style={styles.card}>
      <Text style={[styles.note, { color: theme.text }]}>{thread.note || thread.summary || 'An open question.'}</Text>
      {thread.suggested_resolution_note ? (
        <Text style={[styles.suggestion, { color: theme.textSecondary }]}>
          Suggested: {thread.suggested_resolution_note}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button label="Talk it through" variant="primary" fullWidth={false} onPress={() => discuss.mutate()} disabled={busy} />
        <Button label="Resolve" variant="secondary" fullWidth={false} onPress={() => transition.mutate('resolve')} disabled={busy} />
        <Button label="Snooze" variant="ghost" fullWidth={false} onPress={() => transition.mutate('snooze')} disabled={busy} />
        <Button label="Leave it be" variant="ghost" fullWidth={false} onPress={() => transition.mutate('set_aside')} disabled={busy} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: Spacing.four, gap: Spacing.three },
  card: { gap: Spacing.three },
  note: { fontSize: 16, lineHeight: 22 },
  suggestion: { fontSize: 14, fontStyle: 'italic' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
