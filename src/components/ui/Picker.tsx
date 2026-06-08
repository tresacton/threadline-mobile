import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface PickerOption<T extends string | number> {
  value: T;
  label: string;
  sublabel?: string;
}

interface PickerProps<T extends string | number> {
  label?: string;
  placeholder?: string;
  value: T | null;
  options: PickerOption<T>[];
  onChange: (value: T | null) => void;
  allowClear?: boolean;
}

/**
 * A searchable single-select that opens a full modal list. Use this (not the chip
 * Select) whenever the option set can grow large — memories, people, places, etc.
 */
export function Picker<T extends string | number>({
  label,
  placeholder = 'Choose…',
  value,
  options,
  onChange,
  allowClear = false,
}: PickerProps<T>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q));
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.field, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <Text style={[styles.fieldText, { color: selected ? theme.text : theme.textMuted }]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <View style={[styles.sheet, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.three }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>{label ?? 'Choose'}</Text>
            <Pressable onPress={close} hitSlop={10}>
              <Ionicons name="close" size={26} color={theme.text} />
            </Pressable>
          </View>

          <TextInput
            style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            placeholder="Search…"
            placeholderTextColor={theme.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
          />

          <FlatList
            data={filtered}
            keyExtractor={(o) => String(o.value)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.six }}
            ListHeaderComponent={
              allowClear && value != null ? (
                <Pressable
                  onPress={() => {
                    onChange(null);
                    close();
                  }}
                  style={[styles.row, { borderBottomColor: theme.border }]}
                >
                  <Text style={[styles.rowText, { color: theme.textMuted }]}>Clear selection</Text>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              <Text style={[styles.empty, { color: theme.textMuted }]}>No matches.</Text>
            }
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    close();
                  }}
                  style={[styles.row, { borderBottomColor: theme.border }]}
                >
                  <View style={styles.rowMain}>
                    <Text style={[styles.rowText, { color: theme.text }]}>{item.label}</Text>
                    {item.sublabel ? (
                      <Text style={[styles.rowSub, { color: theme.textMuted }]}>{item.sublabel}</Text>
                    ) : null}
                  </View>
                  {active ? <Ionicons name="checkmark" size={20} color={theme.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  label: { fontSize: 13, fontWeight: '600' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  fieldText: { flex: 1, fontSize: 16 },
  sheet: { flex: 1, paddingHorizontal: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three },
  title: { fontSize: 20, fontWeight: '700' },
  search: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    fontSize: 16,
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.three,
  },
  rowMain: { flex: 1, gap: 2 },
  rowText: { fontSize: 16 },
  rowSub: { fontSize: 13 },
  empty: { textAlign: 'center', paddingVertical: Spacing.six, fontSize: 15 },
});
