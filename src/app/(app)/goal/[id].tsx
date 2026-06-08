import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Picker } from '@/components/ui/Picker';
import { TextField } from '@/components/ui/TextField';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Goals, Memories } from '@/lib/api/endpoints';

export default function GoalDetailScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = Number(id);

  const goalQ = useQuery({ queryKey: ['goal', goalId], queryFn: () => Goals.get(goalId) });
  const memories = useQuery({ queryKey: ['memories'], queryFn: Memories.list });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [outcome, setOutcome] = useState('');
  const [scoreYes, setScoreYes] = useState(false);
  const [scorePercent, setScorePercent] = useState('');

  useEffect(() => {
    if (!goalQ.data) return;
    const g = goalQ.data.goal;
    setTitle(g.title);
    setDescription(g.description ?? '');
    setScoreYes(g.score_yes ?? false);
    setScorePercent(g.score_percent != null ? String(g.score_percent) : '');
  }, [goalQ.data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['goal', goalId] });
    qc.invalidateQueries({ queryKey: ['goals'] });
  };

  const save = useMutation({
    mutationFn: () => Goals.update(goalId, { title: title.trim(), description: description.trim() }),
    onSuccess: invalidate,
    onError: (e) => Alert.alert('Could not save', humanizeError(e)),
  });
  const scoreMode = goalQ.data?.goal.scoring_mode;

  const saveScore = useMutation({
    mutationFn: () =>
      Goals.update(
        goalId,
        scoreMode === 'yes_no'
          ? ({ score_yes: scoreYes } as Record<string, unknown>)
          : ({ score_percent: scorePercent ? Number(scorePercent) : null } as Record<string, unknown>),
      ),
    onSuccess: invalidate,
    onError: (e) => Alert.alert('Could not save score', humanizeError(e)),
  });
  const close = useMutation({
    mutationFn: () =>
      Goals.close(goalId, {
        outcome_comment: outcome.trim() || undefined,
        ...(scoreMode === 'yes_no'
          ? { score_yes: scoreYes }
          : scorePercent
            ? { score_percent: Number(scorePercent) }
            : {}),
      }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: () => Goals.remove(goalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      router.back();
    },
  });
  const link = useMutation({
    mutationFn: (memoryId: number) => Goals.link(goalId, memoryId),
    onSuccess: invalidate,
  });
  const unlink = useMutation({
    mutationFn: (memoryId: number) => Goals.unlink(goalId, memoryId),
    onSuccess: invalidate,
  });

  if (goalQ.isLoading) return <LoadingView />;
  if (goalQ.error || !goalQ.data) return <ErrorView error={goalQ.error} onRetry={() => goalQ.refetch()} />;

  const goal = goalQ.data.goal;
  const progress = goalQ.data.progress;
  const linkedIds = new Set(goal.memory_ids);
  const linkable = (memories.data ?? []).filter((m) => !linkedIds.has(m.id));
  const linked = (memories.data ?? []).filter((m) => linkedIds.has(m.id));
  const closed = goal.status === 'closed';

  const confirmDelete = () =>
    Alert.alert('Delete goal', 'Remove this goal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  return (
    <ScrollView contentInsetAdjustmentBehavior="never" automaticallyAdjustKeyboardInsets style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: true, title: 'Goal' }} />

      {goal.template || closed ? (
        <View style={styles.badges}>
          {goal.template ? (
            <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.badgeText, { color: theme.textSecondary }]}>Template</Text>
            </View>
          ) : null}
          {closed ? (
            <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.badgeText, { color: theme.success }]}>
                {goal.score_yes ? 'Met' : goal.score_percent != null ? `${goal.score_percent}%` : 'Closed'}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <TextField label="Title" value={title} onChangeText={setTitle} />
      <TextField label="Description" value={description} onChangeText={setDescription} multiline style={styles.area} />
      <Button label="Save" onPress={() => save.mutate()} loading={save.isPending} />

      {progress ? (
        <Card style={styles.progress}>
          <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>Progress</Text>
          <Text style={[styles.progressValue, { color: theme.text }]}>
            {progress.percent}% · {progress.label}
          </Text>
        </Card>
      ) : null}

      {!closed && scoreMode && scoreMode !== 'auto' ? (
        <Card style={styles.score}>
          <Text style={[styles.section, { color: theme.text }]}>Your score</Text>
          {scoreMode === 'yes_no' ? (
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreLabel, { color: theme.text }]}>Met</Text>
              <Switch value={scoreYes} onValueChange={setScoreYes} />
            </View>
          ) : (
            <TextField
              label="Percent complete"
              value={scorePercent}
              onChangeText={setScorePercent}
              keyboardType="number-pad"
              placeholder="0–100"
            />
          )}
          <Button label="Save score" variant="secondary" onPress={() => saveScore.mutate()} loading={saveScore.isPending} />
        </Card>
      ) : null}

      <Text style={[styles.section, { color: theme.text }]}>Linked memories</Text>
      {linked.length === 0 ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>None linked yet.</Text>
      ) : (
        linked.map((m) => (
          <Card key={m.id} style={styles.linkRow}>
            <Text style={[styles.linkTitle, { color: theme.text }]} numberOfLines={1}>
              {m.title || 'Untitled'}
            </Text>
            <Button label="Unlink" variant="ghost" fullWidth={false} onPress={() => unlink.mutate(m.id)} />
          </Card>
        ))
      )}

      {linkable.length > 0 ? (
        <Picker
          label="Link a memory"
          placeholder="Search memories to link"
          value={null}
          options={linkable.map((m) => ({ value: m.id, label: m.title || 'Untitled' }))}
          onChange={(v) => {
            if (v != null) link.mutate(Number(v));
          }}
        />
      ) : null}

      {!closed ? (
        <View style={styles.closeBox}>
          <TextField
            label="Close with an outcome note (optional)"
            value={outcome}
            onChangeText={setOutcome}
            multiline
            style={styles.area}
          />
          <Button label="Mark complete" onPress={() => close.mutate()} loading={close.isPending} />
        </View>
      ) : (
        <Text style={[styles.hint, { color: theme.success }]}>This goal is closed.</Text>
      )}

      <Button label="Delete goal" variant="danger" onPress={confirmDelete} loading={remove.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.eight },
  area: { minHeight: 80, textAlignVertical: 'top' },
  progress: { gap: 2 },
  progressLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  progressValue: { fontSize: 15 },
  section: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 14 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  linkTitle: { flex: 1, fontSize: 15 },
  closeBox: { gap: Spacing.three },
  badges: { flexDirection: 'row', gap: Spacing.two },
  badge: { borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  score: { gap: Spacing.three },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreLabel: { fontSize: 15, fontWeight: '500' },
});
