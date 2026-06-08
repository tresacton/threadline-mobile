import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { ENRICHMENT_LEVEL_OPTIONS } from '@/constants/options';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Onboarding, Options, Settings } from '@/lib/api/endpoints';
import type { OptionItem } from '@/lib/api/types';

const toChoices = (items: OptionItem[] | undefined) =>
  (items ?? []).map((i) => ({ value: i.id, label: i.name }));

export default function OnboardingScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const options = useQuery({ queryKey: ['options'], queryFn: Options.get });
  const settings = useQuery({ queryKey: ['settings'], queryFn: Settings.get });

  const [companionName, setCompanionName] = useState('');
  const [styleId, setStyleId] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [frequencyId, setFrequencyId] = useState<number | null>(null);
  const [enrichment, setEnrichment] = useState<string>('practical');

  useEffect(() => {
    const s = settings.data?.settings;
    if (!s) return;
    setCompanionName(s.companion_name || 'Kinora');
    setStyleId(s.companion_style_id);
    setFocusId(s.help_focus_id);
    setFrequencyId(s.notification_frequency_id);
    setEnrichment(s.enrichment_level || 'practical');
  }, [settings.data]);

  const complete = useMutation({
    mutationFn: () =>
      Onboarding.complete({
        companion_name: companionName.trim() || 'Kinora',
        companion_style_id: styleId,
        help_focus_id: focusId,
        notification_frequency_id: frequencyId,
        enrichment_level: enrichment,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      router.replace('/(app)/(tabs)');
    },
    onError: (e) => Alert.alert('Could not save', humanizeError(e)),
  });

  if (options.isLoading || settings.isLoading) return <LoadingView />;
  if (options.error) return <ErrorView error={options.error} onRetry={() => options.refetch()} />;

  return (
    <Screen scroll contentStyle={{ gap: Spacing.five }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.hero}>
        <Text style={[styles.brand, { color: theme.primary }]}>Welcome to Threadline</Text>
        <Text style={[styles.tagline, { color: theme.textSecondary }]}>
          A few quick choices to set the tone. You can change any of these later in Settings.
        </Text>
      </View>

      <TextField
        label="What should your companion be called?"
        value={companionName}
        onChangeText={setCompanionName}
        placeholder="Kinora"
      />

      {options.data && options.data.companion_styles.length > 0 ? (
        <Select label="Companion style" value={styleId} options={toChoices(options.data.companion_styles)} onChange={setStyleId} />
      ) : null}

      {options.data && options.data.help_focuses.length > 0 ? (
        <Select label="What would you like help with?" value={focusId} options={toChoices(options.data.help_focuses)} onChange={setFocusId} />
      ) : null}

      {options.data && options.data.notification_frequencies.length > 0 ? (
        <Select
          label="How often may we prompt you?"
          value={frequencyId}
          options={toChoices(options.data.notification_frequencies)}
          onChange={setFrequencyId}
        />
      ) : null}

      <Select
        label="How much should the companion ask to enrich what you share?"
        value={enrichment}
        options={ENRICHMENT_LEVEL_OPTIONS}
        onChange={setEnrichment}
      />

      <Text style={[styles.note, { color: theme.textMuted }]}>
        Your content isn’t used to train models. Sensitive memories are kept out of voice-call context.
      </Text>

      <Button label="Start capturing" onPress={() => complete.mutate()} loading={complete.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: Spacing.two, marginTop: Spacing.five },
  brand: { fontSize: 26, fontWeight: '700' },
  tagline: { fontSize: 15, lineHeight: 22 },
  note: { fontSize: 13, lineHeight: 18 },
});
