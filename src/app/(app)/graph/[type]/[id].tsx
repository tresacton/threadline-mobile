import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NodeGraph } from '@/components/NodeGraph';
import { ErrorView, LoadingView } from '@/components/ui/states';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Graph } from '@/lib/api/endpoints';
import type { GraphNode } from '@/lib/api/types';

function routeForNode(node: GraphNode): string | null {
  const localId = node.id.split(':')[1];
  if (!localId) return null;
  switch (node.type) {
    case 'person':
      return `/person/${localId}`;
    case 'place':
      return `/place/${localId}`;
    case 'life_period':
      return `/period/${localId}`;
    case 'memory':
      return `/memory/${localId}`;
    default:
      return null;
  }
}

export default function EgoGraphScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ type: string; id: string }>();
  const origin = `${params.type}:${params.id}`;
  const [center, setCenter] = useState(origin);
  const browsedAway = center !== origin;

  const ego = useQuery({ queryKey: ['ego', center], queryFn: () => Graph.ego(center) });

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Connections',
          headerRight: () =>
            browsedAway ? (
              <Pressable onPress={() => setCenter(origin)} hitSlop={10}>
                <Ionicons name="refresh" size={20} color={theme.primary} />
              </Pressable>
            ) : null,
        }}
      />

      {ego.isLoading ? (
        <LoadingView />
      ) : ego.error ? (
        <ErrorView error={ego.error} onRetry={() => ego.refetch()} />
      ) : !ego.data || !ego.data.center ? (
        <View style={styles.center}>
          <Text style={[styles.empty, { color: theme.textMuted }]}>Nothing connects here yet.</Text>
        </View>
      ) : (
        <>
          <View style={styles.headerRow}>
            <View style={styles.headerMain}>
              <Text style={[styles.centerLabel, { color: theme.text }]} numberOfLines={1}>
                {ego.data.center.label}
              </Text>
              <Text style={[styles.sub, { color: theme.textMuted }]}>
                {ego.data.first_degree_count} direct{' '}
                {ego.data.first_degree_count === 1 ? 'connection' : 'connections'}
                {ego.data.depth === 2 ? ' · showing 1st & 2nd degree' : ' · showing direct only'}
              </Text>
            </View>
            {browsedAway ? (
              <Pressable onPress={() => setCenter(origin)} style={[styles.openBtn, { borderColor: theme.border }]}>
                <Text style={[styles.openText, { color: theme.primary }]}>Reset</Text>
              </Pressable>
            ) : null}
            {routeForNode(ego.data.center) ? (
              <Pressable
                onPress={() => router.push(routeForNode(ego.data!.center!) as never)}
                style={[styles.openBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.openText, { color: theme.primary }]}>Open</Text>
              </Pressable>
            ) : null}
          </View>

          {ego.data.first_degree_overflow ? (
            <Warn theme={theme}>
              More than {ego.data.max_nodes} direct connections — showing the {ego.data.max_nodes - 1} most
              connected. Open the item to see everything.
            </Warn>
          ) : ego.data.truncated ? (
            <Warn theme={theme}>Lots of connections — showing direct ones only to keep it readable.</Warn>
          ) : null}

          <NodeGraph data={ego.data} onSelectNode={(n) => setCenter(n.id)} />

          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Tap a node to explore from there · pinch to zoom · drag to pan
          </Text>
        </>
      )}
    </View>
  );
}

function Warn({ theme, children }: { theme: ReturnType<typeof useTheme>; children: React.ReactNode }) {
  return (
    <View style={[styles.warn, { backgroundColor: theme.backgroundElement }]}>
      <Ionicons name="information-circle-outline" size={16} color={theme.warning} />
      <Text style={[styles.warnText, { color: theme.textSecondary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 15 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  headerMain: { flex: 1, gap: 2 },
  centerLabel: { fontSize: 20, fontWeight: '700' },
  sub: { fontSize: 13 },
  openBtn: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  openText: { fontSize: 14, fontWeight: '600' },
  warn: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start', marginHorizontal: Spacing.four, marginTop: Spacing.three, padding: Spacing.three, borderRadius: Radius.md },
  warnText: { flex: 1, fontSize: 13, lineHeight: 18 },
  hint: { fontSize: 12, textAlign: 'center', paddingVertical: Spacing.three },
});
