import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorView, LoadingView, humanizeError } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Voice } from '@/lib/api/endpoints';
import type { TranscriptSegment } from '@/lib/api/types';

const titleize = (s?: string | null) => (s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null);

export default function VoiceSessionScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);

  const session = useQuery({ queryKey: ['voice_session', sessionId], queryFn: () => Voice.get(sessionId) });

  const promote = useMutation({
    mutationFn: (segmentId: number) => Voice.promoteSegment(sessionId, segmentId),
    onSuccess: (capture) => {
      qc.invalidateQueries({ queryKey: ['voice_session', sessionId] });
      router.push(`/review/${capture.id}`);
    },
    onError: (e) => Alert.alert('Could not save', humanizeError(e)),
  });

  if (session.isLoading) return <LoadingView />;
  if (session.error || !session.data) return <ErrorView error={session.error} onRetry={() => session.refetch()} />;

  const { voice_session: s, transcript_segments: segments } = session.data;

  return (
    <ScrollView contentInsetAdjustmentBehavior="never" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: true, title: `Voice session ${s.id}` }} />
      <Text style={[styles.meta, { color: theme.textMuted }]}>
        {titleize(s.status)}
        {s.segment_count ? ` · ${s.segment_count} segment${s.segment_count === 1 ? '' : 's'}` : ''}
      </Text>
      <Text style={[styles.disclosure, { color: theme.textMuted }]}>
        Transcripts are retained for safety and continuity. You can promote a segment into a memory below.
      </Text>

      {segments.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMuted }]}>No transcript segments.</Text>
      ) : (
        segments.map((seg) => <SegmentCard key={seg.id} seg={seg} onPromote={() => promote.mutate(seg.id)} promoting={promote.isPending} />)
      )}
    </ScrollView>
  );
}

function SegmentCard({ seg, onPromote, promoting }: { seg: TranscriptSegment; onPromote: () => void; promoting: boolean }) {
  const theme = useTheme();
  return (
    <Card style={styles.segment}>
      <Text style={[styles.speaker, { color: theme.textSecondary }]}>
        {titleize(seg.speaker) || 'Speaker'}
        {seg.mode ? ` · ${titleize(seg.mode)}` : ''}
      </Text>
      <Text style={[styles.segmentText, { color: theme.text }]}>{seg.content}</Text>
      {seg.promoted ? (
        <Text style={[styles.promoted, { color: theme.success }]}>Saved as a capture</Text>
      ) : (
        <View style={styles.segmentAction}>
          <Button label="Save as a memory" variant="secondary" fullWidth={false} onPress={onPromote} loading={promoting} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.eight },
  meta: { fontSize: 14 },
  disclosure: { fontSize: 13, lineHeight: 18 },
  empty: { fontSize: 15, marginTop: Spacing.four },
  segment: { gap: Spacing.two },
  speaker: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  segmentText: { fontSize: 15, lineHeight: 22 },
  promoted: { fontSize: 13, fontWeight: '600' },
  segmentAction: { flexDirection: 'row' },
});
