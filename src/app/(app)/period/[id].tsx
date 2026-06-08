import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { LifePeriods } from '@/lib/api/endpoints';

export default function EditPeriodScreen() {
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const periodId = Number(id);
  // The list endpoint is the source; find the one we're editing from cache/refetch.
  const periods = useQuery({ queryKey: ['life_periods'], queryFn: LifePeriods.list });
  const period = periods.data?.find((p) => p.id === periodId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  useEffect(() => {
    if (!period) return;
    setName(period.name);
    setDescription(period.description ?? '');
    setStart(period.date_range_start ?? '');
    setEnd(period.date_range_end ?? '');
  }, [period]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['life_periods'] });

  const save = useMutation({
    mutationFn: () =>
      LifePeriods.update(periodId, {
        name: name.trim(),
        description: description.trim(),
        date_range_start: start.trim() || null,
        date_range_end: end.trim() || null,
      }),
    onSuccess: () => {
      invalidate();
      router.back();
    },
    onError: (e) => Alert.alert('Could not save', humanizeError(e)),
  });

  const remove = useMutation({
    mutationFn: () => LifePeriods.remove(periodId),
    onSuccess: () => {
      invalidate();
      router.back();
    },
  });

  const confirmDelete = () =>
    Alert.alert('Delete period', 'Remove this life period?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  if (periods.isLoading) return <LoadingView />;
  if (periods.error) return <ErrorView error={periods.error} onRetry={() => periods.refetch()} />;

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <Stack.Screen options={{ headerShown: true, title: 'Edit period' }} />
      <TextField label="Name" value={name} onChangeText={setName} />
      <TextField label="Description" value={description} onChangeText={setDescription} multiline style={styles.area} />
      <TextField label="Start (YYYY-MM-DD)" value={start} onChangeText={setStart} placeholder="2018-01-01" autoCapitalize="none" />
      <TextField label="End (YYYY-MM-DD)" value={end} onChangeText={setEnd} placeholder="2021-12-31" autoCapitalize="none" />
      <Button label="View connections" variant="secondary" onPress={() => router.push(`/graph/life_period/${periodId}`)} />
      <Button label="Save" onPress={() => save.mutate()} loading={save.isPending} />
      <Button label="Delete period" variant="danger" onPress={confirmDelete} loading={remove.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  area: { minHeight: 80, textAlignVertical: 'top' },
});
