import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Screen } from '@/components/ui/Screen';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { TokenInput } from '@/components/ui/TokenInput';
import { humanizeError } from '@/components/ui/states';
import {
  CATEGORY_OPTIONS,
  DATE_CONFIDENCE_OPTIONS,
  DATE_PRECISION_OPTIONS,
  SENSITIVITY_OPTIONS,
  VALENCE_OPTIONS,
} from '@/constants/options';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LifePeriods, Memories, People, Places, Tags } from '@/lib/api/endpoints';

export default function CaptureScreen() {
  const theme = useTheme();
  const qc = useQueryClient();

  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Structured fields (optional — shaped here or later in Edit).
  const [title, setTitle] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [exactDate, setExactDate] = useState('');
  const [precision, setPrecision] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);
  const [valence, setValence] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [sensitivity, setSensitivity] = useState<string | null>(null);
  const [importance, setImportance] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [places, setPlaces] = useState<string[]>([]);

  // Existing names for search-as-you-type (only fetched once details are opened).
  const peopleOpts = useQuery({ queryKey: ['people'], queryFn: People.list, enabled: showDetails });
  const placeOpts = useQuery({ queryKey: ['places'], queryFn: Places.list, enabled: showDetails });
  const tagOpts = useQuery({ queryKey: ['tags'], queryFn: Tags.list, enabled: showDetails });
  const periodOpts = useQuery({ queryKey: ['life_periods'], queryFn: LifePeriods.list, enabled: showDetails });
  const [lifePeriods, setLifePeriods] = useState<string[]>([]);

  const create = useMutation({
    mutationFn: () =>
      Memories.create({
        raw_text: text.trim(),
        title: title.trim() || undefined,
        fuzzy_date_label: dateLabel.trim() || undefined,
        occurred_on: exactDate.trim() || undefined,
        date_precision_slug: precision ?? undefined,
        date_confidence_slug: confidence ?? undefined,
        emotional_valence_slug: valence ?? undefined,
        memory_category_slug: category ?? undefined,
        sensitivity_slug: sensitivity ?? undefined,
        importance: importance ? Number(importance) : undefined,
        tag_names: tags.length ? tags.join('\n') : undefined,
        person_names: people.length ? people.join('\n') : undefined,
        place_names: places.length ? places.join('\n') : undefined,
        life_period_names: lifePeriods.length ? lifePeriods.join('\n') : undefined,
      } as Record<string, unknown>),
    onSuccess: (memory) => {
      qc.invalidateQueries({ queryKey: ['memories'] });
      router.replace(`/memory/${memory.id}`);
    },
    onError: (e) => setError(humanizeError(e)),
  });

  const onSave = () => {
    setError(null);
    if (text.trim().length < 2) {
      setError('Write a little more first.');
      return;
    }
    create.mutate();
  };

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <Stack.Screen options={{ headerShown: true, title: 'New memory' }} />
      <Text style={[styles.lead, { color: theme.textSecondary }]}>
        Write it in your own words — however much or little you remember. You can shape it afterwards.
      </Text>
      <TextField
        value={text}
        onChangeText={setText}
        placeholder="What happened?"
        multiline
        numberOfLines={8}
        style={styles.area}
        error={error}
        autoFocus
      />

      <Pressable onPress={() => setShowDetails((v) => !v)} style={styles.detailsToggle}>
        <Text style={[styles.detailsToggleText, { color: theme.primary }]}>
          {showDetails ? 'Hide details' : 'Add details (optional)'}
        </Text>
      </Pressable>

      {showDetails ? (
        <View style={styles.details}>
          <TextField label="Title" value={title} onChangeText={setTitle} placeholder="A short name" />
          <TextField
            label="When (a label, e.g. “Around 2014”)"
            value={dateLabel}
            onChangeText={setDateLabel}
            placeholder="Around 2014"
          />
          <DateField
            label="Exact date (if known)"
            value={exactDate || null}
            onChange={(d) => setExactDate(d ?? '')}
            placeholder="Pick a date"
          />
          <Select label="Date precision" value={precision} options={DATE_PRECISION_OPTIONS} onChange={setPrecision} />
          <Select label="Date confidence" value={confidence} options={DATE_CONFIDENCE_OPTIONS} onChange={setConfidence} />
          <Select label="How did it feel?" value={valence} options={VALENCE_OPTIONS} onChange={setValence} />
          <Select label="Category" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
          <TextField
            label="Importance (1–5)"
            value={importance}
            onChangeText={setImportance}
            placeholder="1–5"
            keyboardType="number-pad"
          />
          <Select label="Sensitivity" value={sensitivity} options={SENSITIVITY_OPTIONS} onChange={setSensitivity} />
          <TokenInput
            label="People"
            value={people}
            options={(peopleOpts.data ?? []).map((p) => p.name)}
            onChange={setPeople}
            placeholder="Search or add a person"
          />
          <TokenInput
            label="Places"
            value={places}
            options={(placeOpts.data ?? []).map((p) => p.name)}
            onChange={setPlaces}
            placeholder="Search or add a place"
          />
          <TokenInput
            label="Life periods"
            value={lifePeriods}
            options={(periodOpts.data ?? []).map((p) => p.name)}
            onChange={setLifePeriods}
            placeholder="Search or add a life period"
          />
          <TokenInput
            label="Tags"
            value={tags}
            options={(tagOpts.data ?? []).map((t) => t.name)}
            onChange={setTags}
            placeholder="Search or add a tag"
          />
        </View>
      ) : null}

      <Button label="Save memory" onPress={onSave} loading={create.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 15, lineHeight: 22 },
  area: { minHeight: 180, textAlignVertical: 'top' },
  detailsToggle: { paddingVertical: Spacing.one },
  detailsToggleText: { fontSize: 15, fontWeight: '600' },
  details: { gap: Spacing.four },
});
