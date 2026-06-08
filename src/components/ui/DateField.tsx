import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYMD(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDisplay(s: string | null | undefined): string | null {
  const d = parseYMD(s);
  return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;
}

interface DateFieldProps {
  label?: string;
  /** ISO date string (YYYY-MM-DD) or null. */
  value: string | null;
  onChange: (next: string | null) => void;
  placeholder?: string;
}

/**
 * A tap-to-open native date picker that reads/writes `YYYY-MM-DD` strings (the
 * shape the API expects). Optional — a Clear control unsets it. On Android the
 * picker is the system dialog; on iOS it's a spinner in a bottom sheet committed
 * with Done.
 */
export function DateField({ label, value, onChange, placeholder = 'Select a date' }: DateFieldProps) {
  const theme = useTheme();
  const [show, setShow] = useState(false);
  const [temp, setTemp] = useState<Date>(() => parseYMD(value) ?? new Date());

  const open = () => {
    setTemp(parseYMD(value) ?? new Date());
    setShow(true);
  };

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (event.type === 'set' && date) onChange(toYMD(date));
      return;
    }
    if (date) setTemp(date);
  };

  const display = formatDisplay(value);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text> : null}
      <View style={styles.row}>
        <Pressable
          onPress={open}
          style={[styles.field, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
        >
          <Text style={[styles.value, { color: display ? theme.text : theme.textMuted }]}>
            {display ?? placeholder}
          </Text>
        </Pressable>
        {value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={8} style={styles.clear}>
            <Text style={[styles.clearText, { color: theme.textMuted }]}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {show && Platform.OS === 'android' ? (
        <DateTimePicker value={temp} mode="date" onChange={onPickerChange} />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
          <Pressable style={styles.backdrop} onPress={() => setShow(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
              <DateTimePicker value={temp} mode="date" display="spinner" onChange={onPickerChange} textColor={theme.text} />
              <Pressable
                onPress={() => {
                  onChange(toYMD(temp));
                  setShow(false);
                }}
                style={[styles.done, { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.doneText, { color: theme.onPrimary }]}>Done</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  label: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  field: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  value: { fontSize: 16 },
  clear: { paddingVertical: Spacing.two },
  clearText: { fontSize: 14, fontWeight: '600' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { paddingBottom: Spacing.six, paddingTop: Spacing.three, paddingHorizontal: Spacing.four, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl },
  done: { borderRadius: Radius.md, paddingVertical: Spacing.three, alignItems: 'center', marginTop: Spacing.two },
  doneText: { fontSize: 16, fontWeight: '600' },
});
