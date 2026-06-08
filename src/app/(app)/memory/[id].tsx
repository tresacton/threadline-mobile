import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Memories } from '@/lib/api/endpoints';

export default function MemoryDetailScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memoryId = Number(id);

  const memory = useQuery({ queryKey: ['memory', memoryId], queryFn: () => Memories.get(memoryId) });

  const summarise = useMutation({
    mutationFn: () => Memories.summarise(memoryId),
    onSuccess: () => Alert.alert('Summarising', 'A summary is being generated and will appear shortly.'),
    onError: (e) => Alert.alert('Could not summarise', humanizeError(e)),
  });

  const remove = useMutation({
    mutationFn: () => Memories.remove(memoryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memories'] });
      router.back();
    },
  });

  const confirmDelete = () =>
    Alert.alert('Delete memory', 'Your original capture is kept. Delete this memory?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  if (memory.isLoading) return <LoadingView />;
  if (memory.error || !memory.data) return <ErrorView error={memory.error} onRetry={() => memory.refetch()} />;

  const m = memory.data;

  return (
    <ScrollView contentInsetAdjustmentBehavior="never" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: true, title: '' }} />

      <Text style={[styles.title, { color: theme.text }]}>{m.title || 'Untitled memory'}</Text>
      {m.date_label ? (
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={15} color={theme.textMuted} />
          <Text style={[styles.meta, { color: theme.textMuted }]}>{m.date_label}</Text>
        </View>
      ) : null}

      {m.structured_body ? <Text style={[styles.body, { color: theme.text }]}>{m.structured_body}</Text> : null}

      {m.ai_summary ? (
        <Card style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Companion summary</Text>
          <Text style={[styles.body, { color: theme.text }]}>{m.ai_summary}</Text>
        </Card>
      ) : null}

      {m.original_wording && m.original_wording !== m.structured_body ? (
        <Card style={styles.summary}>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Your original words</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>{m.original_wording}</Text>
        </Card>
      ) : null}

      <Pills label="People" values={m.people} />
      <Pills label="Places" values={m.places} />
      <Pills label="Tags" values={m.tags} />

      <View style={styles.actions}>
        <ActionRow icon="create-outline" label="Edit memory" onPress={() => router.push(`/edit-memory/${memoryId}`)} />
        <ActionRow icon="git-network-outline" label="View connections" onPress={() => router.push(`/graph/memory/${memoryId}`)} />
        <ActionRow icon="sparkles-outline" label="Summarise with AI" onPress={() => summarise.mutate()} />
        <ActionRow icon="time-outline" label="Reconstruct the date" onPress={() => router.push(`/reconstruct/${memoryId}`)} />
        <ActionRow icon="bulb-outline" label="Add detail (enrich)" onPress={() => router.push(`/enrich/${memoryId}`)} />
        <ActionRow icon="trash-outline" label="Delete memory" danger onPress={confirmDelete} />
      </View>
    </ScrollView>
  );
}

function Pills({ label, values }: { label: string; values: string[] }) {
  const theme = useTheme();
  if (!values || values.length === 0) return null;
  return (
    <View style={styles.pillsWrap}>
      <Text style={[styles.pillsLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View style={styles.pills}>
        {values.map((v) => (
          <View key={v} style={[styles.pill, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.pillText, { color: theme.text }]}>{v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={20} color={danger ? theme.danger : theme.primary} />
      <Text style={[styles.actionLabel, { color: danger ? theme.danger : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.eight },
  title: { fontSize: 24, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  meta: { fontSize: 14 },
  body: { fontSize: 16, lineHeight: 24 },
  summary: { gap: Spacing.two, marginTop: Spacing.two },
  summaryLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  pillsWrap: { gap: Spacing.two, marginTop: Spacing.two },
  pillsLabel: { fontSize: 13, fontWeight: '600' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pill: { borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: 4 },
  pillText: { fontSize: 13 },
  actions: { marginTop: Spacing.four, gap: Spacing.one },
  action: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.four },
  actionLabel: { fontSize: 16, fontWeight: '500' },
});
