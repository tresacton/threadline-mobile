import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { DATE_CONFIDENCE_OPTIONS } from '@/constants/options';
import { Spacing } from '@/constants/theme';
import { Employments } from '@/lib/api/endpoints';

export default function EditEmploymentScreen() {
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const employmentId = Number(id);
  const employments = useQuery({ queryKey: ['employments'], queryFn: Employments.list });
  const employment = employments.data?.find((e) => e.id === employmentId);

  const [employer, setEmployer] = useState('');
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [confidence, setConfidence] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!employment) return;
    setEmployer(employment.employer);
    setTitle(employment.title ?? '');
    setStart(employment.date_range_start ?? '');
    setEnd(employment.date_range_end ?? '');
    setConfidence(employment.date_confidence ?? null);
    setNotes(employment.notes ?? '');
  }, [employment]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['employments'] });

  const save = useMutation({
    mutationFn: () =>
      Employments.update(employmentId, {
        employer: employer.trim(),
        title: title.trim(),
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
    mutationFn: () => Employments.remove(employmentId),
    onSuccess: () => {
      invalidate();
      router.back();
    },
  });

  const confirmDelete = () =>
    Alert.alert('Delete job', 'Remove this job record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  if (employments.isLoading) return <LoadingView />;
  if (employments.error) return <ErrorView error={employments.error} onRetry={() => employments.refetch()} />;

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <Stack.Screen options={{ headerShown: true, title: 'Edit job' }} />
      <TextField label="Employer" value={employer} onChangeText={setEmployer} />
      <TextField label="Role" value={title} onChangeText={setTitle} placeholder="Title" />
      <TextField label="Start (YYYY-MM-DD)" value={start} onChangeText={setStart} placeholder="2015-03-01" autoCapitalize="none" />
      <TextField label="End (YYYY-MM-DD)" value={end} onChangeText={setEnd} placeholder="leave blank if current" autoCapitalize="none" />
      <Select label="Date confidence" value={confidence} options={DATE_CONFIDENCE_OPTIONS} onChange={setConfidence} />
      <TextField label="Notes" value={notes} onChangeText={setNotes} multiline style={styles.area} />
      <Button label="Save" onPress={() => save.mutate()} loading={save.isPending} />
      <Button label="Delete job" variant="danger" onPress={confirmDelete} loading={remove.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  area: { minHeight: 80, textAlignVertical: 'top' },
});
