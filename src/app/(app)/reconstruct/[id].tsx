import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Memories } from '@/lib/api/endpoints';
import type { DateSuggestion } from '@/lib/api/types';

export default function ReconstructScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memoryId = Number(id);
  const context = useQuery({
    queryKey: ['reconstruct', memoryId],
    queryFn: () => Memories.reconstruct(memoryId),
  });

  const suggest = useMutation<DateSuggestion>({ mutationFn: () => Memories.suggestDate(memoryId) });

  if (context.isLoading) return <LoadingView />;
  if (context.error || !context.data) return <ErrorView error={context.error} onRetry={() => context.refetch()} />;

  const c = context.data;

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: true, title: 'Reconstruct date' }} />
      <Text style={[styles.lead, { color: theme.textSecondary }]}>
        Here’s what we can infer from related memories and life periods. The AI suggestion is grounded in
        these — and is only a suggestion.
      </Text>

      {c.inferred_range ? (
        <Card style={styles.card}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Inferred window</Text>
          <Text style={[styles.value, { color: theme.text }]}>
            {c.earliest ?? 'unknown'} → {c.latest ?? 'unknown'}
          </Text>
          {c.impossible ? (
            <Text style={[styles.warn, { color: theme.danger }]}>These constraints conflict.</Text>
          ) : null}
        </Card>
      ) : null}

      <RefList title="Known to be before" items={c.befores} />
      <RefList title="Known to be after" items={c.afters} />
      {c.anchors.length ? (
        <Card style={styles.card}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Anchored to</Text>
          {c.anchors.map((a) => (
            <Text key={a.id} style={[styles.value, { color: theme.text }]}>
              {a.name}
            </Text>
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
          {suggest.data.reasoning ? (
            <Text style={[styles.reasoning, { color: theme.textSecondary }]}>{suggest.data.reasoning}</Text>
          ) : null}
        </Card>
      ) : null}
      {suggest.error ? <Text style={{ color: theme.danger }}>{humanizeError(suggest.error)}</Text> : null}
    </ScrollView>
  );
}

function RefList({ title, items }: { title: string; items: { id: number; title: string | null; date_label: string | null }[] }) {
  const theme = useTheme();
  if (!items || items.length === 0) return null;
  return (
    <Card style={styles.card}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{title}</Text>
      {items.map((m) => (
        <Text key={m.id} style={[styles.value, { color: theme.text }]} numberOfLines={1}>
          {m.title || 'Untitled'} {m.date_label ? `· ${m.date_label}` : ''}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.eight },
  lead: { fontSize: 15, lineHeight: 22 },
  card: { gap: Spacing.one },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 15 },
  reasoning: { fontSize: 14, lineHeight: 20, marginTop: Spacing.one },
  warn: { fontSize: 13, marginTop: Spacing.one },
});
