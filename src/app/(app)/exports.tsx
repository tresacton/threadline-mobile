import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ErrorView, LoadingView } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api/client';
import { API_V1 } from '@/lib/api/config';
import * as session from '@/lib/auth/sessionStore';

const FORMAT_LABELS: Record<string, string> = {
  json: 'JSON (everything, machine-readable)',
  markdown_zip: 'Markdown (.zip)',
  obsidian_vault: 'Obsidian vault (.zip)',
  csv: 'Spreadsheet (CSV)',
};

interface ExportRecord {
  id: number;
  export_type: string | null;
  status: string | null;
  byte_size: number | null;
  created_at: string | null;
  completed_at: string | null;
}

interface ExportsPayload {
  export_types: string[];
  exports: ExportRecord[];
}

const humanSize = (bytes: number | null) => {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export default function ExportsScreen() {
  const theme = useTheme();
  const [busy, setBusy] = useState<string | null>(null);

  const exportsQ = useQuery({
    queryKey: ['exports'],
    queryFn: () => api.get<ExportsPayload>('/exports'),
  });

  const download = async (format: string) => {
    setBusy(format);
    try {
      if (!session.hasValidAccess()) await session.refresh();
      const token = session.getAccessToken();
      const target = `${FileSystem.cacheDirectory}threadline-export-${format}-${Date.now()}`;
      const result = await FileSystem.downloadAsync(`${API_V1}/exports/download?export_type=${format}`, target, {
        headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
      });
      if (result.status >= 400) throw new Error(`Export failed (${result.status})`);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri);
      } else {
        Alert.alert('Export ready', `Saved to ${result.uri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: true, title: 'Export your data' }} />
      <Text style={[styles.lead, { color: theme.textSecondary }]}>
        Your data is yours. Export everything — always including your original words — in the format you like.
      </Text>

      {exportsQ.isLoading ? (
        <LoadingView />
      ) : exportsQ.error ? (
        <ErrorView error={exportsQ.error} onRetry={() => exportsQ.refetch()} />
      ) : (
        <View style={styles.list}>
          {(exportsQ.data?.export_types ?? []).map((format) => (
            <Card key={format} style={styles.row}>
              <Text style={[styles.format, { color: theme.text }]}>{FORMAT_LABELS[format] ?? format}</Text>
              <Button
                label="Export"
                variant="secondary"
                fullWidth={false}
                onPress={() => download(format)}
                loading={busy === format}
              />
            </Card>
          ))}

          {(exportsQ.data?.exports ?? []).length > 0 ? (
            <View style={styles.history}>
              <Text style={[styles.historyLabel, { color: theme.textSecondary }]}>Export history</Text>
              {(exportsQ.data?.exports ?? []).map((e) => (
                <Card key={e.id} style={styles.historyRow}>
                  <View style={styles.flex}>
                    <Text style={[styles.format, { color: theme.text }]}>
                      {FORMAT_LABELS[e.export_type ?? ''] ?? e.export_type}
                    </Text>
                    <Text style={[styles.historyMeta, { color: theme.textMuted }]}>
                      {e.status ?? '—'} · {humanSize(e.byte_size)} ·{' '}
                      {e.completed_at || e.created_at
                        ? new Date((e.completed_at || e.created_at) as string).toLocaleDateString()
                        : '—'}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 15, lineHeight: 22, marginBottom: Spacing.four },
  list: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  format: { fontSize: 15, flex: 1 },
  flex: { flex: 1 },
  history: { gap: Spacing.three, marginTop: Spacing.five },
  historyLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  historyRow: { flexDirection: 'row', alignItems: 'center' },
  historyMeta: { fontSize: 13, marginTop: 2 },
});
