import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Notifications } from '@/lib/api/endpoints';

export default function NotificationsScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: Notifications.list });

  const markSeen = useMutation({
    mutationFn: Notifications.markSeen,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Opening the pane clears the bell (parity with web), but reads stay explicit.
  useEffect(() => {
    if (notifications.data && notifications.data.unseen_count > 0) markSeen.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.data?.unseen_count]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Notifications' }} />
      {notifications.isLoading ? (
        <LoadingView />
      ) : notifications.error ? (
        <ErrorView error={notifications.error} onRetry={() => notifications.refetch()} />
      ) : !notifications.data || notifications.data.notifications.length === 0 ? (
        <EmptyState title="All caught up" body="Nothing new right now." />
      ) : (
        <FlatList contentInsetAdjustmentBehavior="never"
          data={notifications.data.notifications}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Text style={[styles.message, { color: theme.text }]}>{item.message}</Text>
              <Text style={[styles.time, { color: theme.textMuted }]}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: Spacing.four, gap: Spacing.three },
  card: { gap: Spacing.one },
  message: { fontSize: 15, lineHeight: 21 },
  time: { fontSize: 12 },
});
