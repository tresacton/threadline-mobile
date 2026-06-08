import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Enrichment, Memories, OpenThreads } from '@/lib/api/endpoints';

const titleize = (slug?: string | null) =>
  slug ? slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null;

export default function MemoryDetailScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memoryId = Number(id);

  const memory = useQuery({ queryKey: ['memory', memoryId], queryFn: () => Memories.get(memoryId) });
  const related = useQuery({ queryKey: ['memory', memoryId, 'related'], queryFn: () => Memories.related(memoryId) });
  const threads = useQuery({ queryKey: ['threads', memoryId], queryFn: () => OpenThreads.list(memoryId) });
  const enrich = useQuery({ queryKey: ['enrichments', memoryId], queryFn: () => Enrichment.list(memoryId) });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['memory', memoryId] });

  const summarise = useMutation({
    mutationFn: () => Memories.summarise(memoryId),
    onSuccess: () => Alert.alert('Summarising', 'A summary is being generated and will appear shortly.'),
    onError: (e) => Alert.alert('Could not summarise', humanizeError(e)),
  });

  const setSensitivity = useMutation({
    mutationFn: (slug: string) => Memories.setSensitivity(memoryId, slug),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['memories'] });
    },
    onError: (e) => Alert.alert('Could not update', humanizeError(e)),
  });

  const split = useMutation({
    mutationFn: () => Memories.split(memoryId),
    onSuccess: (capture) => router.push(`/review/${capture.id}`),
    onError: (e) => Alert.alert('Could not split', humanizeError(e)),
  });

  const resolveThread = useMutation({
    mutationFn: (threadId: number) => OpenThreads.transition(threadId, 'resolve'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['threads', memoryId] }),
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
  const isSensitive = m.sensitivity && m.sensitivity !== 'normal';
  const openThreads = (threads.data ?? []).filter((t) => t.status !== 'resolved');
  const answered = enrich.data?.answered ?? [];
  const relatedList = related.data ?? [];

  const meta: { label: string; value: string | null }[] = [
    { label: 'When', value: m.date_label },
    { label: 'Date precision', value: titleize(m.date_precision) },
    { label: 'Date confidence', value: titleize(m.date_confidence) },
    { label: 'Category', value: titleize(m.category) },
    { label: 'Felt', value: titleize(m.emotional_valence) },
    { label: 'Importance', value: m.importance != null ? `${m.importance}/5` : null },
    { label: 'Sensitivity', value: titleize(m.sensitivity) },
    { label: 'Status', value: titleize(m.status) },
  ].filter((row) => row.value);

  return (
    <ScrollView contentInsetAdjustmentBehavior="never" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: true, title: '' }} />

      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.text }]}>{m.title || 'Untitled memory'}</Text>
        {isSensitive ? (
          <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="lock-closed" size={12} color={theme.warning} />
            <Text style={[styles.badgeText, { color: theme.warning }]}>Sensitive</Text>
          </View>
        ) : null}
      </View>

      {m.structured_body ? <Text style={[styles.body, { color: theme.text }]}>{m.structured_body}</Text> : null}

      {meta.length > 0 ? (
        <Card style={styles.metaCard}>
          {meta.map((row) => (
            <View key={row.label} style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>{row.label}</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{row.value}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {openThreads.length > 0 ? (
        <Card style={[styles.threadCard, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.sectionLabel, { color: theme.warning }]}>Open threads</Text>
          {openThreads.map((t) => (
            <View key={t.id} style={styles.thread}>
              <Text style={[styles.threadNote, { color: theme.text }]}>{t.note || t.summary || titleize(t.kind)}</Text>
              <View style={styles.threadActions}>
                <Pressable onPress={() => resolveThread.mutate(t.id)}>
                  <Text style={[styles.linkAction, { color: theme.primary }]}>Resolve</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/threads')}>
                  <Text style={[styles.linkAction, { color: theme.textMuted }]}>View all</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {m.ai_summary ? (
        <Card style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Companion summary</Text>
          <Text style={[styles.body, { color: theme.text }]}>{m.ai_summary}</Text>
        </Card>
      ) : null}

      {m.original_wording && m.original_wording !== m.structured_body ? (
        <Card style={styles.summary}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Your original words</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]} selectable>
            {m.original_wording}
          </Text>
        </Card>
      ) : null}

      <Pills label="People" values={m.people} />
      <Pills label="Places" values={m.places} />
      <Pills label="Life periods" values={m.life_periods} />
      <Pills label="Tags" values={m.tags} />

      {answered.length > 0 ? (
        <Card style={styles.summary}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Reflections you’ve added</Text>
          {answered.map((a) => (
            <View key={a.id} style={styles.enrichItem}>
              <Text style={[styles.enrichPrompt, { color: theme.textMuted }]}>{a.prompt}</Text>
              {a.response ? <Text style={[styles.body, { color: theme.text }]}>{a.response}</Text> : null}
            </View>
          ))}
        </Card>
      ) : null}

      {relatedList.length > 0 ? (
        <Card style={styles.summary}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Related memories</Text>
          {relatedList.map((r) => (
            <Pressable key={r.id} onPress={() => router.push(`/memory/${r.id}`)} style={styles.relatedRow}>
              <Text style={[styles.relatedTitle, { color: theme.primary }]} numberOfLines={1}>
                {r.title || 'Untitled memory'}
              </Text>
              {r.date_label ? <Text style={[styles.relatedDate, { color: theme.textMuted }]}>{r.date_label}</Text> : null}
            </Pressable>
          ))}
        </Card>
      ) : null}

      <View style={styles.actions}>
        <ActionRow icon="create-outline" label="Edit memory" onPress={() => router.push(`/edit-memory/${memoryId}`)} />
        <ActionRow icon="git-network-outline" label="View connections" onPress={() => router.push(`/graph/memory/${memoryId}`)} />
        <ActionRow icon="time-outline" label="Reconstruct the date" onPress={() => router.push(`/reconstruct/${memoryId}`)} />
        <ActionRow icon="bulb-outline" label="Add detail (enrich)" onPress={() => router.push(`/enrich/${memoryId}`)} />
        <ActionRow icon="sparkles-outline" label="Summarise with AI" onPress={() => summarise.mutate()} />
        <ActionRow icon="cut-outline" label="Split into multiple" onPress={() => split.mutate()} />
        <ActionRow
          icon={isSensitive ? 'lock-open-outline' : 'lock-closed-outline'}
          label={isSensitive ? 'Mark as normal' : 'Mark sensitive / private'}
          onPress={() => setSensitivity.mutate(isSensitive ? 'normal' : 'sensitive')}
        />
        <ActionRow icon="trash-outline" label="Delete memory" danger onPress={confirmDelete} />
      </View>
    </ScrollView>
  );
}

function Pills({ label, values }: { label: string; values: string[] | undefined }) {
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flexWrap: 'wrap' },
  title: { fontSize: 24, fontWeight: '700', flexShrink: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
  metaCard: { gap: Spacing.two, marginTop: Spacing.two },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  metaLabel: { fontSize: 13 },
  metaValue: { fontSize: 14, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  threadCard: { gap: Spacing.two },
  thread: { gap: 4 },
  threadNote: { fontSize: 14, lineHeight: 20 },
  threadActions: { flexDirection: 'row', gap: Spacing.four },
  linkAction: { fontSize: 14, fontWeight: '600' },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  summary: { gap: Spacing.two, marginTop: Spacing.two },
  enrichItem: { gap: 2, marginTop: Spacing.one },
  enrichPrompt: { fontSize: 13, fontStyle: 'italic' },
  relatedRow: { paddingVertical: Spacing.two },
  relatedTitle: { fontSize: 15, fontWeight: '500' },
  relatedDate: { fontSize: 12, marginTop: 1 },
  pillsWrap: { gap: Spacing.two, marginTop: Spacing.two },
  pillsLabel: { fontSize: 13, fontWeight: '600' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pill: { borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: 4 },
  pillText: { fontSize: 13 },
  actions: { marginTop: Spacing.four, gap: Spacing.one },
  action: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.four },
  actionLabel: { fontSize: 16, fontWeight: '500' },
});
