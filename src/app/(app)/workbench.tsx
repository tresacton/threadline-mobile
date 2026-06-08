import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Picker } from '@/components/ui/Picker';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { humanizeError } from '@/components/ui/states';
import { SENSITIVITY_OPTIONS } from '@/constants/options';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Memories } from '@/lib/api/endpoints';

const MAX = 3;

// Edit up to three memories together, each in its own collapsible panel. Memories
// can arrive pre-selected via the `ids` param (from the memories-list multi-select)
// or be picked here directly.
export default function WorkbenchScreen() {
  const theme = useTheme();
  const { ids } = useLocalSearchParams<{ ids?: string }>();

  const initial = useMemo(
    () =>
      (ids ?? '')
        .split(',')
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0)
        .slice(0, MAX),
    [ids],
  );

  const [selected, setSelected] = useState<number[]>(initial);
  // Re-seed if navigated in again with a different selection.
  useEffect(() => {
    if (initial.length) setSelected(initial);
  }, [initial]);

  const memories = useQuery({ queryKey: ['memories'], queryFn: Memories.list });

  const add = (id: number) =>
    setSelected((prev) => (prev.includes(id) || prev.length >= MAX ? prev : [...prev, id]));
  const removeId = (id: number) => setSelected((prev) => prev.filter((x) => x !== id));

  const selectable = (memories.data ?? []).filter((m) => !selected.includes(m.id));

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustKeyboardInsets
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ headerShown: true, title: 'Workbench' }} />
      <Text style={[styles.lead, { color: theme.textSecondary }]}>
        Pick up to {MAX} memories to edit together. Each panel saves on its own.
      </Text>

      {selected.length < MAX ? (
        <Picker
          label={`Add a memory (${selected.length}/${MAX})`}
          placeholder="Search memories to add"
          value={null}
          options={selectable.map((m) => ({
            value: m.id,
            label: m.title || 'Untitled memory',
            sublabel: m.date_label || undefined,
          }))}
          onChange={(v) => {
            if (v != null) add(Number(v));
          }}
        />
      ) : (
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          That’s the max of {MAX}. Remove one to swap it out.
        </Text>
      )}

      {selected.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMuted }]}>
          Nothing selected yet — add a memory above to start.
        </Text>
      ) : (
        selected.map((id) => (
          <WorkbenchPanel key={id} memoryId={id} onRemove={() => removeId(id)} defaultOpen={selected.length === 1} />
        ))
      )}
    </ScrollView>
  );
}

function WorkbenchPanel({
  memoryId,
  onRemove,
  defaultOpen,
}: {
  memoryId: number;
  onRemove: () => void;
  defaultOpen: boolean;
}) {
  const theme = useTheme();
  const qc = useQueryClient();
  const memory = useQuery({ queryKey: ['memory', memoryId], queryFn: () => Memories.get(memoryId) });

  const [open, setOpen] = useState(defaultOpen);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [sensitivity, setSensitivity] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const m = memory.data;
    if (!m) return;
    setTitle(m.title ?? '');
    setBody(m.structured_body ?? '');
    setDateLabel(m.date_label ?? '');
    setSensitivity(m.sensitivity ?? null);
    setDirty(false);
  }, [memory.data]);

  const edit = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };

  const save = useMutation({
    mutationFn: () =>
      Memories.update(memoryId, {
        title: title.trim(),
        structured_body: body.trim(),
        fuzzy_date_label: dateLabel.trim(),
        sensitivity_slug: sensitivity ?? undefined,
      } as Record<string, unknown>),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['memory', memoryId] });
      qc.invalidateQueries({ queryKey: ['memories'] });
    },
    onError: (e) => Alert.alert('Could not save', humanizeError(e)),
  });

  const headerTitle = memory.data?.title || title || 'Untitled memory';

  return (
    <Card style={styles.panel} padded={false}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.panelHeader}>
        <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={18} color={theme.textMuted} />
        <Text style={[styles.panelTitle, { color: theme.text }]} numberOfLines={1}>
          {headerTitle}
        </Text>
        {dirty ? <View style={[styles.dot, { backgroundColor: theme.accent }]} /> : null}
        <Pressable onPress={onRemove} hitSlop={10} style={styles.remove}>
          <Ionicons name="close" size={18} color={theme.textMuted} />
        </Pressable>
      </Pressable>

      {open ? (
        memory.isLoading ? (
          <Text style={[styles.bodyPad, { color: theme.textMuted }]}>Loading…</Text>
        ) : memory.error || !memory.data ? (
          <Text style={[styles.bodyPad, { color: theme.danger }]}>Couldn’t load this memory.</Text>
        ) : (
          <View style={styles.panelBody}>
            {memory.data.original_wording && memory.data.original_wording !== memory.data.structured_body ? (
              <Text style={[styles.original, { color: theme.textMuted }]} numberOfLines={3}>
                Original: {memory.data.original_wording}
              </Text>
            ) : null}
            <TextField label="Title" value={title} onChangeText={edit(setTitle)} />
            <TextField label="Memory" value={body} onChangeText={edit(setBody)} multiline style={styles.area} />
            <TextField label="When" value={dateLabel} onChangeText={edit(setDateLabel)} placeholder="Around 2014" />
            <Select label="Sensitivity" value={sensitivity} options={SENSITIVITY_OPTIONS} onChange={edit(setSensitivity)} />
            <View style={styles.actions}>
              <Button label="Save" fullWidth={false} onPress={() => save.mutate()} loading={save.isPending} disabled={!dirty} />
              <Button label="Open full" variant="ghost" fullWidth={false} onPress={() => router.push(`/memory/${memoryId}`)} />
            </View>
          </View>
        )
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.eight },
  lead: { fontSize: 15, lineHeight: 22 },
  hint: { fontSize: 14 },
  empty: { fontSize: 15, marginTop: Spacing.two },
  panel: { overflow: 'hidden' },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.four },
  panelTitle: { flex: 1, fontSize: 16, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  remove: { padding: Spacing.one },
  panelBody: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.three },
  bodyPad: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four },
  original: { fontSize: 12, fontStyle: 'italic' },
  area: { minHeight: 100, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: Spacing.two },
});
