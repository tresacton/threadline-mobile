import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Screen } from '@/components/ui/Screen';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { DATE_CONFIDENCE_OPTIONS } from '@/constants/options';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Residencies } from '@/lib/api/endpoints';

export default function EditResidencyScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const residencyId = Number(id);
  const residencies = useQuery({ queryKey: ['residencies'], queryFn: Residencies.list });
  const residency = residencies.data?.find((r) => r.id === residencyId);

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [confidence, setConfidence] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!residency) return;
    setStart(residency.date_range_start ?? '');
    setEnd(residency.date_range_end ?? '');
    setConfidence(residency.date_confidence ?? null);
    setNotes(residency.notes ?? '');
  }, [residency]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['residencies'] });

  const save = useMutation({
    mutationFn: () =>
      Residencies.update(residencyId, {
        date_range_start: start.trim() || null,
        date_range_end: end.trim() || null,
        date_confidence_slug: confidence ?? undefined,
        notes: notes.trim(),
      }),
    onSuccess: () => {
      invalidate();
      router.back();
    },
    onError: (e) => Alert.alert('Could not save', humanizeError(e)),
  });

  const remove = useMutation({
    mutationFn: () => Residencies.remove(residencyId),
    onSuccess: () => {
      invalidate();
      router.back();
    },
  });

  const confirmDelete = () =>
    Alert.alert('Delete residence', 'Remove this residence record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  if (residencies.isLoading) return <LoadingView />;
  if (residencies.error) return <ErrorView error={residencies.error} onRetry={() => residencies.refetch()} />;

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <Stack.Screen options={{ headerShown: true, title: 'Edit residence' }} />
      <Text style={[styles.place, { color: theme.text }]}>{residency?.place_name ?? 'Residence'}</Text>
      <DateField label="Moved in" value={start || null} onChange={(d) => setStart(d ?? '')} placeholder="Pick a date" />
      <DateField label="Moved out (leave blank if current)" value={end || null} onChange={(d) => setEnd(d ?? '')} placeholder="Pick a date" />
      <Select label="Date confidence" value={confidence} options={DATE_CONFIDENCE_OPTIONS} onChange={setConfidence} />
      <TextField label="Notes" value={notes} onChangeText={setNotes} multiline style={styles.area} />
      <Button label="Save" onPress={() => save.mutate()} loading={save.isPending} />
      <Button label="Delete residence" variant="danger" onPress={confirmDelete} loading={remove.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  place: { fontSize: 18, fontWeight: '700' },
  area: { minHeight: 80, textAlignVertical: 'top' },
});
