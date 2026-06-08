import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorView, LoadingView } from '@/components/ui/states';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Chat } from '@/lib/api/endpoints';
import type { AiMessage } from '@/lib/api/types';

function newClientToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ConversationScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);

  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<AiMessage>>(null);

  const conversation = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => Chat.get(conversationId),
  });

  useEffect(() => {
    if (conversation.data) setMessages(conversation.data.messages);
  }, [conversation.data]);

  const scrollToEnd = () => requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setDraft('');
    setSending(true);

    // Optimistic user bubble.
    const optimistic: AiMessage = {
      id: -Date.now(),
      role: 'user',
      content,
      kind: 'reply',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToEnd();

    try {
      const turn = await Chat.sendMessage(conversationId, content, newClientToken());
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => m.id !== optimistic.id);
        const next = [...withoutOptimistic, turn.turn.user_message];
        if (turn.turn.assistant_message) next.push(turn.turn.assistant_message);
        return next;
      });
      scrollToEnd();
    } catch {
      // Roll back the optimistic bubble and restore the draft so nothing is lost.
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  if (conversation.isLoading) return <LoadingView />;
  if (conversation.error) return <ErrorView error={conversation.error} onRetry={() => conversation.refetch()} />;

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: true, title: conversation.data?.conversation.title || 'Companion' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={styles.messages}
          onContentSizeChange={scrollToEnd}
          renderItem={({ item }) => <Bubble message={item} />}
        />
        {sending ? (
          <View style={styles.typing}>
            <ActivityIndicator size="small" color={theme.textMuted} />
            <Text style={[styles.typingText, { color: theme.textMuted }]}>Thinking…</Text>
          </View>
        ) : null}
        <View style={[styles.composer, { borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.two, backgroundColor: theme.card }]}>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            value={draft}
            onChangeText={setDraft}
            placeholder="Share a memory or a thought…"
            placeholderTextColor={theme.textMuted}
            multiline
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim() || sending}
            style={[styles.sendBtn, { backgroundColor: theme.primary, opacity: !draft.trim() || sending ? 0.5 : 1 }]}
          >
            <Ionicons name="arrow-up" size={22} color={theme.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({ message }: { message: AiMessage }) {
  const theme = useTheme();
  const isUser = message.role === 'user';
  const isCrisis = message.kind === 'crisis';
  const isAllowance = message.kind === 'allowance';

  const bg = isUser
    ? theme.primary
    : isCrisis
      ? theme.danger
      : isAllowance
        ? theme.warning
        : theme.card;
  const fg = isUser || isCrisis || isAllowance ? '#fff' : theme.text;

  return (
    <View style={[styles.bubbleRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: bg, borderColor: theme.border },
          isUser ? styles.bubbleUser : styles.bubbleOther,
        ]}
      >
        <Text style={[styles.bubbleText, { color: fg }]}>{message.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  messages: { padding: Spacing.four, gap: Spacing.three },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '82%', borderRadius: Radius.lg, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  bubbleUser: { borderBottomRightRadius: Radius.sm },
  bubbleOther: { borderBottomLeftRadius: Radius.sm, borderWidth: StyleSheet.hairlineWidth },
  bubbleText: { fontSize: 16, lineHeight: 22 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  typingText: { fontSize: 13 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, maxHeight: 120, borderRadius: Radius.lg, paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.three, fontSize: 16 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
