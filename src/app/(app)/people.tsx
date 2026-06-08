import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { People } from '@/lib/api/endpoints';

export default function PeopleScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const people = useQuery({ queryKey: ['people'], queryFn: People.list });
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () => People.create({ name: name.trim(), relationship_label: relationship.trim() || undefined }),
    onSuccess: () => {
      setName('');
      setRelationship('');
      qc.invalidateQueries({ queryKey: ['people'] });
    },
    onError: (e) => setError(humanizeError(e)),
  });

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: true, title: 'People' }} />
      <View style={styles.form}>
        <TextField label="Add someone" value={name} onChangeText={setName} placeholder="Name" error={error} />
        <TextField value={relationship} onChangeText={setRelationship} placeholder="Relationship (optional)" />
        <Button
          label="Add person"
          onPress={() => {
            setError(null);
            if (!name.trim()) return setError('Enter a name.');
            add.mutate();
          }}
          loading={add.isPending}
        />
      </View>

      {people.isLoading ? (
        <LoadingView />
      ) : people.error ? (
        <ErrorView error={people.error} onRetry={() => people.refetch()} />
      ) : !people.data || people.data.length === 0 ? (
        <EmptyState title="No people yet" body="Add the people who appear in your memories." />
      ) : (
        <FlatList contentInsetAdjustmentBehavior="never"
          data={people.data}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.row} onPress={() => router.push(`/person/${item.id}`)}>
              <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                {item.relationship_label ? `${item.relationship_label} · ` : ''}
                {item.memory_count ?? 0} {item.memory_count === 1 ? 'memory' : 'memories'}
              </Text>
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
  list: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.eight, gap: Spacing.two },
  row: { gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13 },
});
