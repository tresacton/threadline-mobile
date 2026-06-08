import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Enrichment } from '@/lib/api/endpoints';
import type { MemoryEnrichment } from '@/lib/api/types';

export default function EnrichScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memoryId = Number(id);

  const data = useQuery({ queryKey: ['enrichment', memoryId], queryFn: () => Enrichment.list(memoryId) });
  const refreshEnrichment = () => {
    qc.invalidateQueries({ queryKey: ['enrichment', memoryId] });
    // The memory detail now carries answered enrichments inline — refresh it too so
    // a reflection added here shows up there immediately (its query is otherwise
    // fresh for staleTime and wouldn't refetch on return).
    qc.invalidateQueries({ queryKey: ['memory', memoryId] });
  };

  const generate = useMutation({
    mutationFn: () => Enrichment.generate(memoryId),
    onSuccess: refreshEnrichment,
    onError: (e) => humanizeError(e),
  });

  if (data.isLoading) return <LoadingView />;
  if (data.error) return <ErrorView error={data.error} onRetry={() => data.refetch()} />;

  const pending = data.data?.pending ?? [];
  const answered = data.data?.answered ?? [];

  return (
    <ScrollView contentInsetAdjustmentBehavior="never" automaticallyAdjustKeyboardInsets style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: true, title: 'Add detail' }} />
      <Text style={[styles.lead, { color: theme.textSecondary }]}>
        Gentle, open questions to sit with — answer in your own words, skip any that don’t fit.
      </Text>

      {pending.length === 0 ? (
        <EmptyState title="No questions waiting" body="Ask the companion to think of a few." />
      ) : (
        pending.map((q) => <QuestionCard key={q.id} question={q} memoryId={memoryId} />)
      )}

      <Button
        label={pending.length ? 'Ask more questions' : 'Ask the companion'}
        variant="secondary"
        onPress={() => generate.mutate()}
        loading={generate.isPending}
      />

      {answered.length > 0 ? (
        <View style={styles.answered}>
          <Text style={[styles.answeredTitle, { color: theme.textSecondary }]}>What you’ve added</Text>
          {answered.map((a) => (
            <Card key={a.id} style={styles.card}>
              <Text style={[styles.prompt, { color: theme.textMuted }]}>{a.prompt}</Text>
              <Text style={[styles.response, { color: theme.text }]}>{a.response}</Text>
            </Card>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function QuestionCard({ question, memoryId }: { question: MemoryEnrichment; memoryId: number }) {
  const theme = useTheme();
  const qc = useQueryClient();
  const [response, setResponse] = useState('');

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['enrichment', memoryId] });
    qc.invalidateQueries({ queryKey: ['memory', memoryId] }); // inline answered enrichments on the detail screen
  };
  const answer = useMutation({
    mutationFn: () => Enrichment.answer(question.id, response.trim()),
    onSuccess: refresh,
  });
  const skip = useMutation({
    mutationFn: () => Enrichment.skip(question.id),
    onSuccess: refresh,
  });

  return (
    <Card style={styles.card}>
      <Text style={[styles.prompt, { color: theme.text }]}>{question.prompt}</Text>
      <TextField value={response} onChangeText={setResponse} placeholder="In your own words…" multiline style={styles.area} />
      <View style={styles.actions}>
        <Button label="Save" fullWidth={false} onPress={() => answer.mutate()} loading={answer.isPending} disabled={!response.trim()} />
        <Button label="Skip" variant="ghost" fullWidth={false} onPress={() => skip.mutate()} disabled={skip.isPending} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.eight },
  lead: { fontSize: 15, lineHeight: 22 },
  card: { gap: Spacing.two },
  prompt: { fontSize: 15, lineHeight: 21 },
  area: { minHeight: 80, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: Spacing.two },
  answered: { gap: Spacing.two, marginTop: Spacing.four },
  answeredTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  response: { fontSize: 15, lineHeight: 21 },
});
