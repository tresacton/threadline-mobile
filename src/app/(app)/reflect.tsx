import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import { Reflections } from '@/lib/api/endpoints';

export default function ReflectScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const reflections = useQuery({ queryKey: ['reflections'], queryFn: Reflections.list });
  const [question, setQuestion] = useState('');

  const generate = useMutation({
    mutationFn: () => Reflections.create(question.trim()),
    onSuccess: () => {
      setQuestion('');
      qc.invalidateQueries({ queryKey: ['reflections'] });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'crisis') {
        Alert.alert('Before we go on', 'It sounds like things are really hard right now. Please reach out to someone you trust or a crisis line — you deserve support.');
      } else {
        Alert.alert('Could not reflect', humanizeError(e));
      }
    },
  });

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Reflect' }} />
      <View style={styles.form}>
        <Text style={[styles.lead, { color: theme.textSecondary }]}>
          A gentle, AI-assisted look at patterns across your memories. Ask something open.
        </Text>
        <TextField
          value={question}
          onChangeText={setQuestion}
          placeholder="e.g. What patterns show up in how I handle change?"
          multiline
          style={styles.area}
        />
        <Button
          label="Reflect"
          onPress={() => {
            if (question.trim().length < 4) return Alert.alert('Ask a little more', 'Pose a question to reflect on.');
            generate.mutate();
          }}
          loading={generate.isPending}
        />
      </View>

      {reflections.isLoading ? (
        <LoadingView />
      ) : reflections.error ? (
        <ErrorView error={reflections.error} onRetry={() => reflections.refetch()} />
      ) : !reflections.data || reflections.data.length === 0 ? (
        <EmptyState title="No reflections yet" body="Your reflections will gather here." />
      ) : (
        <FlatList
          data={reflections.data}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.row}>
              {item.title ? <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text> : null}
              {item.body ? (
                <Text style={[styles.body, { color: theme.textSecondary }]} selectable>
                  {item.body}
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
  lead: { fontSize: 14, lineHeight: 20 },
  area: { minHeight: 70, textAlignVertical: 'top' },
  list: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.eight, gap: Spacing.three },
  row: { gap: Spacing.two },
  title: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22 },
});
