import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/states';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Graph } from '@/lib/api/endpoints';
import type { GraphNode } from '@/lib/api/types';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  person: 'person-outline',
  place: 'location-outline',
  life_period: 'time-outline',
};

// "person:123" -> the interactive ego-graph route for that node.
function routeFor(node: GraphNode): string | null {
  const localId = node.id.split(':')[1];
  if (!localId) return null;
  return `/graph/${node.type}/${localId}`;
}

export default function MapScreen() {
  const theme = useTheme();
  const graph = useQuery({ queryKey: ['graph'], queryFn: Graph.get });

  // Entities (people/places/periods) ranked by how connected they are.
  const entities = useMemo(() => {
    if (!graph.data) return [];
    return graph.data.nodes
      .filter((n) => n.type !== 'memory')
      .sort((a, b) => b.weight - a.weight);
  }, [graph.data]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Map' }} />
      {graph.isLoading ? (
        <LoadingView />
      ) : graph.error ? (
        <ErrorView error={graph.error} onRetry={() => graph.refetch()} />
      ) : entities.length === 0 ? (
        <EmptyState
          title="Your map is empty"
          body="As your memories connect people, places and periods, they'll appear here, most-connected first."
        />
      ) : (
        <FlatList
          data={entities}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={[styles.intro, { color: theme.textMuted }]}>
              People, places and periods across your memories — most connected first. Tap one to explore its
              connection graph.
              {graph.data?.truncated ? ' (Showing the busiest.)' : ''}
            </Text>
          }
          renderItem={({ item }) => {
            const route = routeFor(item);
            return (
              <Card style={styles.row} onPress={route ? () => router.push(route as never) : undefined}>
                <Ionicons name={ICONS[item.type] ?? 'ellipse-outline'} size={20} color={theme.primary} />
                <View style={styles.main}>
                  <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={[styles.meta, { color: theme.textMuted }]}>{item.type.replace('_', ' ')}</Text>
                </View>
                <View style={[styles.count, { backgroundColor: theme.backgroundElement }]}>
                  <Text style={[styles.countText, { color: theme.textSecondary }]}>
                    {item.weight} {item.weight === 1 ? 'link' : 'links'}
                  </Text>
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: Spacing.four, gap: Spacing.two },
  intro: { fontSize: 13, lineHeight: 18, marginBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  main: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 12, textTransform: 'capitalize' },
  count: { borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: 4 },
  countText: { fontSize: 12, fontWeight: '600' },
});
