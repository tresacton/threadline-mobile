import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Picker } from '@/components/ui/Picker';
import { Select } from '@/components/ui/Select';
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LifePeriods, People, Places, Tags, Timeline } from '@/lib/api/endpoints';
import type { TimelineMemory } from '@/lib/api/types';

type Order = 'newest' | 'oldest';

export default function TimelineScreen() {
  const theme = useTheme();
  const [order, setOrder] = useState<Order>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [personId, setPersonId] = useState<number | null>(null);
  const [placeId, setPlaceId] = useState<number | null>(null);
  const [tagId, setTagId] = useState<number | null>(null);
  const [lifePeriodId, setLifePeriodId] = useState<number | null>(null);

  const people = useQuery({ queryKey: ['people'], queryFn: People.list, enabled: showFilters });
  const places = useQuery({ queryKey: ['places'], queryFn: Places.list, enabled: showFilters });
  const tags = useQuery({ queryKey: ['tags'], queryFn: Tags.list, enabled: showFilters });
  const periods = useQuery({ queryKey: ['life_periods'], queryFn: LifePeriods.list, enabled: showFilters });

  const filters = {
    order,
    person_id: personId ?? undefined,
    place_id: placeId ?? undefined,
    tag_id: tagId ?? undefined,
    life_period_id: lifePeriodId ?? undefined,
  };
  const timeline = useQuery({
    queryKey: ['timeline', filters],
    queryFn: () => Timeline.show(filters),
  });

  const hasFilter = personId || placeId || tagId || lifePeriodId;
  const clearAll = () => {
    setPersonId(null);
    setPlaceId(null);
    setTagId(null);
    setLifePeriodId(null);
  };

  const sections = [
    ...(timeline.data?.years.map((y) => ({ title: String(y.year), data: y.memories })) ?? []),
    ...(timeline.data && timeline.data.fuzzy.length
      ? [{ title: 'Undated', data: timeline.data.fuzzy }]
      : []),
  ];

  // Single-select helper: choosing a filter type clears the others (parity with web).
  const pickOnly = (setter: (v: number | null) => void, value: number) => {
    clearAll();
    setter(value);
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Timeline',
          headerRight: () => (
            <Pressable onPress={() => setShowFilters((s) => !s)} hitSlop={10} style={styles.headerBtn}>
              <Ionicons
                name={hasFilter ? 'funnel' : 'funnel-outline'}
                size={20}
                color={theme.primary}
              />
            </Pressable>
          ),
        }}
      />

      <View style={styles.controls}>
        <Select
          value={order}
          options={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
          ]}
          onChange={(v) => setOrder(v as Order)}
        />
        {showFilters ? (
          <View style={styles.filters}>
            {people.data?.length ? (
              <Picker label="Person" placeholder="Any person" allowClear value={personId} options={people.data.map((p) => ({ value: p.id, label: p.name }))} onChange={(v) => (v == null ? setPersonId(null) : pickOnly(setPersonId, Number(v)))} />
            ) : null}
            {places.data?.length ? (
              <Picker label="Place" placeholder="Any place" allowClear value={placeId} options={places.data.map((p) => ({ value: p.id, label: p.name }))} onChange={(v) => (v == null ? setPlaceId(null) : pickOnly(setPlaceId, Number(v)))} />
            ) : null}
            {tags.data?.length ? (
              <Picker label="Tag" placeholder="Any tag" allowClear value={tagId} options={tags.data.map((t) => ({ value: t.id, label: t.name }))} onChange={(v) => (v == null ? setTagId(null) : pickOnly(setTagId, Number(v)))} />
            ) : null}
            {periods.data?.length ? (
              <Picker label="Life period" placeholder="Any period" allowClear value={lifePeriodId} options={periods.data.map((p) => ({ value: p.id, label: p.name }))} onChange={(v) => (v == null ? setLifePeriodId(null) : pickOnly(setLifePeriodId, Number(v)))} />
            ) : null}
            {hasFilter ? (
              <Pressable onPress={clearAll} style={styles.clear}>
                <Text style={[styles.clearText, { color: theme.primary }]}>Clear filters</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {timeline.isLoading ? (
        <LoadingView />
      ) : timeline.error ? (
        <ErrorView error={timeline.error} onRetry={() => timeline.refetch()} />
      ) : sections.length === 0 ? (
        <EmptyState title="Nothing here" body={hasFilter ? 'No memories match this filter.' : 'Captured memories will arrange themselves here.'} />
      ) : (
        <SectionList contentInsetAdjustmentBehavior="never"
          sections={sections}
          keyExtractor={(m: TimelineMemory) => String(m.id)}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.year, { color: theme.primary, backgroundColor: theme.background }]}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/memory/${item.id}`)} style={styles.row}>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                {item.title || 'Untitled memory'}
              </Text>
              {item.date_label ? (
                <Text style={[styles.meta, { color: theme.textMuted }]}>{item.date_label}</Text>
              ) : null}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  controls: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.three },
  filters: { gap: Spacing.three, paddingBottom: Spacing.two },
  clear: { paddingVertical: Spacing.two },
  clearText: { fontSize: 14, fontWeight: '600' },
  list: { padding: Spacing.four, gap: Spacing.two },
  year: { fontSize: 18, fontWeight: '700', paddingVertical: Spacing.two },
  row: { gap: 2, marginBottom: Spacing.two },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13 },
});
