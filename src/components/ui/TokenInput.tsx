import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface TokenInputProps {
  label?: string;
  value: string[];
  options: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

/**
 * Multi-select token input with search-as-you-type. Typing filters existing
 * options to tap-add; you can also add a brand-new name (it appears as an
 * "Add …" suggestion and on return). Selected items show as removable chips.
 */
export function TokenInput({ label, value, options, onChange, placeholder }: TokenInputProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');

  const has = (name: string) => value.some((v) => v.toLowerCase() === name.toLowerCase());

  const add = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || has(trimmed)) {
      setQuery('');
      return;
    }
    onChange([...value, trimmed]);
    setQuery('');
  };
  const remove = (name: string) => onChange(value.filter((v) => v !== name));

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return options.filter((o) => o.toLowerCase().includes(q) && !has(o)).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, options, value]);

  const canCreate =
    query.trim().length > 0 && !options.some((o) => o.toLowerCase() === query.trim().toLowerCase()) && !has(query.trim());

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text> : null}

      {value.length > 0 ? (
        <View style={styles.chips}>
          {value.map((name) => (
            <Pressable
              key={name}
              onPress={() => remove(name)}
              style={[styles.chip, { backgroundColor: theme.primary }]}
            >
              <Text style={[styles.chipText, { color: theme.onPrimary }]}>{name}</Text>
              <Ionicons name="close" size={14} color={theme.onPrimary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder ?? 'Start typing to search…'}
        placeholderTextColor={theme.textMuted}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => add(query)}
        style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
      />

      {suggestions.length > 0 || canCreate ? (
        <View style={styles.suggestions}>
          {suggestions.map((s) => (
            <Pressable
              key={s}
              onPress={() => add(s)}
              style={[styles.suggestion, { backgroundColor: theme.backgroundElement }]}
            >
              <Text style={[styles.suggestionText, { color: theme.text }]}>{s}</Text>
            </Pressable>
          ))}
          {canCreate ? (
            <Pressable
              onPress={() => add(query)}
              style={[styles.suggestion, { backgroundColor: theme.backgroundElement }]}
            >
              <Ionicons name="add" size={15} color={theme.primary} />
              <Text style={[styles.suggestionText, { color: theme.primary }]}>Add “{query.trim()}”</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  label: { fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.pill,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: 5,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    fontSize: 16,
  },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
  },
  suggestionText: { fontSize: 14 },
});
