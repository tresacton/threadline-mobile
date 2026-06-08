import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Memories } from '@/lib/api/endpoints';

export default function CaptureScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => Memories.create({ raw_text: text.trim() }),
    onSuccess: (memory) => {
      qc.invalidateQueries({ queryKey: ['memories'] });
      router.replace(`/memory/${memory.id}`);
    },
    onError: (e) => setError(humanizeError(e)),
  });

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: true, title: 'New memory' }} />
      <Text style={[styles.lead, { color: theme.textSecondary }]}>
        Write it in your own words — however much or little you remember. You can shape it afterwards.
      </Text>
      <TextField
        value={text}
        onChangeText={setText}
        placeholder="What happened?"
        multiline
        numberOfLines={8}
        style={styles.area}
        error={error}
        autoFocus
      />
      <Button
        label="Save memory"
        onPress={() => {
          setError(null);
          if (text.trim().length < 2) {
            setError('Write a little more first.');
            return;
          }
          create.mutate();
        }}
        loading={create.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 15, lineHeight: 22, marginBottom: Spacing.four },
  area: { minHeight: 180, textAlignVertical: 'top' },
});
