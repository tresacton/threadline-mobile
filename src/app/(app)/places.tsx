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
import { Places } from '@/lib/api/endpoints';

export default function PlacesScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const places = useQuery({ queryKey: ['places'], queryFn: Places.list });
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () => Places.create({ name: name.trim(), city: city.trim() || undefined }),
    onSuccess: () => {
      setName('');
      setCity('');
      qc.invalidateQueries({ queryKey: ['places'] });
    },
    onError: (e) => setError(humanizeError(e)),
  });

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Places' }} />
      <View style={styles.form}>
        <TextField label="Add a place" value={name} onChangeText={setName} placeholder="Name" error={error} />
        <TextField value={city} onChangeText={setCity} placeholder="City (optional)" />
        <Button
          label="Add place"
          onPress={() => {
            setError(null);
            if (!name.trim()) return setError('Enter a name.');
            add.mutate();
          }}
          loading={add.isPending}
        />
      </View>

      {places.isLoading ? (
        <LoadingView />
      ) : places.error ? (
        <ErrorView error={places.error} onRetry={() => places.refetch()} />
      ) : !places.data || places.data.length === 0 ? (
        <EmptyState title="No places yet" body="Add the places your memories happened." />
      ) : (
        <FlatList
          data={places.data}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.row} onPress={() => router.push(`/place/${item.id}`)}>
              <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
              {item.city ? <Text style={[styles.meta, { color: theme.textMuted }]}>{item.city}</Text> : null}
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
