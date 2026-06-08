import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Voice } from '@/lib/api/endpoints';

export default function VoiceSessionsScreen() {
  const theme = useTheme();
  const sessions = useQuery({ queryKey: ['voice_sessions'], queryFn: Voice.list });

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Voice' }} />
      {sessions.isLoading ? (
        <LoadingView />
      ) : sessions.error ? (
        <ErrorView error={sessions.error} onRetry={() => sessions.refetch()} />
      ) : !sessions.data || sessions.data.length === 0 ? (
        <EmptyState
          title="No voice sessions yet"
          body="Live voice calls with your companion are coming soon. Past sessions will appear here."
        />
      ) : (
        <FlatList contentInsetAdjustmentBehavior="never"
          data={sessions.data}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <Ionicons name="mic-outline" size={20} color={theme.primary} />
              <View style={styles.main}>
                <Text style={[styles.title, { color: theme.text }]}>
                  {item.current_mode || item.initial_mode || 'Voice session'}
                </Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  {item.started_at ? new Date(item.started_at).toLocaleDateString() : '—'} ·{' '}
                  {item.segment_count} segments
                </Text>
              </View>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  main: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '600', textTransform: 'capitalize' },
  meta: { fontSize: 13 },
});
