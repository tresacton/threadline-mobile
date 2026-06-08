import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Employments } from '@/lib/api/endpoints';

export default function EmploymentsScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const employments = useQuery({ queryKey: ['employments'], queryFn: Employments.list });
  const [employer, setEmployer] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () => Employments.create({ employer: employer.trim(), title: title.trim() || undefined }),
    onSuccess: () => {
      setEmployer('');
      setTitle('');
      qc.invalidateQueries({ queryKey: ['employments'] });
    },
    onError: (e) => setError(humanizeError(e)),
  });

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Jobs' }} />
      <View style={styles.form}>
        <TextField label="Add a job" value={employer} onChangeText={setEmployer} placeholder="Employer" error={error} />
        <TextField value={title} onChangeText={setTitle} placeholder="Role (optional)" />
        <Button
          label="Add job"
          onPress={() => {
            setError(null);
            if (!employer.trim()) return setError('Enter an employer.');
            add.mutate();
          }}
          loading={add.isPending}
        />
      </View>

      {employments.isLoading ? (
        <LoadingView />
      ) : employments.error ? (
        <ErrorView error={employments.error} onRetry={() => employments.refetch()} />
      ) : !employments.data || employments.data.length === 0 ? (
        <EmptyState title="No jobs yet" body="Add jobs, or use Find past jobs to scan your memories." />
      ) : (
        <FlatList contentInsetAdjustmentBehavior="never"
          data={employments.data}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.row} onPress={() => router.push(`/employment/${item.id}`)}>
              <Text style={[styles.name, { color: theme.text }]}>
                {item.title ? `${item.title} · ` : ''}
                {item.employer}
              </Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                {item.date_range_start || item.date_range_end
                  ? `${item.date_range_start ?? '?'} – ${item.date_range_end ?? 'present'} · `
                  : ''}
                {item.memory_ids.length} {item.memory_ids.length === 1 ? 'memory' : 'memories'}
              </Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { padding: Spacing.four, gap: Spacing.three },
  list: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.eight, gap: Spacing.two },
  row: { gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13 },
});
