import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { JobFinder } from '@/lib/api/endpoints';

export default function JobsScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const state = useQuery({ queryKey: ['job_finder'], queryFn: JobFinder.show });
  const [employer, setEmployer] = useState('');
  const [title, setTitle] = useState('');

  const candidate = state.data?.candidate;
  useEffect(() => {
    setEmployer(candidate?.employer ?? '');
    setTitle(candidate?.suggested_title ?? '');
    // Only re-seed the form when a different candidate appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.id]);

  const discover = useMutation({
    mutationFn: JobFinder.discover,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job_finder'] }),
    onError: (e) => humanizeError(e),
  });
  const record = useMutation({
    mutationFn: () => JobFinder.record(candidate!.id, { employer: employer.trim(), title: title.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job_finder'] });
      qc.invalidateQueries({ queryKey: ['employments'] });
    },
  });
  const skip = useMutation({
    mutationFn: () => JobFinder.skip(candidate!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job_finder'] }),
  });

  if (state.isLoading) return <LoadingView />;
  if (state.error) return <ErrorView error={state.error} onRetry={() => state.refetch()} />;

  return (
    <ScrollView contentInsetAdjustmentBehavior="never" automaticallyAdjustKeyboardInsets style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: true, title: 'Find past jobs' }} />
      <Text style={[styles.lead, { color: theme.textSecondary }]}>
        The companion can scan your memories for jobs you’ve mentioned but not recorded. You confirm the
        real details — nothing is invented.
      </Text>
      <Button
        label={state.data?.remaining ? 'Scan again' : 'Scan my memories'}
        variant="secondary"
        onPress={() => discover.mutate()}
        loading={discover.isPending}
      />

      {state.data ? (
        <Text style={[styles.progress, { color: theme.textMuted }]}>
          {state.data.remaining} to review · {state.data.recorded} recorded
        </Text>
      ) : null}

      {!candidate ? (
        <EmptyState title="Nothing to review" body="Scan to look for jobs in your memories." />
      ) : (
        <Card style={styles.card}>
          {candidate.evidence ? (
            <Text style={[styles.evidence, { color: theme.textSecondary }]}>“{candidate.evidence}”</Text>
          ) : null}
          {candidate.source_memory_id ? (
            <Pressable
              onPress={() => router.push(`/memory/${candidate.source_memory_id}`)}
              style={styles.sourceLink}
            >
              <Ionicons name="document-text-outline" size={16} color={theme.primary} />
              <Text style={[styles.sourceLinkText, { color: theme.primary }]} numberOfLines={1}>
                From: {candidate.source_memory_title || 'view the memory'}
              </Text>
              <Ionicons name="chevron-forward" size={15} color={theme.primary} />
            </Pressable>
          ) : null}
          <TextField label="Employer" value={employer} onChangeText={setEmployer} placeholder="Employer" />
          <TextField label="Role" value={title} onChangeText={setTitle} placeholder="Title (optional)" />
          {candidate.free_question ? (
            <Text style={[styles.question, { color: theme.text }]}>{candidate.free_question}</Text>
          ) : null}
          <View style={styles.actions}>
            <Button
              label="Record this job"
              onPress={() => record.mutate()}
              loading={record.isPending}
              disabled={!employer.trim()}
            />
            <Button label="Skip" variant="ghost" onPress={() => skip.mutate()} disabled={skip.isPending} />
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.eight },
  lead: { fontSize: 15, lineHeight: 22 },
  progress: { fontSize: 13, textAlign: 'center' },
  card: { gap: Spacing.three },
  evidence: { fontSize: 15, fontStyle: 'italic', lineHeight: 21 },
  sourceLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sourceLinkText: { flex: 1, fontSize: 14, fontWeight: '600' },
  question: { fontSize: 15, lineHeight: 21 },
  actions: { gap: Spacing.two, marginTop: Spacing.two },
});
