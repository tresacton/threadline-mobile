import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Picker } from '@/components/ui/Picker';
import { Select } from '@/components/ui/Select';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { TEMPORAL_RELATION_OPTIONS } from '@/constants/options';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Memories } from '@/lib/api/endpoints';
import type { DateSuggestion } from '@/lib/api/types';

export default function ReconstructScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memoryId = Number(id);

  const data = useQuery({ queryKey: ['reconstruct', memoryId], queryFn: () => Memories.reconstruct(memoryId) });
  const memories = useQuery({ queryKey: ['memories'], queryFn: Memories.list });

  const [relType, setRelType] = useState<string>('before');
  const [otherId, setOtherId] = useState<number | null>(null);

  const suggest = useMutation<DateSuggestion>({ mutationFn: () => Memories.suggestDate(memoryId) });

  const refresh = () => qc.invalidateQueries({ queryKey: ['reconstruct', memoryId] });

  // Apply the AI suggestion to the memory itself — nothing changes until the user
  // taps this. Writes the fuzzy label, inferred range, and confidence back.
  const apply = useMutation({
    mutationFn: (s: DateSuggestion) =>
      Memories.update(memoryId, {
        fuzzy_date_label: s.fuzzy_date_label ?? undefined,
        date_range_start: s.range_start ?? undefined,
        date_range_end: s.range_end ?? undefined,
        date_confidence_slug: s.confidence ?? undefined,
      } as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memory', memoryId] });
      qc.invalidateQueries({ queryKey: ['memories'] });
      Alert.alert('Date applied', 'The memory’s date was updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (e) => Alert.alert('Could not apply', humanizeError(e)),
  });

  const addRelation = useMutation({
    mutationFn: () => Memories.addRelation(memoryId, otherId!, relType),
    onSuccess: () => {
      setOtherId(null);
      refresh();
    },
    onError: (e) => Alert.alert('Could not add relation', humanizeError(e)),
  });
  const removeRelation = useMutation({
    mutationFn: (relationId: number) => Memories.removeRelation(memoryId, relationId),
    onSuccess: refresh,
  });

  if (data.isLoading) return <LoadingView />;
  if (data.error || !data.data) return <ErrorView error={data.error} onRetry={() => data.refetch()} />;

  const c = data.data.temporal_context;
  const relations = data.data.relations;
  const others = (memories.data ?? []).filter((m) => m.id !== memoryId);

  return (
    <ScrollView contentInsetAdjustmentBehavior="never" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: true, title: 'Reconstruct date' }} />
      <Text style={[styles.lead, { color: theme.textSecondary }]}>
        Add what you do know — which memories came before or after this one — and the companion narrows it
        down. Nothing changes until you edit the memory.
      </Text>

      {c.inferred_range ? (
        <Card style={styles.card}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Inferred window</Text>
          <Text style={[styles.value, { color: theme.text }]}>
            {c.earliest ?? 'unknown'} → {c.latest ?? 'unknown'}
          </Text>
          {c.impossible ? <Text style={[styles.warn, { color: theme.danger }]}>These constraints conflict.</Text> : null}
        </Card>
      ) : null}

      {/* Add a relation */}
      <Card style={styles.card}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>This memory…</Text>
        <Select value={relType} options={TEMPORAL_RELATION_OPTIONS} onChange={setRelType} />
        {others.length > 0 ? (
          <>
            <View style={{ marginTop: Spacing.two }}>
              <Picker
                label="…this one"
                placeholder="Choose a memory"
                value={otherId}
                options={others.map((m) => ({
                  value: m.id,
                  label: m.title || 'Untitled',
                  sublabel: m.date_label || undefined,
                }))}
                onChange={(v) => setOtherId(v as number | null)}
              />
            </View>
            <Button
              label="Add relation"
              onPress={() => {
                if (!otherId) return Alert.alert('Pick a memory', 'Choose which memory this relates to.');
                addRelation.mutate();
              }}
              loading={addRelation.isPending}
              style={{ marginTop: Spacing.three }}
            />
          </>
        ) : (
          <Text style={[styles.hint, { color: theme.textMuted }]}>Add more memories to link them in time.</Text>
        )}
      </Card>

      {relations.length > 0 ? (
        <Card style={styles.card}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Relations</Text>
          {relations.map((rel) => (
            <View key={rel.id} style={styles.relRow}>
              <Text style={[styles.relText, { color: theme.text }]} numberOfLines={2}>
                {relationVerb(rel.temporal_relation_type)} “{rel.to_memory_title || 'Untitled'}”
              </Text>
              <Button label="Remove" variant="ghost" fullWidth={false} onPress={() => removeRelation.mutate(rel.id)} />
            </View>
          ))}
        </Card>
      ) : null}

      <Button label="Suggest a date with AI" onPress={() => suggest.mutate()} loading={suggest.isPending} />

      {suggest.data ? (
        <Card style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Suggestion</Text>
          {suggest.data.fuzzy_date_label ? (
            <Text style={[styles.value, { color: theme.text }]}>{suggest.data.fuzzy_date_label}</Text>
          ) : null}
          {suggest.data.confidence ? (
            <Text style={[styles.hint, { color: theme.textMuted }]}>Confidence: {suggest.data.confidence}</Text>
          ) : null}
          {suggest.data.reasoning ? (
            <Text style={[styles.reasoning, { color: theme.textSecondary }]}>{suggest.data.reasoning}</Text>
          ) : null}
          <Button
            label="Apply this date"
            onPress={() => apply.mutate(suggest.data!)}
            loading={apply.isPending}
            style={{ marginTop: Spacing.three }}
          />
        </Card>
      ) : null}
      {suggest.error ? <Text style={{ color: theme.danger }}>{humanizeError(suggest.error)}</Text> : null}
    </ScrollView>
  );
}

function relationVerb(slug: string | null): string {
  return TEMPORAL_RELATION_OPTIONS.find((o) => o.value === slug)?.label ?? 'relates to';
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.eight },
  lead: { fontSize: 15, lineHeight: 22 },
  card: { gap: Spacing.one },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 15 },
  reasoning: { fontSize: 14, lineHeight: 20, marginTop: Spacing.one },
  warn: { fontSize: 13, marginTop: Spacing.one },
  hint: { fontSize: 14 },
  relRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, marginTop: Spacing.two },
  relText: { flex: 1, fontSize: 15 },
});
