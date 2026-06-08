import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Captures } from '@/lib/api/endpoints';
import { timeAgo } from '@/lib/format';

export default function DraftsScreen() {
  const theme = useTheme();
  const drafts = useQuery({ queryKey: ['drafts'], queryFn: Captures.pending });

  // Re-check when returning (e.g. after approving one on the review screen).
  useFocusEffect(useCallback(() => void drafts.refetch(), [drafts]));

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Drafts to review' }} />
      {drafts.isLoading ? (
        <LoadingView />
      ) : drafts.error ? (
        <ErrorView error={drafts.error} onRetry={() => drafts.refetch()} />
      ) : !drafts.data || drafts.data.length === 0 ? (
        <EmptyState
          title="Nothing to review"
          body="Memories you draft in chat but haven't saved yet will wait here."
        />
      ) : (
        <FlatList
          data={drafts.data}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={[styles.intro, { color: theme.textMuted }]}>
              Drafts you started (often in chat) that aren’t saved as memories yet.
            </Text>
          }
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/review/${item.id}`)} style={styles.row}>
              <Text style={[styles.text, { color: theme.text }]} numberOfLines={3}>
                {item.raw_text}
              </Text>
              <View style={styles.metaRow}>
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  {item.candidate_count ? `${item.candidate_count} suggested · ` : ''}
                  {timeAgo(item.created_at)}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: Spacing.four, gap: Spacing.three },
  intro: { fontSize: 13, lineHeight: 18, marginBottom: Spacing.one },
  row: { gap: Spacing.two },
  text: { fontSize: 15, lineHeight: 21 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { fontSize: 12 },
});
