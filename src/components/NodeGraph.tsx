import { useMemo, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import type { EgoGraph, GraphNode } from '@/lib/api/types';

interface NodeGraphProps {
  data: EgoGraph;
  onSelectNode: (node: GraphNode) => void;
}

interface Placed {
  node: GraphNode;
  x: number;
  y: number;
  r: number;
  ring: 'center' | 'first' | 'second';
}

const truncate = (s: string, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * Interactive ego-network graph. Sizes to its container so it opens fully
 * visible and centred on the focus node; pinch to zoom and (when zoomed) drag to
 * pan; tap any node to re-centre the graph on it.
 */
export function NodeGraph({ data, onSelectNode }: NodeGraphProps) {
  const theme = useTheme();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const size = Math.max(0, Math.min(box.w, box.h));

  const onLayout = (e: LayoutChangeEvent) =>
    setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const colorFor = (type: string, center: boolean) => {
    if (center) return theme.primary;
    switch (type) {
      case 'person':
        return theme.accent;
      case 'place':
        return theme.success;
      case 'life_period':
        return theme.warning;
      default:
        return theme.textSecondary;
    }
  };

  const { placed, lines } = useMemo(() => {
    if (size <= 0) return { placed: [] as Placed[], lines: [] as { x1: number; y1: number; x2: number; y2: number }[] };
    const cx = size / 2;
    const cy = size / 2;
    const r1 = size * 0.22;
    const r2 = size * 0.38;
    const centerId = data.center?.id;

    const neighbors = new Set<string>();
    data.edges.forEach((e) => {
      if (e.source === centerId) neighbors.add(e.target);
      if (e.target === centerId) neighbors.add(e.source);
    });

    const first: GraphNode[] = [];
    const second: GraphNode[] = [];
    data.nodes.forEach((n) => {
      if (n.id === centerId) return;
      (neighbors.has(n.id) ? first : second).push(n);
    });

    const pos = new Map<string, Placed>();
    if (data.center) pos.set(data.center.id, { node: data.center, x: cx, y: cy, r: 15, ring: 'center' });
    first.forEach((n, i) => {
      const a = (i / Math.max(1, first.length)) * Math.PI * 2 - Math.PI / 2;
      pos.set(n.id, { node: n, x: cx + r1 * Math.cos(a), y: cy + r1 * Math.sin(a), r: 10, ring: 'first' });
    });
    second.forEach((n, i) => {
      const a = (i / Math.max(1, second.length)) * Math.PI * 2 - Math.PI / 2 + 0.3;
      pos.set(n.id, { node: n, x: cx + r2 * Math.cos(a), y: cy + r2 * Math.sin(a), r: 7, ring: 'second' });
    });

    const segs = data.edges
      .map((e) => {
        const a = pos.get(e.source);
        const b = pos.get(e.target);
        return a && b ? { x1: a.x, y1: a.y, x2: b.x, y2: b.y } : null;
      })
      .filter((s): s is { x1: number; y1: number; x2: number; y2: number } => s != null);

    return { placed: Array.from(pos.values()), lines: segs };
  }, [data, size]);

  return (
    <View style={styles.flex} onLayout={onLayout}>
      {size > 0 ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ width: size, height: size }}
          centerContent
          maximumZoomScale={3}
          minimumZoomScale={1}
          bouncesZoom
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <Svg width={size} height={size}>
            {lines.map((s, i) => (
              <Line key={`e${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={theme.border} strokeWidth={1} />
            ))}
            {placed.map((p) => (
              <G key={p.node.id} onPress={() => onSelectNode(p.node)}>
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={p.r}
                  fill={colorFor(p.node.type, p.ring === 'center')}
                  stroke={theme.background}
                  strokeWidth={2}
                />
                <SvgText
                  x={p.x}
                  y={p.y + p.r + 12}
                  fill={theme.text}
                  fontSize={p.ring === 'second' ? 9 : 11}
                  fontWeight={p.ring === 'center' ? '700' : '400'}
                  textAnchor="middle"
                >
                  {truncate(p.node.label)}
                </SvgText>
              </G>
            ))}
          </Svg>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
