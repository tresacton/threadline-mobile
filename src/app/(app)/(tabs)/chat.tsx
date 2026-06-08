import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Chat } from '@/lib/api/endpoints';

export default function ChatListScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const conversations = useQuery({ queryKey: ['conversations'], queryFn: Chat.list });

  const startChat = useMutation({
    mutationFn: () => Chat.create(),
    onSuccess: (conversation) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      router.push(`/chat/${conversation.id}`);
    },
  });

  return (
    <View style={[styles.flex, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.three }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Companion</Text>
        <Pressable onPress={() => startChat.mutate()} hitSlop={10} disabled={startChat.isPending}>
          <Ionicons name="create-outline" size={28} color={theme.primary} />
        </Pressable>
      </View>

      {conversations.isLoading ? (
        <LoadingView />
      ) : conversations.error ? (
        <ErrorView error={conversations.error} onRetry={() => conversations.refetch()} />
      ) : !conversations.data || conversations.data.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState title="No conversations yet" body="Start a chat to talk through a memory." />
          <Pressable
            style={[styles.cta, { backgroundColor: theme.primary }]}
            onPress={() => startChat.mutate()}
          >
            <Text style={styles.ctaText}>Start a conversation</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={conversations.data}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/chat/${item.id}`)} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                  {item.title || 'Chat'}
                </Text>
                {item.mode ? (
                  <Text style={[styles.rowMeta, { color: theme.textMuted }]}>{item.mode}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingBottom: Spacing.three },
  title: { fontSize: 28, fontWeight: '700' },
  list: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.eight, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowMeta: { fontSize: 13, textTransform: 'capitalize' },
  empty: { flex: 1, justifyContent: 'center', gap: Spacing.four },
  cta: { marginHorizontal: Spacing.six, paddingVertical: Spacing.four, borderRadius: 12, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
