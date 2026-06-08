import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Picker } from '@/components/ui/Picker';
import { Screen } from '@/components/ui/Screen';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { DATE_CONFIDENCE_OPTIONS } from '@/constants/options';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LifePeriods, Places } from '@/lib/api/endpoints';

export default function EditPeriodScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const periodId = Number(id);
  const period = useQuery({ queryKey: ['life_period', periodId], queryFn: () => LifePeriods.get(periodId) });
  const places = useQuery({ queryKey: ['places'], queryFn: Places.list });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [confidence, setConfidence] = useState<string | null>(null);
  const [placeId, setPlaceId] = useState<number | null>(null);

  useEffect(() => {
    const p = period.data;
    if (!p) return;
    setName(p.name);
    setDescription(p.description ?? '');
    setStart(p.date_range_start ?? '');
    setEnd(p.date_range_end ?? '');
    setConfidence(p.date_confidence ?? null);
    setPlaceId(p.place_id);
  }, [period.data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['life_periods'] });
    qc.invalidateQueries({ queryKey: ['life_period', periodId] });
  };

  const save = useMutation({
    mutationFn: () =>
      LifePeriods.update(periodId, {
        name: name.trim(),
        description: description.trim(),
        date_range_start: start.trim() || null,
        date_range_end: end.trim() || null,
        date_confidence_slug: confidence ?? undefined,
        place_id: placeId,
      } as Record<string, unknown>),
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

  if (period.isLoading) return <LoadingView />;
  if (period.error || !period.data) return <ErrorView error={period.error} onRetry={() => period.refetch()} />;

  const p = period.data;

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <Stack.Screen options={{ headerShown: true, title: 'Life period' }} />
      <TextField label="Name" value={name} onChangeText={setName} />
      <TextField label="Description" value={description} onChangeText={setDescription} multiline style={styles.area} />
      <TextField label="Start (YYYY-MM-DD)" value={start} onChangeText={setStart} placeholder="2018-01-01" autoCapitalize="none" />
      <TextField label="End (YYYY-MM-DD)" value={end} onChangeText={setEnd} placeholder="2021-12-31" autoCapitalize="none" />
      <Select label="Date confidence" value={confidence} options={DATE_CONFIDENCE_OPTIONS} onChange={setConfidence} />
      <Picker
        label="Place / residence (optional)"
        placeholder="None"
        value={placeId}
        options={(places.data ?? []).map((pl) => ({ value: pl.id, label: pl.name }))}
        onChange={(v) => setPlaceId(v as number | null)}
      />
      <Button label="Save" onPress={() => save.mutate()} loading={save.isPending} />

      <Text style={[styles.section, { color: theme.text }]}>Memories in this period</Text>
      {(p.memories ?? []).length === 0 ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>No memories linked to this period yet.</Text>
      ) : (
        (p.memories ?? []).map((m) => (
          <Card key={m.id} onPress={() => router.push(`/memory/${m.id}`)} style={styles.row}>
            <Text style={[styles.rowTitle, { color: theme.primary }]} numberOfLines={1}>
              {m.title || 'Untitled memory'}
            </Text>
            {m.date_label ? <Text style={[styles.hint, { color: theme.textMuted }]}>{m.date_label}</Text> : null}
          </Card>
        ))
      )}

      <Button label="View connections" variant="secondary" onPress={() => router.push(`/graph/life_period/${periodId}`)} />
      <Button label="Delete period" variant="danger" onPress={confirmDelete} loading={remove.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  area: { minHeight: 80, textAlignVertical: 'top' },
  section: { fontSize: 16, fontWeight: '700', marginTop: Spacing.two },
  hint: { fontSize: 14 },
  row: { gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '500' },
});
