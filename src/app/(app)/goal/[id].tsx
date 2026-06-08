import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Picker } from '@/components/ui/Picker';
import { TextField } from '@/components/ui/TextField';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
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

  useEffect(() => {
    if (!goalQ.data) return;
    setTitle(goalQ.data.goal.title);
    setDescription(goalQ.data.goal.description ?? '');
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
  const close = useMutation({
    mutationFn: () => Goals.close(goalId, { outcome_comment: outcome.trim() || undefined }),
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
    <ScrollView contentInsetAdjustmentBehavior="never" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: true, title: 'Goal' }} />

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
});
