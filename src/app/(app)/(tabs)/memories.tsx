import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/states';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Memories } from '@/lib/api/endpoints';
import type { Memory } from '@/lib/api/types';

export default function MemoriesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const trimmed = query.trim();

  const all = useQuery({ queryKey: ['memories'], queryFn: Memories.list });
  const search = useQuery({
    queryKey: ['memories', 'search', trimmed],
    queryFn: () => Memories.search(trimmed),
    enabled: trimmed.length > 1,
  });

  const searching = trimmed.length > 1;
  const list = searching ? search.data : all.data;
  const loading = searching ? search.isLoading : all.isLoading;
  const error = searching ? search.error : all.error;

  return (
    <View style={[styles.flex, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.three }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Memories</Text>
        <Pressable onPress={() => router.push('/capture')} hitSlop={10}>
          <Ionicons name="add-circle" size={30} color={theme.primary} />
        </Pressable>
      </View>
      <View style={styles.searchWrap}>
        <TextField
          placeholder="Search your memories"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <LoadingView />
      ) : error ? (
        <ErrorView error={error} onRetry={() => (searching ? search.refetch() : all.refetch())} />
      ) : !list || list.length === 0 ? (
        <EmptyState
          title={searching ? 'No matches' : 'No memories yet'}
          body={searching ? 'Try different words.' : 'Tap + to capture your first memory.'}
        />
      ) : (
        <FlatList contentInsetAdjustmentBehavior="never"
          data={list}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <MemoryRow memory={item} />}
        />
      )}
    </View>
  );
}

function MemoryRow({ memory }: { memory: Memory }) {
  const theme = useTheme();
  return (
    <Card onPress={() => router.push(`/memory/${memory.id}`)} style={styles.row}>
      <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
        {memory.title || 'Untitled memory'}
      </Text>
      {memory.date_label ? (
        <Text style={[styles.rowMeta, { color: theme.textMuted }]}>{memory.date_label}</Text>
      ) : null}
      {memory.structured_body ? (
        <Text style={[styles.rowBody, { color: theme.textSecondary }]} numberOfLines={2}>
          {memory.structured_body}
        </Text>
      ) : null}
      {memory.tags.length > 0 ? (
        <View style={styles.tags}>
          {memory.tags.slice(0, 4).map((t) => (
            <View key={t} style={[styles.tag, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.tagText, { color: theme.textSecondary }]}>{t}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four },
  title: { fontSize: 28, fontWeight: '700' },
  searchWrap: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  listContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.eight, gap: Spacing.three },
  row: { gap: Spacing.one },
  rowTitle: { fontSize: 17, fontWeight: '600' },
  rowMeta: { fontSize: 13 },
  rowBody: { fontSize: 14, lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  tag: { borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: 3 },
  tagText: { fontSize: 12 },
});
