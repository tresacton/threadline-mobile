import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Options, Settings, Voice } from '@/lib/api/endpoints';

export default function VoiceSessionsScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const sessions = useQuery({ queryKey: ['voice_sessions'], queryFn: Voice.list });
  const options = useQuery({ queryKey: ['options'], queryFn: Options.get });
  const settings = useQuery({ queryKey: ['settings'], queryFn: Settings.get });

  const setDefaultMode = useMutation({
    mutationFn: (modeId: number) => Settings.update({ default_voice_call_mode_id: modeId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  const modes = options.data?.voice_call_modes ?? [];
  const defaultModeId = settings.data?.settings.default_voice_call_mode_id ?? null;

  const Header = (
    <View style={styles.header}>
      <Text style={[styles.lead, { color: theme.textSecondary }]}>
        Live voice calls with your companion are coming soon. You can set a default mode now, and any past
        sessions appear below.
      </Text>
      {modes.length > 0 ? (
        <Card style={styles.modeCard}>
          <Select
            label="Default call mode"
            value={defaultModeId}
            options={modes.map((m) => ({ value: m.id, label: m.name }))}
            onChange={(v) => setDefaultMode.mutate(v)}
          />
        </Card>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Voice' }} />
      {sessions.isLoading ? (
        <LoadingView />
      ) : sessions.error ? (
        <ErrorView error={sessions.error} onRetry={() => sessions.refetch()} />
      ) : (
        <FlatList
          contentInsetAdjustmentBehavior="never"
          data={sessions.data ?? []}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={Header}
          ListEmptyComponent={
            <EmptyState title="No voice sessions yet" body="Past sessions will appear here once voice calls are available." />
          }
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/voice-session/${item.id}`)} style={styles.row}>
              <Ionicons name="mic-outline" size={20} color={theme.primary} />
              <View style={styles.main}>
                <Text style={[styles.title, { color: theme.text }]}>
                  {item.current_mode || item.initial_mode || 'Voice session'}
                </Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  {item.started_at ? new Date(item.started_at).toLocaleDateString() : '—'} · {item.segment_count} segments
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
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
  header: { gap: Spacing.three, marginBottom: Spacing.one },
  lead: { fontSize: 14, lineHeight: 20 },
  modeCard: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  main: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '600', textTransform: 'capitalize' },
  meta: { fontSize: 13 },
});
