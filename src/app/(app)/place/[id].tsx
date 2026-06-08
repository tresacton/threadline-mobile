import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Picker } from '@/components/ui/Picker';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Places } from '@/lib/api/endpoints';

export default function EditPlaceScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const placeId = Number(id);
  const place = useQuery({ queryKey: ['place', placeId], queryFn: () => Places.get(placeId) });
  const allPlaces = useQuery({ queryKey: ['places'], queryFn: Places.list });

  const [name, setName] = useState('');
  const [kind, setKind] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!place.data) return;
    const p = place.data;
    setName(p.name);
    setKind(p.place_type ?? '');
    setAddress(p.address_freeform ?? '');
    setCity(p.city ?? '');
    setRegion(p.region ?? '');
    setCountry(p.country ?? '');
    setNotes(p.notes ?? '');
  }, [place.data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['places'] });
    qc.invalidateQueries({ queryKey: ['place', placeId] });
  };

  const save = useMutation({
    mutationFn: () =>
      Places.update(placeId, {
        name: name.trim(),
        place_type: kind.trim(),
        address_freeform: address.trim(),
        city: city.trim(),
        region: region.trim(),
        country: country.trim(),
        notes: notes.trim(),
      }),
    onSuccess: () => {
      invalidate();
      router.back();
    },
    onError: (e) => Alert.alert('Could not save', humanizeError(e)),
  });

  const remove = useMutation({
    mutationFn: () => Places.remove(placeId),
    onSuccess: () => {
      invalidate();
      router.back();
    },
  });

  const merge = useMutation({
    mutationFn: (targetId: number) => Places.merge(placeId, targetId),
    onSuccess: (target) => {
      invalidate();
      router.replace(`/place/${target.id}`);
    },
    onError: (e) => Alert.alert('Could not merge', humanizeError(e)),
  });

  const confirmMerge = (targetId: number, targetName: string) =>
    Alert.alert(
      'Merge place',
      `Everything pointing at "${name}" will move to "${targetName}", and "${name}" will be removed. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Merge', style: 'destructive', onPress: () => merge.mutate(targetId) },
      ],
    );

  const confirmDelete = () =>
    Alert.alert('Delete place', 'Remove this place? Memories that mention it stay.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  if (place.isLoading) return <LoadingView />;
  if (place.error || !place.data) return <ErrorView error={place.error} onRetry={() => place.refetch()} />;

  const p = place.data;
  const others = (allPlaces.data ?? []).filter((x) => x.id !== placeId);

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <Stack.Screen options={{ headerShown: true, title: 'Place' }} />
      <TextField label="Name" value={name} onChangeText={setName} />
      <TextField label="Kind (e.g. home, café, office)" value={kind} onChangeText={setKind} />
      <TextField label="Address" value={address} onChangeText={setAddress} />
      <TextField label="City" value={city} onChangeText={setCity} />
      <TextField label="Region / state" value={region} onChangeText={setRegion} />
      <TextField label="Country" value={country} onChangeText={setCountry} />
      <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Anything to remember" multiline style={styles.area} />
      <Button label="Save" onPress={() => save.mutate()} loading={save.isPending} />

      {(p.connected_people ?? []).length > 0 ? (
        <>
          <Text style={[styles.section, { color: theme.text }]}>People connected here</Text>
          {(p.connected_people ?? []).map((cp) => (
            <Card key={cp.id} onPress={() => router.push(`/person/${cp.id}`)} style={styles.row}>
              <Text style={[styles.rowTitle, { color: theme.primary }]}>{cp.name}</Text>
              {cp.relationship_label ? <Text style={[styles.hint, { color: theme.textMuted }]}>{cp.relationship_label}</Text> : null}
            </Card>
          ))}
        </>
      ) : null}

      {(p.life_periods ?? []).length > 0 ? (
        <>
          <Text style={[styles.section, { color: theme.text }]}>Life periods here</Text>
          {(p.life_periods ?? []).map((lp) => (
            <Card key={lp.id} onPress={() => router.push(`/period/${lp.id}`)} style={styles.row}>
              <Text style={[styles.rowTitle, { color: theme.primary }]}>{lp.name}</Text>
            </Card>
          ))}
        </>
      ) : null}

      <Text style={[styles.section, { color: theme.text }]}>Memories</Text>
      {(p.memories ?? []).length === 0 ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>No memories reference this place yet.</Text>
      ) : (
        (p.memories ?? []).map((m) => (
          <Card key={m.id} onPress={() => router.push(`/memory/${m.id}`)} style={styles.row}>
            <Text style={[styles.rowTitle, { color: theme.primary }]} numberOfLines={1}>
              {m.title || 'Untitled memory'}
            </Text>
            {m.date_label ? <Text style={[styles.hint, { color: theme.textMuted }]}>{m.date_label}</Text> : null}
          </Card>
        ))
      )}

      {others.length > 0 ? (
        <Card style={styles.mergeCard}>
          <Text style={[styles.section, { color: theme.text, marginTop: 0 }]}>Merge into another place</Text>
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Use this to fold a duplicate into the place you want to keep.
          </Text>
          <Picker
            label="Merge into"
            placeholder="Choose a place"
            value={null}
            options={others.map((x) => ({ value: x.id, label: x.name }))}
            onChange={(v) => {
              if (v == null) return;
              const target = others.find((x) => x.id === Number(v));
              if (target) confirmMerge(target.id, target.name);
            }}
          />
        </Card>
      ) : null}

      <Button label="View connections" variant="secondary" onPress={() => router.push(`/graph/place/${placeId}`)} />
      <Button label="Delete place" variant="danger" onPress={confirmDelete} loading={remove.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  area: { minHeight: 90, textAlignVertical: 'top' },
  section: { fontSize: 16, fontWeight: '700', marginTop: Spacing.two },
  hint: { fontSize: 14 },
  row: { gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  mergeCard: { gap: Spacing.three, marginTop: Spacing.two },
});
