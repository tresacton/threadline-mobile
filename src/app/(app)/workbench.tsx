import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, humanizeError } from '@/components/ui/states';
import { SENSITIVITY_OPTIONS } from '@/constants/options';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Memories } from '@/lib/api/endpoints';
import type { Memory } from '@/lib/api/types';

// Edit several memories on one screen — each panel saves independently, mirroring
// the web workbench. Memory ids arrive as a comma-separated `ids` param.
export default function WorkbenchScreen() {
  const theme = useTheme();
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const memoryIds = (ids ?? '')
    .split(',')
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);

  return (
    <ScrollView contentInsetAdjustmentBehavior="never" automaticallyAdjustKeyboardInsets style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: true, title: 'Workbench' }} />
      {memoryIds.length === 0 ? (
        <EmptyState title="Nothing selected" body="Pick a few memories to edit them together." />
      ) : (
        <>
          <Text style={[styles.lead, { color: theme.textSecondary }]}>
            Editing {memoryIds.length} {memoryIds.length === 1 ? 'memory' : 'memories'} together. Each panel saves on
            its own.
          </Text>
          {memoryIds.map((id) => (
            <WorkbenchPanel key={id} memoryId={id} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function WorkbenchPanel({ memoryId }: { memoryId: number }) {
  const theme = useTheme();
  const qc = useQueryClient();
  const memory = useQuery({ queryKey: ['memory', memoryId], queryFn: () => Memories.get(memoryId) });

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [sensitivity, setSensitivity] = useState<string | null>(null);

  useEffect(() => {
    const m = memory.data;
    if (!m) return;
    setTitle(m.title ?? '');
    setBody(m.structured_body ?? '');
    setDateLabel(m.date_label ?? '');
    setSensitivity(m.sensitivity ?? null);
  }, [memory.data]);

  const save = useMutation({
    mutationFn: () =>
      Memories.update(memoryId, {
        title: title.trim(),
        structured_body: body.trim(),
        fuzzy_date_label: dateLabel.trim(),
        sensitivity_slug: sensitivity ?? undefined,
      } as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memory', memoryId] });
      qc.invalidateQueries({ queryKey: ['memories'] });
    },
    onError: (e) => Alert.alert('Could not save', humanizeError(e)),
  });

  if (memory.isLoading) {
    return (
      <Card style={styles.panel}>
        <Text style={{ color: theme.textMuted }}>Loading…</Text>
      </Card>
    );
  }
  if (memory.error || !memory.data) {
    return (
      <Card style={styles.panel}>
        <Text style={{ color: theme.danger }}>Couldn’t load memory {memoryId}.</Text>
      </Card>
    );
  }

  const m = memory.data as Memory;

  return (
    <Card style={styles.panel}>
      {m.original_wording && m.original_wording !== m.structured_body ? (
        <Text style={[styles.original, { color: theme.textMuted }]} numberOfLines={3}>
          Original: {m.original_wording}
        </Text>
      ) : null}
      <TextField label="Title" value={title} onChangeText={setTitle} />
      <TextField label="Memory" value={body} onChangeText={setBody} multiline style={styles.area} />
      <TextField label="When" value={dateLabel} onChangeText={setDateLabel} placeholder="Around 2014" />
      <Select label="Sensitivity" value={sensitivity} options={SENSITIVITY_OPTIONS} onChange={setSensitivity} />
      <View style={styles.actions}>
        <Button label="Save" fullWidth={false} onPress={() => save.mutate()} loading={save.isPending} />
        <Button label="Split" variant="ghost" fullWidth={false} onPress={() => router.push(`/memory/${memoryId}`)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.eight },
  lead: { fontSize: 15, lineHeight: 22 },
  panel: { gap: Spacing.three },
  original: { fontSize: 12, fontStyle: 'italic' },
  area: { minHeight: 100, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: Spacing.two },
});
