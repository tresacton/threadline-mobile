import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { EmptyState, ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Places, Residencies } from '@/lib/api/endpoints';

export default function ResidenciesScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const residencies = useQuery({ queryKey: ['residencies'], queryFn: Residencies.list });
  const places = useQuery({ queryKey: ['places'], queryFn: Places.list });
  const [placeId, setPlaceId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () => Residencies.create({ place_id: placeId! }),
    onSuccess: () => {
      setPlaceId(null);
      qc.invalidateQueries({ queryKey: ['residencies'] });
    },
    onError: (e) => setError(humanizeError(e)),
  });

  const placeName = (id: number) => places.data?.find((p) => p.id === id)?.name ?? `Place #${id}`;

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Residences' }} />
      <View style={styles.form}>
        {places.data && places.data.length > 0 ? (
          <>
            <Select
              label="Add a residence — choose a place"
              value={placeId}
              options={places.data.map((p) => ({ value: p.id, label: p.name }))}
              onChange={(v) => setPlaceId(Number(v))}
            />
            {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
            <Button
              label="Add residence"
              onPress={() => {
                setError(null);
                if (!placeId) return setError('Pick a place first.');
                add.mutate();
              }}
              loading={add.isPending}
              disabled={!placeId}
            />
          </>
        ) : (
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Add a place first (under Places), then you can record living there.
          </Text>
        )}
      </View>

      {residencies.isLoading ? (
        <LoadingView />
      ) : residencies.error ? (
        <ErrorView error={residencies.error} onRetry={() => residencies.refetch()} />
      ) : !residencies.data || residencies.data.length === 0 ? (
        <EmptyState title="No residences yet" body="Record where you've lived to reconstruct prior addresses." />
      ) : (
        <FlatList
          data={residencies.data}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.row} onPress={() => router.push(`/residency/${item.id}`)}>
              <Text style={[styles.name, { color: theme.text }]}>{item.place_name ?? placeName(item.place_id)}</Text>
              {item.date_range_start || item.date_range_end ? (
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  {item.date_range_start ?? '?'} – {item.date_range_end ?? 'present'}
                </Text>
              ) : null}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { padding: Spacing.four, gap: Spacing.three },
  hint: { fontSize: 14, lineHeight: 20 },
  list: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.eight, gap: Spacing.two },
  row: { gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13 },
});
