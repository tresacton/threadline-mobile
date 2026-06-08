import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/AuthContext';

interface Item {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
}

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: 'Your life',
    items: [
      { icon: 'people-outline', label: 'People', route: '/people' },
      { icon: 'location-outline', label: 'Places', route: '/places' },
      { icon: 'time-outline', label: 'Timeline', route: '/timeline' },
      { icon: 'git-branch-outline', label: 'Open threads', route: '/threads' },
    ],
  },
  {
    title: 'Reconstruct',
    items: [
      { icon: 'flag-outline', label: 'Goals', route: '/goals' },
      { icon: 'briefcase-outline', label: 'Find past jobs', route: '/jobs' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: 'settings-outline', label: 'Settings', route: '/settings' },
      { icon: 'phone-portrait-outline', label: 'Signed-in devices', route: '/devices' },
      { icon: 'download-outline', label: 'Export your data', route: '/exports' },
    ],
  },
];

export default function MoreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.four }]}
    >
      <Text style={[styles.title, { color: theme.text }]}>More</Text>
      {user ? <Text style={[styles.email, { color: theme.textMuted }]}>{user.email}</Text> : null}

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{section.title}</Text>
          <Card padded={false}>
            {section.items.map((item, i) => (
              <Row key={item.route} item={item} last={i === section.items.length - 1} />
            ))}
          </Card>
        </View>
      ))}

      <View style={styles.section}>
        <Card padded={false}>
          <Row
            item={{ icon: 'log-out-outline', label: 'Sign out', route: '' }}
            last
            danger
            onPress={logout}
          />
        </Card>
      </View>
    </ScrollView>
  );
}

function Row({
  item,
  last,
  danger,
  onPress,
}: {
  item: Item;
  last: boolean;
  danger?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <View>
      <View style={styles.rowWrap}>
        <Ionicons name={item.icon} size={22} color={danger ? theme.danger : theme.primary} />
        <Text
          style={[styles.rowLabel, { color: danger ? theme.danger : theme.text }]}
          onPress={onPress ?? (() => router.push(item.route as never))}
          suppressHighlighting
        >
          {item.label}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </View>
      {!last ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.eight },
  title: { fontSize: 28, fontWeight: '700' },
  email: { fontSize: 14, marginTop: -Spacing.three },
  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: Spacing.two },
  rowWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.four, paddingVertical: Spacing.four },
  rowLabel: { flex: 1, fontSize: 16 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
});
