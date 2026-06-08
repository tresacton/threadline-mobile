import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { GOAL_TEMPLATE_OPTIONS } from '@/constants/options';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Goals } from '@/lib/api/endpoints';
import type { Goal } from '@/lib/api/types';

export default function GoalsScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'active' | 'closed' | 'all'>('active');
  const [search, setSearch] = useState('');
  const goals = useQuery({
    queryKey: ['goals', statusFilter],
    queryFn: () => Goals.list(statusFilter === 'all' ? undefined : statusFilter),
  });
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const displayed = (goals.data ?? [])
    .filter((g) => !q || g.title.toLowerCase().includes(q))
    // Active before closed (each already recent-first from the API).
    .sort((a, b) => Number(a.status === 'closed') - Number(b.status === 'closed'));

  const add = useMutation({
    mutationFn: () =>
      Goals.create(
        template
          ? { title: title.trim(), template_slug: template, scoring_mode: 'auto' }
          : { title: title.trim() },
      ),
    onSuccess: () => {
      setTitle('');
      setTemplate('');
      qc.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (e) => setError(humanizeError(e)),
  });

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Goals' }} />
      <View style={styles.form}>
        <Select label="Goal type" value={template} options={GOAL_TEMPLATE_OPTIONS} onChange={setTemplate} />
        <TextField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Reconstruct my twenties" error={error} />
        <Button
          label="Add goal"
          onPress={() => {
            setError(null);
            if (!title.trim()) return setError('Give the goal a title.');
            add.mutate();
          }}
          loading={add.isPending}
        />
      </View>

      <View style={styles.controls}>
        <Select
          value={statusFilter}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'closed', label: 'Closed' },
            { value: 'all', label: 'All' },
          ]}
          onChange={(v) => setStatusFilter(v as 'active' | 'closed' | 'all')}
        />
        <TextField placeholder="Search goals" value={search} onChangeText={setSearch} autoCapitalize="none" />
      </View>

      {goals.isLoading ? (
        <LoadingView />
      ) : goals.error ? (
        <ErrorView error={goals.error} onRetry={() => goals.refetch()} />
      ) : displayed.length === 0 ? (
        <EmptyState
          title={q ? 'No matches' : statusFilter === 'closed' ? 'No closed goals' : 'No goals yet'}
          body={q ? 'Try different words.' : 'Goals organise your reconstruction work.'}
        />
      ) : (
        <FlatList contentInsetAdjustmentBehavior="never"
          data={displayed}
          keyExtractor={(g) => String(g.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <GoalRow goal={item} />}
        />
      )}
    </View>
  );
}

function GoalRow({ goal }: { goal: Goal }) {
  const theme = useTheme();
  const closed = goal.status === 'closed';

  return (
    <Card style={styles.row} onPress={() => router.push(`/goal/${goal.id}`)}>
      <View style={styles.rowMain}>
        <Text style={[styles.title, { color: theme.text }]}>{goal.title}</Text>
        <View style={[styles.badge, { backgroundColor: closed ? theme.backgroundElement : theme.success }]}>
          <Text style={[styles.badgeText, { color: closed ? theme.textSecondary : '#fff' }]}>{goal.status}</Text>
        </View>
      </View>
      {goal.description ? <Text style={[styles.desc, { color: theme.textSecondary }]}>{goal.description}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { padding: Spacing.four, gap: Spacing.three },
  controls: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three, gap: Spacing.three },
  list: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.eight, gap: Spacing.three },
  row: { gap: Spacing.two },
  rowMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  title: { fontSize: 16, fontWeight: '600', flex: 1 },
  badge: { borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  desc: { fontSize: 14, lineHeight: 20 },
});
