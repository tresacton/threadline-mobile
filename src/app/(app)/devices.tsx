import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Devices } from '@/lib/api/endpoints';
import type { Device } from '@/lib/api/types';

export default function DevicesScreen() {
  const theme = useTheme();
  const devices = useQuery({ queryKey: ['devices'], queryFn: Devices.list });

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Signed-in devices' }} />
      {devices.isLoading ? (
        <LoadingView />
      ) : devices.error ? (
        <ErrorView error={devices.error} onRetry={() => devices.refetch()} />
      ) : !devices.data || devices.data.length === 0 ? (
        <EmptyState title="No active sessions" />
      ) : (
        <FlatList contentInsetAdjustmentBehavior="never"
          data={devices.data}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <DeviceRow device={item} />}
        />
      )}
    </View>
  );
}

function DeviceRow({ device }: { device: Device }) {
  const theme = useTheme();
  const qc = useQueryClient();
  const revoke = useMutation({
    mutationFn: () => Devices.revoke(device.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
    onError: (e) => Alert.alert('Could not sign out device', humanizeError(e)),
  });

  return (
    <Card style={styles.card}>
      <View style={styles.main}>
        <Text style={[styles.name, { color: theme.text }]}>
          {device.name} {device.current ? '· this device' : ''}
        </Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          Last used {device.last_used_at ? new Date(device.last_used_at).toLocaleDateString() : 'recently'}
        </Text>
      </View>
      {!device.current ? (
        <Button label="Sign out" variant="ghost" fullWidth={false} onPress={() => revoke.mutate()} loading={revoke.isPending} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: Spacing.four, gap: Spacing.three },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  main: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13 },
});
