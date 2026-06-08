import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { Places } from '@/lib/api/endpoints';

export default function EditPlaceScreen() {
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const placeId = Number(id);
  const place = useQuery({ queryKey: ['place', placeId], queryFn: () => Places.get(placeId) });

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!place.data) return;
    setName(place.data.name);
    setCity(place.data.city ?? '');
    setNotes(place.data.notes ?? '');
  }, [place.data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['places'] });

  const save = useMutation({
    mutationFn: () => Places.update(placeId, { name: name.trim(), city: city.trim(), notes: notes.trim() }),
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

  const confirmDelete = () =>
    Alert.alert('Delete place', 'Remove this place? Memories that mention it stay.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  if (place.isLoading) return <LoadingView />;
  if (place.error || !place.data) return <ErrorView error={place.error} onRetry={() => place.refetch()} />;

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <Stack.Screen options={{ headerShown: true, title: 'Edit place' }} />
      <TextField label="Name" value={name} onChangeText={setName} />
      <TextField label="City" value={city} onChangeText={setCity} placeholder="City" />
      <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Anything to remember" multiline style={styles.area} />
      <Button label="Save" onPress={() => save.mutate()} loading={save.isPending} />
      <Button label="Delete place" variant="danger" onPress={confirmDelete} loading={remove.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  area: { minHeight: 90, textAlignVertical: 'top' },
});
