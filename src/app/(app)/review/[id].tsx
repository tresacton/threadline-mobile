import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
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
      // The split runs as a background job, so poll a few times for the results
      // (the pull-to-refresh and Refresh button also work).
      [1500, 3500, 6000, 9000].forEach((ms) => setTimeout(() => candidates.refetch(), ms));
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
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={candidates.isFetching}
          onRefresh={() => candidates.refetch()}
          tintColor={theme.textMuted}
        />
      }
    >
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
              {suggest.isSuccess
                ? 'Looking for distinct memories… this can take a few seconds. Pull down to refresh.'
                : 'Let the companion suggest where this could split into distinct memories.'}
            </Text>
            <Button
              label={suggest.isSuccess ? 'Scan again' : 'Find possible memories'}
              variant="secondary"
              onPress={() => suggest.mutate()}
              loading={suggest.isPending || candidates.isFetching}
            />
          </>
        ) : (
          pending.map((c) => (
            <CandidateCard key={c.id} candidate={c} captureId={captureId} onChanged={invalidateMemories} />
          ))
        )}
      </View>

      <ManualSplit captureId={captureId} onAdded={() => candidates.refetch()} />

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

  // Which text becomes the memory's body: the AI-suggested wording, or the user's
  // verbatim excerpt from the capture (mirrors the web body-source radio).
  const hasExcerpt = !!candidate.source_excerpt;
  const [bodySource, setBodySource] = useState<'ai' | 'verbatim'>('ai');

  const accept = useMutation({
    mutationFn: () =>
      Candidates.accept(
        candidate.id,
        bodySource === 'verbatim' && candidate.source_excerpt
          ? { suggested_body: candidate.source_excerpt }
          : undefined,
      ),
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

  const chipGroups: { label: string; values: string[] }[] = [
    { label: 'People', values: candidate.suggested_people ?? [] },
    { label: 'Places', values: candidate.suggested_places ?? [] },
    { label: 'Tags', values: candidate.suggested_tags ?? [] },
  ].filter((g) => g.values.length > 0);

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
        <Text style={[styles.candidateBody, { color: theme.text }]}>{candidate.suggested_body}</Text>
      ) : null}
      {candidate.source_excerpt ? (
        <Text style={[styles.excerpt, { color: theme.textMuted, borderLeftColor: theme.border }]}>
          “{candidate.source_excerpt}”
        </Text>
      ) : null}

      {chipGroups.map((g) => (
        <View key={g.label} style={styles.chipRow}>
          <Text style={[styles.chipLabel, { color: theme.textSecondary }]}>{g.label}</Text>
          <View style={styles.chips}>
            {g.values.map((v) => (
              <View key={v} style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.chipText, { color: theme.text }]}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {candidate.uncertainties && candidate.uncertainties.length > 0 ? (
        <View style={styles.uncertain}>
          {candidate.uncertainties.map((u, i) => (
            <Text key={i} style={[styles.uncertainText, { color: theme.warning }]}>
              • {u}
            </Text>
          ))}
        </View>
      ) : null}

      {hasExcerpt ? (
        <Select
          label="Memory body"
          value={bodySource}
          options={[
            { value: 'ai', label: 'AI wording' },
            { value: 'verbatim', label: 'My exact words' },
          ]}
          onChange={(v) => setBodySource(v)}
        />
      ) : null}

      <View style={styles.candidateActions}>
        <Button label="Accept" fullWidth={false} onPress={() => accept.mutate()} loading={accept.isPending} />
        <Button label="Discard" variant="ghost" fullWidth={false} onPress={() => reject.mutate()} disabled={reject.isPending} />
      </View>
    </Card>
  );
}

// Manually carve a memory out of the capture when the AI split isn't quite right.
function ManualSplit({ captureId, onAdded }: { captureId: number; onAdded: () => void }) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [when, setWhen] = useState('');

  const add = useMutation({
    mutationFn: () =>
      Candidates.create(captureId, {
        suggested_title: title.trim() || undefined,
        suggested_body: body.trim(),
        suggested_fuzzy_date_label: when.trim() || undefined,
      }),
    onSuccess: () => {
      setTitle('');
      setBody('');
      setWhen('');
      onAdded();
    },
    onError: (e) => Alert.alert('Could not add', humanizeError(e)),
  });

  return (
    <Card style={styles.manual}>
      <Text style={[styles.splitHeading, { color: theme.text }]}>Split manually</Text>
      <Text style={[styles.splitHint, { color: theme.textMuted }]}>
        Write a memory yourself — it joins the list above to accept.
      </Text>
      <TextField label="Title" value={title} onChangeText={setTitle} placeholder="A short name" />
      <TextField label="Memory" value={body} onChangeText={setBody} multiline style={styles.manualArea} placeholder="What happened" />
      <TextField label="When (optional)" value={when} onChangeText={setWhen} placeholder="Around 2014" />
      <Button
        label="Add this memory"
        variant="secondary"
        onPress={() => {
          if (body.trim().length < 2) return Alert.alert('Write the memory first');
          add.mutate();
        }}
        loading={add.isPending}
      />
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
  excerpt: { fontSize: 13, fontStyle: 'italic', lineHeight: 19, borderLeftWidth: 2, paddingLeft: Spacing.three },
  chipRow: { gap: 4 },
  chipLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 13 },
  uncertain: { gap: 2, marginTop: 2 },
  uncertainText: { fontSize: 13, lineHeight: 18 },
  candidateActions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  manual: { gap: Spacing.three },
  manualArea: { minHeight: 80, textAlignVertical: 'top' },
});
