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
import { LifePeriods } from '@/lib/api/endpoints';

export default function PeriodsScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const periods = useQuery({ queryKey: ['life_periods'], queryFn: LifePeriods.list });
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () => LifePeriods.create({ name: name.trim() }),
    onSuccess: () => {
      setName('');
      qc.invalidateQueries({ queryKey: ['life_periods'] });
    },
    onError: (e) => setError(humanizeError(e)),
  });

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Life periods' }} />
      <View style={styles.form}>
        <TextField label="New period" value={name} onChangeText={setName} placeholder="e.g. University years" error={error} />
        <Button
          label="Add period"
          onPress={() => {
            setError(null);
            if (!name.trim()) return setError('Give it a name.');
            add.mutate();
          }}
          loading={add.isPending}
        />
      </View>

      {periods.isLoading ? (
        <LoadingView />
      ) : periods.error ? (
        <ErrorView error={periods.error} onRetry={() => periods.refetch()} />
      ) : !periods.data || periods.data.length === 0 ? (
        <EmptyState title="No life periods yet" body="Periods anchor fuzzy memories in time." />
      ) : (
        <FlatList
          data={periods.data}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.row} onPress={() => router.push(`/period/${item.id}`)}>
              <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                {item.date_range_start || item.date_range_end
                  ? `${item.date_range_start ?? '?'} – ${item.date_range_end ?? 'present'} · `
                  : ''}
                {item.memory_count ?? 0} {item.memory_count === 1 ? 'memory' : 'memories'}
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
