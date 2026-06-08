import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { LoadingView } from '@/components/ui/states';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Notifications, OpenThreads, Settings } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth/AuthContext';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const settings = useQuery({ queryKey: ['settings'], queryFn: Settings.get });
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: Notifications.list });
  const threads = useQuery({ queryKey: ['open_threads'], queryFn: () => OpenThreads.list() });

  const companion = settings.data?.settings.companion_name ?? user?.companion_name ?? 'your companion';
  const entitlement = settings.data?.entitlement;

  if (settings.isLoading) return <LoadingView />;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.four }]}
    >
      <Text style={[styles.hello, { color: theme.text }]}>Hello{user?.display_name ? `, ${user.display_name}` : ''}.</Text>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>
        {companion} is here whenever you want to remember something.
      </Text>

      <View style={styles.quickGrid}>
        <QuickAction icon="add-circle-outline" label="New memory" onPress={() => router.push('/capture')} />
        <QuickAction icon="chatbubbles-outline" label="Talk it through" onPress={() => router.push('/(app)/(tabs)/chat')} />
        <QuickAction icon="git-branch-outline" label="Open threads" onPress={() => router.push('/threads')} badge={threads.data?.length} />
        <QuickAction icon="time-outline" label="Timeline" onPress={() => router.push('/timeline')} />
      </View>

      {notifications.data && notifications.data.unseen_count > 0 ? (
        <Card onPress={() => router.push('/notifications')} style={styles.notif}>
          <View style={styles.notifRow}>
            <Ionicons name="notifications" size={20} color={theme.accent} />
            <Text style={[styles.notifText, { color: theme.text }]}>
              {notifications.data.unseen_count} new notification{notifications.data.unseen_count === 1 ? '' : 's'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </View>
        </Card>
      ) : null}

      {entitlement ? (
        <Card style={styles.plan}>
          <Text style={[styles.planLabel, { color: theme.textSecondary }]}>Your plan</Text>
          <Text style={[styles.planName, { color: theme.text }]}>{entitlement.plan}</Text>
          {entitlement.ai_tokens_remaining != null ? (
            <Text style={[styles.planMeta, { color: theme.textMuted }]}>
              {entitlement.ai_tokens_remaining.toLocaleString()} AI tokens left this month
            </Text>
          ) : null}
        </Card>
      ) : null}
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number;
}) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={styles.quick} padded={false}>
      <View style={styles.quickInner}>
        <Ionicons name={icon} size={26} color={theme.primary} />
        <Text style={[styles.quickLabel, { color: theme.text }]}>{label}</Text>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: theme.accent }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.eight },
  hello: { fontSize: 28, fontWeight: '700' },
  sub: { fontSize: 16, lineHeight: 22 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, marginTop: Spacing.two },
  quick: { width: '47%', flexGrow: 1 },
  quickInner: { padding: Spacing.four, gap: Spacing.two, minHeight: 92, justifyContent: 'center' },
  quickLabel: { fontSize: 15, fontWeight: '600' },
  badge: { position: 'absolute', top: Spacing.three, right: Spacing.three, borderRadius: Radius.pill, minWidth: 22, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  notif: {},
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  notifText: { flex: 1, fontSize: 15, fontWeight: '600' },
  plan: { gap: 2 },
  planLabel: { fontSize: 13 },
  planName: { fontSize: 18, fontWeight: '700', textTransform: 'capitalize' },
  planMeta: { fontSize: 13 },
});
