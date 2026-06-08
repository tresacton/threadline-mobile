import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Candidates, Captures } from '@/lib/api/endpoints';
import type { CandidateSplitMemory } from '@/lib/api/types';

export default function ReviewCaptureScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const captureId = Number(id);

  const capture = useQuery({ queryKey: ['capture', captureId], queryFn: () => Captures.get(captureId) });
  const candidates = useQuery({
    queryKey: ['capture', captureId, 'candidates'],
    queryFn: () => Captures.candidates(captureId),
  });

  const invalidateMemories = () => qc.invalidateQueries({ queryKey: ['memories'] });

  const keepOne = useMutation({
    mutationFn: () => Captures.keepAsOne(captureId),
    onSuccess: (memory) => {
      invalidateMemories();
      router.replace(`/memory/${memory.id}`);
    },
    onError: (e) => Alert.alert('Could not save', humanizeError(e)),
  });

  const suggest = useMutation({
    mutationFn: () => Captures.suggestSplits(captureId),
    onSuccess: () => {
      Alert.alert('Looking for memories', 'Suggestions will appear here shortly — pull to refresh.');
    },
    onError: (e) => Alert.alert('Could not analyse', humanizeError(e)),
  });

  const discard = useMutation({
    mutationFn: () => Captures.remove(captureId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drafts'] });
      router.back();
    },
    onError: (e) => Alert.alert('Could not discard', humanizeError(e)),
  });

  const confirmDiscard = () =>
    Alert.alert('Discard draft', 'Delete this draft? It won’t become a memory.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => discard.mutate() },
    ]);

  if (capture.isLoading) return <LoadingView />;
  if (capture.error || !capture.data) return <ErrorView error={capture.error} onRetry={() => capture.refetch()} />;

  const pending = candidates.data ?? [];

  return (
    <ScrollView contentInsetAdjustmentBehavior="never" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: true, title: 'Review' }} />

      <Text style={[styles.lead, { color: theme.textSecondary }]}>
        Here’s what you shared. Keep it as one memory, or split it into separate ones.
      </Text>

      <Card style={styles.captureCard}>
        <Text style={[styles.captureLabel, { color: theme.textMuted }]}>Your words</Text>
        <Text style={[styles.captureText, { color: theme.text }]} selectable>
          {capture.data.raw_text}
        </Text>
      </Card>

      <Button label="Keep as one memory" onPress={() => keepOne.mutate()} loading={keepOne.isPending} />

      <View style={styles.splitSection}>
        <Text style={[styles.splitHeading, { color: theme.text }]}>Or split into separate memories</Text>
        {pending.length === 0 ? (
          <>
            <Text style={[styles.splitHint, { color: theme.textMuted }]}>
              Let the companion suggest where this could split into distinct memories.
            </Text>
            <Button
              label="Find possible memories"
              variant="secondary"
              onPress={() => suggest.mutate()}
              loading={suggest.isPending}
            />
            <Button label="Refresh" variant="ghost" onPress={() => candidates.refetch()} />
          </>
        ) : (
          pending.map((c) => (
            <CandidateCard key={c.id} candidate={c} captureId={captureId} onChanged={invalidateMemories} />
          ))
        )}
      </View>

      <Button label="Discard this draft" variant="danger" onPress={confirmDiscard} loading={discard.isPending} />
    </ScrollView>
  );
}

function CandidateCard({
  candidate,
  captureId,
  onChanged,
}: {
  candidate: CandidateSplitMemory;
  captureId: number;
  onChanged: () => void;
}) {
  const theme = useTheme();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['capture', captureId, 'candidates'] });

  const accept = useMutation({
    mutationFn: () => Candidates.accept(candidate.id),
    onSuccess: () => {
      onChanged();
      refresh();
    },
    onError: (e) => Alert.alert('Could not accept', humanizeError(e)),
  });
  const reject = useMutation({
    mutationFn: () => Candidates.reject(candidate.id),
    onSuccess: refresh,
  });

  return (
    <Card style={styles.candidate}>
      <Text style={[styles.candidateTitle, { color: theme.text }]}>
        {candidate.suggested_title || 'Untitled'}
      </Text>
      {candidate.suggested_fuzzy_date_label ? (
        <Text style={[styles.candidateMeta, { color: theme.textMuted }]}>
          {candidate.suggested_fuzzy_date_label}
        </Text>
      ) : null}
      {candidate.suggested_body ? (
        <Text style={[styles.candidateBody, { color: theme.textSecondary }]}>{candidate.suggested_body}</Text>
      ) : null}
      <View style={styles.candidateActions}>
        <Button label="Accept" fullWidth={false} onPress={() => accept.mutate()} loading={accept.isPending} />
        <Button label="Discard" variant="ghost" fullWidth={false} onPress={() => reject.mutate()} disabled={reject.isPending} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.eight },
  lead: { fontSize: 15, lineHeight: 22 },
  captureCard: { gap: Spacing.two },
  captureLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  captureText: { fontSize: 16, lineHeight: 24 },
  splitSection: { gap: Spacing.three },
  splitHeading: { fontSize: 16, fontWeight: '700' },
  splitHint: { fontSize: 14, lineHeight: 20 },
  candidate: { gap: Spacing.two },
  candidateTitle: { fontSize: 16, fontWeight: '600' },
  candidateMeta: { fontSize: 13 },
  candidateBody: { fontSize: 14, lineHeight: 20 },
  candidateActions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
});
