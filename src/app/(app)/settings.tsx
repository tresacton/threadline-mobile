import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { BODY_SOURCE_OPTIONS, ENRICHMENT_LEVEL_OPTIONS } from '@/constants/options';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Account, Settings } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth/AuthContext';

export default function SettingsScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { biometricEnabled, setBiometricEnabled, logout } = useAuth();
  const settings = useQuery({ queryKey: ['settings'], queryFn: Settings.get });

  const [displayName, setDisplayName] = useState('');
  const [companionName, setCompanionName] = useState('');
  const [bodySource, setBodySource] = useState<string>('ai');
  const [enrichmentLevel, setEnrichmentLevel] = useState<string>('practical');
  const [trainingOptIn, setTrainingOptIn] = useState(false);

  useEffect(() => {
    if (settings.data) {
      const s = settings.data.settings;
      setDisplayName(s.display_name ?? '');
      setCompanionName(s.companion_name);
      setBodySource(s.default_memory_body_source);
      setEnrichmentLevel(s.enrichment_level);
      setTrainingOptIn(s.training_opt_in);
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () =>
      Settings.update({
        display_name: displayName.trim(),
        companion_name: companionName.trim(),
        default_memory_body_source: bodySource,
        enrichment_level: enrichmentLevel,
        training_opt_in: trainingOptIn,
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
    Alert.alert(
      'Delete your account',
      'This permanently deletes your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete everything', style: 'destructive', onPress: () => destroy.mutate() },
      ],
    );

  if (settings.isLoading) return <LoadingView />;
  if (settings.error) return <ErrorView error={settings.error} onRetry={() => settings.refetch()} />;

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: true, title: 'Settings' }} />

      <View style={styles.group}>
        <TextField label="Your name" value={displayName} onChangeText={setDisplayName} placeholder="Display name" />
        <TextField label="Companion name" value={companionName} onChangeText={setCompanionName} />
        <Select label="Memory wording" value={bodySource} options={BODY_SOURCE_OPTIONS} onChange={setBodySource} />
        <Select label="How much the companion prompts you" value={enrichmentLevel} options={ENRICHMENT_LEVEL_OPTIONS} onChange={setEnrichmentLevel} />
        <Button label="Save" onPress={() => save.mutate()} loading={save.isPending} />
      </View>

      <Card style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text style={[styles.switchLabel, { color: theme.text }]}>Unlock with biometrics</Text>
          <Text style={[styles.switchHint, { color: theme.textMuted }]}>
            Require Face ID / Touch ID to open the app.
          </Text>
        </View>
        <Switch value={biometricEnabled} onValueChange={(v) => setBiometricEnabled(v)} />
      </Card>

      <Card style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text style={[styles.switchLabel, { color: theme.text }]}>Help improve the AI</Text>
          <Text style={[styles.switchHint, { color: theme.textMuted }]}>
            Allow anonymised use of your data for training. Off by default.
          </Text>
        </View>
        <Switch value={trainingOptIn} onValueChange={setTrainingOptIn} />
      </Card>

      <View style={styles.danger}>
        <Text style={[styles.dangerTitle, { color: theme.textSecondary }]}>Danger zone</Text>
        <Button label="Delete account" variant="danger" onPress={confirmDelete} loading={destroy.isPending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.three, marginBottom: Spacing.five },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  switchText: { flex: 1, gap: 2 },
  switchLabel: { fontSize: 16, fontWeight: '600' },
  switchHint: { fontSize: 13 },
  danger: { marginTop: Spacing.seven, gap: Spacing.three },
  dangerTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});
