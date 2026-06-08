import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { BODY_SOURCE_OPTIONS, ENRICHMENT_LEVEL_OPTIONS } from '@/constants/options';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { API_BASE_URL } from '@/lib/api/config';
import { Account, Entitlements, Options, Settings } from '@/lib/api/endpoints';
import type { OptionItem } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/AuthContext';

const POLICIES: { slug: string; label: string }[] = [
  { slug: 'privacy', label: 'Privacy' },
  { slug: 'terms', label: 'Terms' },
  { slug: 'ai_disclosure', label: 'AI disclosure' },
  { slug: 'safety', label: 'Safety' },
  { slug: 'data_controls', label: 'Data controls' },
  { slug: 'subprocessors', label: 'Subprocessors' },
];

const toChoices = (items: OptionItem[] | undefined) => (items ?? []).map((i) => ({ value: i.id, label: i.name }));
const fmt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString());

export default function SettingsScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { biometricEnabled, biometricAvailable, biometricLabel, lockNow, setBiometricEnabled, logout } = useAuth();
  const settings = useQuery({ queryKey: ['settings'], queryFn: Settings.get });
  const options = useQuery({ queryKey: ['options'], queryFn: Options.get });
  const entitlement = useQuery({ queryKey: ['entitlement'], queryFn: Entitlements.get });

  const [displayName, setDisplayName] = useState('');
  const [companionName, setCompanionName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [bodySource, setBodySource] = useState<string>('ai');
  const [enrichmentLevel, setEnrichmentLevel] = useState<string>('practical');
  const [styleId, setStyleId] = useState<number | null>(null);
  const [freqId, setFreqId] = useState<number | null>(null);
  const [voiceModeId, setVoiceModeId] = useState<number | null>(null);

  useEffect(() => {
    if (!settings.data) return;
    const s = settings.data.settings;
    setDisplayName(s.display_name ?? '');
    setCompanionName(s.companion_name);
    setTimezone(s.timezone ?? '');
    setBodySource(s.default_memory_body_source);
    setEnrichmentLevel(s.enrichment_level);
    setStyleId(s.companion_style_id);
    setFreqId(s.notification_frequency_id);
    setVoiceModeId(s.default_voice_call_mode_id);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () =>
      Settings.update({
        display_name: displayName.trim(),
        companion_name: companionName.trim(),
        timezone: timezone.trim(),
        default_memory_body_source: bodySource,
        enrichment_level: enrichmentLevel,
        companion_style_id: styleId,
        notification_frequency_id: freqId,
        default_voice_call_mode_id: voiceModeId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      Alert.alert('Saved', 'Your settings were updated.');
    },
    onError: (e) => Alert.alert('Could not save', humanizeError(e)),
  });

  const destroy = useMutation({
    mutationFn: Account.destroy,
    onSuccess: async () => {
      await logout();
      router.replace('/(auth)/login');
    },
    onError: (e) => Alert.alert('Could not delete account', humanizeError(e)),
  });

  const confirmDelete = () =>
    Alert.alert('Delete your account', 'This permanently deletes your account and all your data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete everything', style: 'destructive', onPress: () => destroy.mutate() },
    ]);

  const openWeb = (path: string) => Linking.openURL(`${API_BASE_URL}${path}`);

  if (settings.isLoading) return <LoadingView />;
  if (settings.error) return <ErrorView error={settings.error} onRetry={() => settings.refetch()} />;

  const ent = entitlement.data;

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: true, title: 'Settings' }} />

      <View style={styles.group}>
        <TextField label="Your name" value={displayName} onChangeText={setDisplayName} placeholder="Display name" />
        <TextField label="Companion name" value={companionName} onChangeText={setCompanionName} />
        <TextField label="Timezone" value={timezone} onChangeText={setTimezone} placeholder="e.g. Australia/Sydney" autoCapitalize="none" />
        {options.data && options.data.companion_styles.length > 0 ? (
          <Select label="Companion style" value={styleId} options={toChoices(options.data.companion_styles)} onChange={setStyleId} />
        ) : null}
        {options.data && options.data.notification_frequencies.length > 0 ? (
          <Select label="Notifications" value={freqId} options={toChoices(options.data.notification_frequencies)} onChange={setFreqId} />
        ) : null}
        {options.data && options.data.voice_call_modes.length > 0 ? (
          <Select label="Default voice-call mode" value={voiceModeId} options={toChoices(options.data.voice_call_modes)} onChange={setVoiceModeId} />
        ) : null}
        <Select label="Memory wording" value={bodySource} options={BODY_SOURCE_OPTIONS} onChange={setBodySource} />
        <Select label="How much the companion prompts you" value={enrichmentLevel} options={ENRICHMENT_LEVEL_OPTIONS} onChange={setEnrichmentLevel} />
        <Button label="Save" onPress={() => save.mutate()} loading={save.isPending} />
      </View>

      {ent ? (
        <Card style={styles.planCard}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Plan & usage</Text>
          <Row label="Plan" value={ent.plan_name || ent.plan} theme={theme} />
          <Row label="Monthly AI allowance" value={fmt(ent.ai_monthly_token_budget)} theme={theme} />
          <Row label="Used this month" value={fmt(ent.ai_tokens_used)} theme={theme} />
          <Row label="Remaining" value={fmt(ent.ai_tokens_remaining)} theme={theme} />
          <Text style={[styles.hint, { color: theme.textMuted }]}>Payments aren’t enabled yet. Your plan is managed by Threadline.</Text>
        </Card>
      ) : null}

      <Card style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text style={[styles.switchLabel, { color: theme.text }]}>Unlock with {biometricLabel}</Text>
          <Text style={[styles.switchHint, { color: theme.textMuted }]}>
            {biometricAvailable
              ? `Require ${biometricLabel} after the app has been in the background for 5 minutes.`
              : `Not available on this device (no biometrics enrolled).`}
          </Text>
        </View>
        <Switch value={biometricEnabled} onValueChange={(v) => setBiometricEnabled(v)} disabled={!biometricAvailable} />
      </Card>
      {biometricAvailable && biometricEnabled ? (
        <Button label={`Lock now (test ${biometricLabel})`} variant="ghost" onPress={lockNow} />
      ) : null}

      <View style={styles.group}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Your data</Text>
        <LinkRow icon="download-outline" label="Export your data" onPress={() => router.push('/exports')} theme={theme} />
        <LinkRow icon="key-outline" label="Change email or password (web)" onPress={() => openWeb('/users/edit')} theme={theme} />
      </View>

      <View style={styles.group}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Policies</Text>
        {POLICIES.map((p) => (
          <LinkRow key={p.slug} icon="document-text-outline" label={p.label} onPress={() => openWeb(`/policies/${p.slug}`)} theme={theme} />
        ))}
      </View>

      <View style={styles.danger}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Danger zone</Text>
        <Button label="Delete account" variant="danger" onPress={confirmDelete} loading={destroy.isPending} />
      </View>
    </Screen>
  );
}

function Row({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.planRow}>
      <Text style={[styles.planLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.planValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={20} color={theme.primary} />
      <Text style={[styles.linkLabel, { color: theme.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.three, marginBottom: Spacing.five },
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  planCard: { gap: Spacing.two, marginBottom: Spacing.five },
  planRow: { flexDirection: 'row', justifyContent: 'space-between' },
  planLabel: { fontSize: 14 },
  planValue: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 12, marginTop: Spacing.one },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginBottom: Spacing.three },
  switchText: { flex: 1, gap: 2 },
  switchLabel: { fontSize: 16, fontWeight: '600' },
  switchHint: { fontSize: 13 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  linkLabel: { flex: 1, fontSize: 16 },
  danger: { marginTop: Spacing.three, gap: Spacing.three },
});
