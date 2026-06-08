import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Chat, MemoryUpdateProposals } from '@/lib/api/endpoints';
import type { AiMessage, ConversationExtras, MemoryUpdateProposal } from '@/lib/api/types';

const KEYBOARD_ACCESSORY_ID = 'chatComposerAccessory';

function newClientToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

  const copyMessage = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const copyAll = async () => {
    const transcript = messages
      .map((m) => `${m.role === 'user' ? 'Me' : 'Companion'}: ${m.content}`)
      .join('\n\n');
    await Clipboard.setStringAsync(transcript);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert('Copied', 'The conversation was copied to your clipboard.');
  };

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
      <Stack.Screen
        options={{
          headerShown: true,
          title: conversation.data?.conversation.title || 'Companion',
          headerRight: () =>
            messages.length > 0 ? (
              <Pressable onPress={copyAll} hitSlop={10} style={styles.headerBtn}>
                <Ionicons name="copy-outline" size={22} color={theme.primary} />
              </Pressable>
            ) : null,
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList contentInsetAdjustmentBehavior="never"
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={styles.messages}
          onContentSizeChange={scrollToEnd}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <Bubble message={item} onLongPress={() => copyMessage(item.content)} />}
        />

        {extras && (extras.proposed_capture || extras.pending_candidates.length > 0) ? (
          <ReviewBanner extras={extras} conversationId={conversationId} />
        ) : null}

        {extras && extras.update_proposals.length > 0 ? (
          <ProposalsPanel proposals={extras.update_proposals} onChanged={() => conversation.refetch()} />
        ) : null}

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
            inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
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

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={KEYBOARD_ACCESSORY_ID}>
          <View style={[styles.accessory, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
            <Pressable onPress={() => Keyboard.dismiss()} hitSlop={8}>
              <Text style={[styles.accessoryDone, { color: theme.primary }]}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </View>
  );
}

// When a turn drafts a capture or surfaces proposals, show a tappable banner that
// takes the user to review it — mirroring the web "extras" panel.
function ReviewBanner({ extras, conversationId }: { extras: ConversationExtras; conversationId: number }) {
  const theme = useTheme();

  if (!extras.proposed_capture) return null;
  const candidateCount = extras.pending_candidates.length;
  const label = candidateCount
    ? `I drafted ${candidateCount} possible ${candidateCount === 1 ? 'memory' : 'memories'} — review them`
    : 'I drafted a memory from this — review it';
  const captureId = extras.proposed_capture.id;

  return (
    <Pressable
      onPress={() => router.push(`/review/${captureId}?from_chat=${conversationId}`)}
      style={[styles.banner, { backgroundColor: theme.primary }]}
    >
      <Ionicons name="sparkles" size={18} color={theme.onPrimary} />
      <Text style={[styles.bannerText, { color: theme.onPrimary }]} numberOfLines={2}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={theme.onPrimary} />
    </Pressable>
  );
}

// AI-proposed additions to existing memories, surfaced from the turn. Apply or
// dismiss each inline (mirrors the web extras panel) — or open the memory.
function ProposalsPanel({ proposals, onChanged }: { proposals: MemoryUpdateProposal[]; onChanged: () => void }) {
  const theme = useTheme();
  const apply = useMutation({
    mutationFn: (id: number) => MemoryUpdateProposals.apply(id),
    onSuccess: onChanged,
    onError: (e) => Alert.alert('Could not apply', humanizeError(e)),
  });
  const dismiss = useMutation({
    mutationFn: (id: number) => MemoryUpdateProposals.dismiss(id),
    onSuccess: onChanged,
  });

  return (
    <View style={styles.proposals}>
      {proposals.map((p) => (
        <View key={p.id} style={[styles.proposalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Text style={[styles.proposalTitle, { color: theme.text }]}>
            Suggested addition{p.suggested_title ? ` to “${p.suggested_title}”` : ''}
          </Text>
          {p.rationale ? <Text style={[styles.proposalMeta, { color: theme.textMuted }]}>{p.rationale}</Text> : null}
          {p.suggested_body_addition ? (
            <Text style={[styles.proposalBody, { color: theme.text }]}>{p.suggested_body_addition}</Text>
          ) : null}
          <View style={styles.proposalActions}>
            <Pressable onPress={() => apply.mutate(p.id)} disabled={apply.isPending}>
              <Text style={[styles.proposalAction, { color: theme.primary }]}>Apply</Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/memory/${p.memory_id}`)}>
              <Text style={[styles.proposalAction, { color: theme.textSecondary }]}>Open memory</Text>
            </Pressable>
            <Pressable onPress={() => dismiss.mutate(p.id)} disabled={dismiss.isPending}>
              <Text style={[styles.proposalAction, { color: theme.textMuted }]}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

function Bubble({ message, onLongPress }: { message: AiMessage; onLongPress: () => void }) {
  const theme = useTheme();
  const isUser = message.role === 'user';
  const isCrisis = message.kind === 'crisis';
  const isAllowance = message.kind === 'allowance';

  const bg = isUser ? theme.primary : isCrisis ? theme.danger : isAllowance ? theme.warning : theme.card;
  const fg = isUser || isCrisis || isAllowance ? '#fff' : theme.text;

  return (
    <View style={[styles.bubbleRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={250}
        style={[
          styles.bubble,
          { backgroundColor: bg, borderColor: theme.border },
          isUser ? styles.bubbleUser : styles.bubbleOther,
        ]}
      >
        <Text style={[styles.bubbleText, { color: fg }]} selectable>
          {message.content}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  messages: { padding: Spacing.four, gap: Spacing.three },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '82%', borderRadius: Radius.lg, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  bubbleUser: { borderBottomRightRadius: Radius.sm },
  bubbleOther: { borderBottomLeftRadius: Radius.sm, borderWidth: StyleSheet.hairlineWidth },
  bubbleText: { fontSize: 16, lineHeight: 22 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginHorizontal: Spacing.four, marginBottom: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderRadius: Radius.md },
  bannerText: { flex: 1, fontSize: 14, fontWeight: '600' },
  proposals: { marginHorizontal: Spacing.four, marginBottom: Spacing.two, gap: Spacing.two },
  proposalCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, padding: Spacing.three, gap: 4 },
  proposalTitle: { fontSize: 14, fontWeight: '700' },
  proposalMeta: { fontSize: 12, fontStyle: 'italic' },
  proposalBody: { fontSize: 14, lineHeight: 20 },
  proposalActions: { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.one },
  proposalAction: { fontSize: 14, fontWeight: '600' },
  typing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  typingText: { fontSize: 13 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, maxHeight: 120, borderRadius: Radius.lg, paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.three, fontSize: 16 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  accessory: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  accessoryDone: { fontSize: 16, fontWeight: '600' },
});
