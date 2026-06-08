import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { People } from '@/lib/api/endpoints';

export default function EditPersonScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = Number(id);
  const person = useQuery({ queryKey: ['person', personId], queryFn: () => People.get(personId) });

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [notes, setNotes] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [placeRel, setPlaceRel] = useState('');

  useEffect(() => {
    if (!person.data) return;
    setName(person.data.name);
    setRelationship(person.data.relationship_label ?? '');
    setNotes(person.data.notes ?? '');
  }, [person.data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['people'] });
    qc.invalidateQueries({ queryKey: ['person', personId] });
  };

  const save = useMutation({
    mutationFn: () =>
      People.update(personId, { name: name.trim(), relationship_label: relationship.trim(), notes: notes.trim() }),
    onSuccess: () => {
      invalidate();
      router.back();
    },
    onError: (e) => Alert.alert('Could not save', humanizeError(e)),
  });

  const remove = useMutation({
    mutationFn: () => People.remove(personId),
    onSuccess: () => {
      invalidate();
      router.back();
    },
  });

  const linkPlace = useMutation({
    mutationFn: () => People.linkPlace(personId, placeName.trim(), placeRel.trim() || undefined),
    onSuccess: () => {
      setPlaceName('');
      setPlaceRel('');
      invalidate();
    },
    onError: (e) => Alert.alert('Could not link place', humanizeError(e)),
  });

  const unlinkPlace = useMutation({
    mutationFn: (linkId: number) => People.unlinkPlace(personId, linkId),
    onSuccess: invalidate,
  });

  const confirmDelete = () =>
    Alert.alert('Delete person', 'Remove this person? Memories that mention them stay.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  if (person.isLoading) return <LoadingView />;
  if (person.error || !person.data) return <ErrorView error={person.error} onRetry={() => person.refetch()} />;

  const p = person.data;

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <Stack.Screen options={{ headerShown: true, title: 'Person' }} />
      <TextField label="Name" value={name} onChangeText={setName} />
      <TextField label="Relationship" value={relationship} onChangeText={setRelationship} placeholder="e.g. sister" />
      <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Anything to remember" multiline style={styles.area} />
      <Button label="Save" onPress={() => save.mutate()} loading={save.isPending} />

      <Text style={[styles.section, { color: theme.text }]}>Places</Text>
      {(p.linked_places ?? []).length === 0 ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>No places linked yet (e.g. where they lived).</Text>
      ) : (
        (p.linked_places ?? []).map((lp) => (
          <Card key={lp.id} style={styles.linkRow}>
            <View style={styles.flex}>
              <Text style={[styles.linkTitle, { color: theme.text }]}>{lp.place_name}</Text>
              {lp.relationship_label ? (
                <Text style={[styles.hint, { color: theme.textMuted }]}>{lp.relationship_label}</Text>
              ) : null}
            </View>
            <Pressable onPress={() => unlinkPlace.mutate(lp.id)} hitSlop={8}>
              <Text style={[styles.unlink, { color: theme.danger }]}>Unlink</Text>
            </Pressable>
          </Card>
        ))
      )}
      <Card style={styles.linkForm}>
        <TextField label="Link a place" value={placeName} onChangeText={setPlaceName} placeholder="Place name" />
        <TextField value={placeRel} onChangeText={setPlaceRel} placeholder="Relationship (e.g. lived here)" />
        <Button
          label="Link place"
          variant="secondary"
          onPress={() => {
            if (!placeName.trim()) return Alert.alert('Enter a place name');
            linkPlace.mutate();
          }}
          loading={linkPlace.isPending}
        />
      </Card>

      <Text style={[styles.section, { color: theme.text }]}>Memories</Text>
      {(p.memories ?? []).length === 0 ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>No memories reference this person yet.</Text>
      ) : (
        (p.memories ?? []).map((m) => (
          <Card key={m.id} onPress={() => router.push(`/memory/${m.id}`)} style={styles.memRow}>
            <Text style={[styles.linkTitle, { color: theme.primary }]} numberOfLines={1}>
              {m.title || 'Untitled memory'}
            </Text>
            {m.date_label ? <Text style={[styles.hint, { color: theme.textMuted }]}>{m.date_label}</Text> : null}
          </Card>
        ))
      )}

      <Button label="View connections" variant="secondary" onPress={() => router.push(`/graph/person/${personId}`)} />
      <Button label="Delete person" variant="danger" onPress={confirmDelete} loading={remove.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  area: { minHeight: 90, textAlignVertical: 'top' },
  section: { fontSize: 16, fontWeight: '700', marginTop: Spacing.two },
  hint: { fontSize: 14 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  linkTitle: { fontSize: 15, fontWeight: '500' },
  unlink: { fontSize: 14, fontWeight: '600' },
  linkForm: { gap: Spacing.three },
  memRow: { gap: 2 },
});
