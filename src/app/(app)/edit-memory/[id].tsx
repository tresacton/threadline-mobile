import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { CATEGORY_OPTIONS, DATE_CONFIDENCE_OPTIONS, SENSITIVITY_OPTIONS } from '@/constants/options';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Memories } from '@/lib/api/endpoints';

export default function EditMemoryScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memoryId = Number(id);
  const memory = useQuery({ queryKey: ['memory', memoryId], queryFn: () => Memories.get(memoryId) });

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [sensitivity, setSensitivity] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [dateConfidence, setDateConfidence] = useState<string | null>(null);
  const [tags, setTags] = useState('');
  const [people, setPeople] = useState('');
  const [places, setPlaces] = useState('');

  useEffect(() => {
    const m = memory.data;
    if (!m) return;
    setTitle(m.title ?? '');
    setBody(m.structured_body ?? '');
    setDateLabel(m.date_label ?? '');
    setSensitivity(m.sensitivity ?? null);
    setCategory(m.category ?? null);
    setDateConfidence(m.date_confidence ?? null);
    setTags(m.tags.join(', '));
    setPeople(m.people.join(', '));
    setPlaces(m.places.join(', '));
  }, [memory.data]);

  const save = useMutation({
    mutationFn: () =>
      Memories.update(memoryId, {
        title: title.trim(),
        structured_body: body.trim(),
        fuzzy_date_label: dateLabel.trim(),
        sensitivity_slug: sensitivity ?? undefined,
        memory_category_slug: category ?? undefined,
        date_confidence_slug: dateConfidence ?? undefined,
        tag_names: tags,
        person_names: people,
        place_names: places,
      } as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memory', memoryId] });
      qc.invalidateQueries({ queryKey: ['memories'] });
      router.back();
    },
    onError: (e) => Alert.alert('Could not save', humanizeError(e)),
  });

  if (memory.isLoading) return <LoadingView />;
  if (memory.error || !memory.data) return <ErrorView error={memory.error} onRetry={() => memory.refetch()} />;

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <Stack.Screen options={{ headerShown: true, title: 'Edit memory' }} />
      <TextField label="Title" value={title} onChangeText={setTitle} placeholder="Title" />
      <TextField
        label="What happened"
        value={body}
        onChangeText={setBody}
        placeholder="The memory in your words"
        multiline
        style={styles.area}
      />
      <TextField
        label="When (a label, e.g. “Around 2014”)"
        value={dateLabel}
        onChangeText={setDateLabel}
        placeholder="Around 2014"
      />
      <Select label="Sensitivity" value={sensitivity} options={SENSITIVITY_OPTIONS} onChange={setSensitivity} />
      <Select label="Category" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
      <Select label="Date confidence" value={dateConfidence} options={DATE_CONFIDENCE_OPTIONS} onChange={setDateConfidence} />
      <TextField label="People (comma-separated)" value={people} onChangeText={setPeople} placeholder="Mum, Sh.S" />
      <TextField label="Places (comma-separated)" value={places} onChangeText={setPlaces} placeholder="Sydney" />
      <TextField label="Tags (comma-separated)" value={tags} onChangeText={setTags} placeholder="work, family" />
      <Text style={[styles.note, { color: theme.textMuted }]}>
        Your original captured wording is always kept — this edits the structured version.
      </Text>
      <Button label="Save changes" onPress={() => save.mutate()} loading={save.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  area: { minHeight: 140, textAlignVertical: 'top' },
  note: { fontSize: 13, lineHeight: 18 },
});
