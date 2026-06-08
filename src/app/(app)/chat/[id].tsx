import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
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
import type { AiMessage, ConversationExtras } from '@/lib/api/types';

function newClientToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function hasReviewable(extras: ConversationExtras | null): boolean {
  if (!extras) return false;
  return (
    !!extras.proposed_capture ||
    extras.pending_candidates.length > 0 ||
    extras.update_proposals.length > 0
  );
}

export default function ConversationScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);

  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [extras, setExtras] = useState<ConversationExtras | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<AiMessage>>(null);

  const conversation = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => Chat.get(conversationId),
  });

  useEffect(() => {
    if (conversation.data) {
      setMessages(conversation.data.messages);
      setExtras(conversation.data.extras);
    }
  }, [conversation.data]);

  const scrollToEnd = () => requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setDraft('');
    setSending(true);

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
      setExtras(turn.extras);
      scrollToEnd();
    } catch {
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
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <Bubble message={item} />}
        />

        {hasReviewable(extras) ? <ReviewBanner extras={extras!} conversationId={conversationId} /> : null}

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

// When a turn drafts a capture or surfaces proposals, show a tappable banner that
// takes the user to review it — mirroring the web "extras" panel.
function ReviewBanner({ extras, conversationId }: { extras: ConversationExtras; conversationId: number }) {
  const theme = useTheme();

  let label = '';
  let onPress: () => void = () => {};
  if (extras.proposed_capture) {
    const candidateCount = extras.pending_candidates.length;
    label = candidateCount
      ? `I drafted ${candidateCount} possible ${candidateCount === 1 ? 'memory' : 'memories'} — review them`
      : 'I drafted a memory from this — review it';
    const captureId = extras.proposed_capture.id;
    onPress = () => router.push(`/review/${captureId}?from_chat=${conversationId}`);
  } else if (extras.update_proposals.length) {
    const n = extras.update_proposals.length;
    label = `${n} suggested ${n === 1 ? 'addition' : 'additions'} to your memories — review`;
    const memoryId = extras.update_proposals[0].memory_id;
    onPress = () => router.push(`/memory/${memoryId}`);
  }

  return (
    <Pressable onPress={onPress} style={[styles.banner, { backgroundColor: theme.primary }]}>
      <Ionicons name="sparkles" size={18} color={theme.onPrimary} />
      <Text style={[styles.bannerText, { color: theme.onPrimary }]} numberOfLines={2}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={theme.onPrimary} />
    </Pressable>
  );
}

function Bubble({ message }: { message: AiMessage }) {
  const theme = useTheme();
  const isUser = message.role === 'user';
  const isCrisis = message.kind === 'crisis';
  const isAllowance = message.kind === 'allowance';

  const bg = isUser ? theme.primary : isCrisis ? theme.danger : isAllowance ? theme.warning : theme.card;
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
        <Text style={[styles.bubbleText, { color: fg }]} selectable>
          {message.content}
        </Text>
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
  banner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginHorizontal: Spacing.four, marginBottom: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderRadius: Radius.md },
  bannerText: { flex: 1, fontSize: 14, fontWeight: '600' },
  typing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  typingText: { fontSize: 13 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, maxHeight: 120, borderRadius: Radius.lg, paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.three, fontSize: 16 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
