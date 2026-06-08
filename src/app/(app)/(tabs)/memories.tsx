import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Picker } from '@/components/ui/Picker';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/states';
import { CATEGORY_OPTIONS, VALENCE_OPTIONS } from '@/constants/options';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Memories } from '@/lib/api/endpoints';
import type { Memory } from '@/lib/api/types';

const VALENCE_COLOR: Record<string, string> = {
  very_negative: '#b0413e',
  negative: '#c97b53',
  mixed: '#9a86c4',
  neutral: '#8a94a6',
  positive: '#4f9d69',
  very_positive: '#2e8b57',
};

const GROUP_OPTIONS = [
  { value: 'none', label: 'List' },
  { value: 'year', label: 'By year' },
  { value: 'place', label: 'By place' },
  { value: 'person', label: 'By person' },
  { value: 'category', label: 'By category' },
  { value: 'feeling', label: 'By feeling' },
];

type Filters = { person: string | null; place: string | null; tag: string | null; valence: string | null; category: string | null };

const EMPTY: Filters = { person: null, place: null, tag: null, valence: null, category: null };

const titleize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function MemoriesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [group, setGroup] = useState('none');
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const selecting = selected.size > 0;
  const trimmed = query.trim();

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const openWorkbench = () => {
    const ids = Array.from(selected).join(',');
    setSelected(new Set());
    router.push(`/workbench?ids=${ids}`);
  };

  const all = useQuery({ queryKey: ['memories'], queryFn: Memories.list });
  const search = useQuery({
    queryKey: ['memories', 'search', trimmed],
    queryFn: () => Memories.search(trimmed),
    enabled: trimmed.length > 1,
  });

  const searching = trimmed.length > 1;
  const base = searching ? search.data : all.data;
  const loading = searching ? search.isLoading : all.isLoading;
  const error = searching ? search.error : all.error;

  // Filter option lists are derived from the loaded memories so they always match
  // what's present, no extra round-trips.
  const optionLists = useMemo(() => {
    const people = new Set<string>();
    const places = new Set<string>();
    const tags = new Set<string>();
    (all.data ?? []).forEach((m) => {
      m.people.forEach((p) => people.add(p));
      m.places.forEach((p) => places.add(p));
      m.tags.forEach((t) => tags.add(t));
    });
    const toOpts = (s: Set<string>) => Array.from(s).sort().map((v) => ({ value: v, label: v }));
    return { people: toOpts(people), places: toOpts(places), tags: toOpts(tags) };
  }, [all.data]);

  const filtered = useMemo(() => {
    let list = base ?? [];
    if (filters.person) list = list.filter((m) => m.people.includes(filters.person!));
    if (filters.place) list = list.filter((m) => m.places.includes(filters.place!));
    if (filters.tag) list = list.filter((m) => m.tags.includes(filters.tag!));
    if (filters.valence) list = list.filter((m) => m.emotional_valence === filters.valence);
    if (filters.category) list = list.filter((m) => m.category === filters.category);
    return list;
  }, [base, filters]);

  const sections = useMemo(() => buildSections(filtered, group), [filtered, group]);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <View style={[styles.flex, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.three }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Memories</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setShowFilters((v) => !v)} hitSlop={10}>
            <Ionicons
              name={activeFilterCount > 0 ? 'funnel' : 'funnel-outline'}
              size={24}
              color={activeFilterCount > 0 ? theme.primary : theme.textSecondary}
            />
          </Pressable>
          <Pressable onPress={() => router.push('/capture')} hitSlop={10}>
            <Ionicons name="add-circle" size={30} color={theme.primary} />
          </Pressable>
        </View>
      </View>

      {selecting ? (
        <View style={[styles.selectBar, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.selectText, { color: theme.text }]}>{selected.size} selected</Text>
          <View style={styles.selectActions}>
            <Pressable onPress={() => setSelected(new Set())} hitSlop={8}>
              <Text style={[styles.selectAction, { color: theme.textMuted }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={openWorkbench} hitSlop={8}>
              <Text style={[styles.selectAction, { color: theme.primary }]}>Open in workbench</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.searchWrap}>
        <TextField
          placeholder="Search your memories"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {showFilters ? (
        <Card style={styles.filterCard}>
          <Select label="Group" value={group} options={GROUP_OPTIONS} onChange={setGroup} />
          <Picker
            label="Person"
            placeholder="Any person"
            value={filters.person}
            options={optionLists.people}
            onChange={(v) => setFilters((f) => ({ ...f, person: (v as string) ?? null }))}
          />
          <Picker
            label="Place"
            placeholder="Any place"
            value={filters.place}
            options={optionLists.places}
            onChange={(v) => setFilters((f) => ({ ...f, place: (v as string) ?? null }))}
          />
          <Picker
            label="Tag"
            placeholder="Any tag"
            value={filters.tag}
            options={optionLists.tags}
            onChange={(v) => setFilters((f) => ({ ...f, tag: (v as string) ?? null }))}
          />
          <Select label="Feeling" value={filters.valence} options={VALENCE_OPTIONS} onChange={(v) => setFilters((f) => ({ ...f, valence: v }))} />
          <Select label="Category" value={filters.category} options={CATEGORY_OPTIONS} onChange={(v) => setFilters((f) => ({ ...f, category: v }))} />
          {activeFilterCount > 0 ? (
            <Pressable onPress={() => setFilters(EMPTY)}>
              <Text style={[styles.clear, { color: theme.primary }]}>Clear filters</Text>
            </Pressable>
          ) : null}
        </Card>
      ) : null}

      {loading ? (
        <LoadingView />
      ) : error ? (
        <ErrorView error={error} onRetry={() => (searching ? search.refetch() : all.refetch())} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={searching || activeFilterCount > 0 ? 'No matches' : 'No memories yet'}
          body={searching || activeFilterCount > 0 ? 'Try different filters or words.' : 'Tap + to capture your first memory.'}
        />
      ) : (
        <SectionList
          contentInsetAdjustmentBehavior="never"
          sections={sections}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) =>
            section.title ? (
              <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{section.title}</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <MemoryRow
              memory={item}
              selecting={selecting}
              isSelected={selected.has(item.id)}
              onPress={() => (selecting ? toggle(item.id) : router.push(`/memory/${item.id}`))}
              onLongPress={() => toggle(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

function buildSections(list: Memory[], group: string): { title: string | null; data: Memory[] }[] {
  if (group === 'none') return [{ title: null, data: list }];

  const buckets = new Map<string, Memory[]>();
  const push = (key: string, m: Memory) => {
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(m);
  };

  list.forEach((m) => {
    if (group === 'year') {
      const year = m.occurred_on ? m.occurred_on.slice(0, 4) : 'Undated';
      push(year, m);
    } else if (group === 'place') {
      if (m.places.length === 0) push('No place', m);
      else m.places.forEach((p) => push(p, m));
    } else if (group === 'person') {
      if (m.people.length === 0) push('No one tagged', m);
      else m.people.forEach((p) => push(p, m));
    } else if (group === 'category') {
      push(m.category ? titleize(m.category) : 'Uncategorised', m);
    } else if (group === 'feeling') {
      push(m.emotional_valence ? titleize(m.emotional_valence) : 'No feeling set', m);
    }
  });

  const keys = Array.from(buckets.keys());
  // Years descending; everything else alphabetical with the "none" bucket last.
  keys.sort((a, b) => {
    if (group === 'year') return b.localeCompare(a);
    return a.localeCompare(b);
  });
  return keys.map((k) => ({ title: k, data: buckets.get(k)! }));
}

function MemoryRow({
  memory,
  selecting,
  isSelected,
  onPress,
  onLongPress,
}: {
  memory: Memory;
  selecting: boolean;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useTheme();
  const valenceColor = memory.emotional_valence ? VALENCE_COLOR[memory.emotional_valence] : null;
  const sensitive = memory.sensitivity && memory.sensitivity !== 'normal';
  return (
    <Card
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.row, isSelected ? { borderColor: theme.primary, borderWidth: 1.5 } : null]}
    >
      <View style={styles.rowTitleLine}>
        {selecting ? (
          <Ionicons
            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
            size={18}
            color={isSelected ? theme.primary : theme.textMuted}
          />
        ) : null}
        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
          {memory.title || 'Untitled memory'}
        </Text>
        {sensitive ? <Ionicons name="lock-closed" size={13} color={theme.warning} /> : null}
      </View>
      <View style={styles.rowMetaLine}>
        {memory.date_label ? <Text style={[styles.rowMeta, { color: theme.textMuted }]}>{memory.date_label}</Text> : null}
        {valenceColor ? <View style={[styles.dot, { backgroundColor: valenceColor }]} /> : null}
        {memory.importance != null ? (
          <Text style={[styles.rowMeta, { color: theme.textMuted }]}>★ {memory.importance}</Text>
        ) : null}
      </View>
      {memory.structured_body ? (
        <Text style={[styles.rowBody, { color: theme.textSecondary }]} numberOfLines={2}>
          {memory.structured_body}
        </Text>
      ) : null}
      {memory.people.length > 0 || memory.places.length > 0 ? (
        <View style={styles.tags}>
          {memory.people.slice(0, 3).map((p) => (
            <Chip key={`pe-${p}`} icon="person" label={p} />
          ))}
          {memory.places.slice(0, 2).map((p) => (
            <Chip key={`pl-${p}`} icon="location" label={p} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function Chip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: theme.backgroundElement }]}>
      <Ionicons name={icon} size={11} color={theme.textMuted} />
      <Text style={[styles.tagText, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  title: { fontSize: 28, fontWeight: '700' },
  searchWrap: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  selectBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: Spacing.four, marginTop: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderRadius: Radius.md },
  selectText: { fontSize: 14, fontWeight: '600' },
  selectActions: { flexDirection: 'row', gap: Spacing.four },
  selectAction: { fontSize: 14, fontWeight: '600' },
  filterCard: { marginHorizontal: Spacing.four, marginBottom: Spacing.three, gap: Spacing.three },
  clear: { fontSize: 14, fontWeight: '600' },
  listContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.eight, gap: Spacing.three },
  sectionHeader: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.three, marginBottom: Spacing.one },
  row: { gap: Spacing.one },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rowTitle: { fontSize: 17, fontWeight: '600', flexShrink: 1 },
  rowMetaLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rowMeta: { fontSize: 13 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowBody: { fontSize: 14, lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: 3 },
  tagText: { fontSize: 12 },
});
