import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Timeline } from '@/lib/api/endpoints';
import type { TimelineMemory } from '@/lib/api/types';

export default function TimelineScreen() {
  const theme = useTheme();
  const timeline = useQuery({ queryKey: ['timeline'], queryFn: () => Timeline.show({ order: 'newest' }) });

  const sections = [
    ...(timeline.data?.years.map((y) => ({ title: String(y.year), data: y.memories })) ?? []),
    ...(timeline.data && timeline.data.fuzzy.length
      ? [{ title: 'Undated', data: timeline.data.fuzzy }]
      : []),
  ];

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Timeline' }} />
      {timeline.isLoading ? (
        <LoadingView />
      ) : timeline.error ? (
        <ErrorView error={timeline.error} onRetry={() => timeline.refetch()} />
      ) : sections.length === 0 ? (
        <EmptyState title="Your timeline is empty" body="Captured memories will arrange themselves here." />
      ) : (
        <SectionList
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
  list: { padding: Spacing.four, gap: Spacing.two },
  year: { fontSize: 18, fontWeight: '700', paddingVertical: Spacing.two },
  row: { gap: 2, marginBottom: Spacing.two },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13 },
});
