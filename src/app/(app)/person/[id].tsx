import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
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

  useEffect(() => {
    if (!person.data) return;
    setName(person.data.name);
    setRelationship(person.data.relationship_label ?? '');
    setNotes(person.data.notes ?? '');
  }, [person.data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['people'] });

  const save = useMutation({
    mutationFn: () =>
      People.update(personId, {
        name: name.trim(),
        relationship_label: relationship.trim(),
        notes: notes.trim(),
      }),
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

  const confirmDelete = () =>
    Alert.alert('Delete person', 'Remove this person? Memories that mention them stay.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  if (person.isLoading) return <LoadingView />;
  if (person.error || !person.data) return <ErrorView error={person.error} onRetry={() => person.refetch()} />;

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <Stack.Screen options={{ headerShown: true, title: 'Edit person' }} />
      <TextField label="Name" value={name} onChangeText={setName} />
      <TextField label="Relationship" value={relationship} onChangeText={setRelationship} placeholder="e.g. sister" />
      <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Anything to remember" multiline style={styles.area} />
      {person.data.memory_count != null ? (
        <Text style={{ color: theme.textMuted }}>
          In {person.data.memory_count} {person.data.memory_count === 1 ? 'memory' : 'memories'}
        </Text>
      ) : null}
      <Button label="View connections" variant="secondary" onPress={() => router.push(`/graph/person/${personId}`)} />
      <Button label="Save" onPress={() => save.mutate()} loading={save.isPending} />
      <Button label="Delete person" variant="danger" onPress={confirmDelete} loading={remove.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  area: { minHeight: 90, textAlignVertical: 'top' },
});
