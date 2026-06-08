import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface SelectProps<T extends string | number> {
  label?: string;
  value: T | null | undefined;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  allowClear?: boolean;
}

/** A horizontal wrap of selectable chips — for enums and short option lists. */
export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  allowClear = false,
}: SelectProps<T>) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text> : null}
      <View style={styles.chips}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={String(opt.value)}
              onPress={() => onChange(opt.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primary : theme.backgroundElement,
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? theme.onPrimary : theme.text }]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
        {allowClear && value != null ? (
          <Pressable
            onPress={() => onChange('' as T)}
            style={[styles.chip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            <Text style={[styles.chipText, { color: theme.textMuted }]}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  label: { fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
});
