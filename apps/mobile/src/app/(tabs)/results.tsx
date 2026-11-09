import type { SessionSummary, TestId } from '@visus/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

import { alertError } from '@/components/alertError';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { LoadState } from '@/components/results';
import { Screen } from '@/components/Screen';
import { CATEGORIES, testInfo } from '@/constants/tests';
import { Colors, Fonts, Radius, StatusColors } from '@/constants/theme';
import { listSessions } from '@/services/sessions';
import { newCheckRoute } from '@/store/check';

/** Trend tabs and the test each one follows. */
const METRICS: { label: string; testId: TestId }[] = [
  { label: 'Sharpness', testId: 'tumbling_e' },
  { label: 'Contrast', testId: 'contrast' },
  { label: 'Colour', testId: 'colour_plates' },
];
const POINTS = 6;
const ROWS = 4;
const MODE_TITLE = { full: 'Full eye check', quick: 'Quick check', glasses: 'Glasses check', custom: 'Selected tests' } as const;

const month = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { month: 'short' });

/** Chart in the design's 328 × 110 box: scores 60–100 map to y 100–10. */
function chart(scores: number[]) {
  const step = scores.length > 1 ? 312 / (scores.length - 1) : 0;
  const pts = scores.map((n, i) => [scores.length > 1 ? 8 + i * step : 320, Math.min(100, Math.max(5, 100 - ((n - 60) / 40) * 90))]);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `M${pts[0][0].toFixed(1)},100 L${line.split(' ').join(' L')} L${pts[pts.length - 1][0].toFixed(1)},100 Z`;
  return { line, area, last: pts[pts.length - 1] };
}

/** Screen 5: Results tab. Trend per metric and the list of past checks. */
export default function Results() {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [metric, setMetric] = useState(0);
  const [all, setAll] = useState(false);

  const load = useCallback(() => {
    let live = true;
    listSessions()
      .then((s) => {
        if (!live) return;
        setSessions(s);
        setFailed(false);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);
  // Reload when the tab opens, so a check that just finished shows up.
  useFocusEffect(load);

  if (!sessions) {
    return (
      <Screen tabs title="Results">
        {failed ? <LoadState failed onRetry={load} /> : <ActivityIndicator color={Colors.ink} style={styles.loading} />}
      </Screen>
    );
  }

  if (sessions.length === 0) {
    return (
      <Screen tabs eyebrow="No checks yet" title="Results">
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="results" size={30} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>No results yet</Text>
          <Text style={styles.emptyBody}>Take your first eye check. Your scores and trends will show up here.</Text>
          <Button title="Start eye check" onPress={() => void newCheckRoute().then((href) => router.push(href), (e) => alertError(e))} style={styles.emptyButton} />
        </View>
      </Screen>
    );
  }

  const oldest = sessions[sessions.length - 1];
  const { label, testId } = METRICS[metric];
  // Oldest first, the latest few checks that include this test.
  const points = sessions
    .filter((s) => s.scores[testId] !== undefined)
    .slice(0, POINTS)
    .reverse();
  const scores = points.map((s) => s.scores[testId]!);
  const latest = scores[scores.length - 1];
  const delta = scores.length > 1 ? latest - scores[0] : 0;
  const graph = scores.length > 1 ? chart(scores) : null;
  const rows = all ? sessions : sessions.slice(0, ROWS);

  return (
    <Screen
      tabs
      scroll
      eyebrow={`${sessions.length} ${sessions.length === 1 ? 'check' : 'checks'} since ${month(oldest.date)}`}
      title="Results">
      <View style={styles.trend}>
        <View style={styles.tabs}>
          {METRICS.map((m, i) => (
            <Pressable
              key={m.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: i === metric }}
              onPress={() => setMetric(i)}
              style={[styles.tab, i === metric && styles.tabOn]}>
              <Text style={[styles.tabText, i === metric && styles.tabTextOn]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        {latest === undefined ? (
          <Text style={styles.noData}>No {label.toLowerCase()} results yet.</Text>
        ) : (
          <>
            <View style={styles.valueRow}>
              <View style={styles.value}>
                <Text style={styles.valueNumber}>{latest}</Text>
                <Text style={styles.outOf}>/ 100</Text>
              </View>
              {graph && (
                <View style={[styles.delta, { backgroundColor: StatusColors[delta >= 0 ? 'good' : 'mild'].bg }]}>
                  <Text style={[styles.deltaText, { color: StatusColors[delta >= 0 ? 'good' : 'mild'].fg }]}>
                    {delta >= 0 ? '+' : '−'}
                    {Math.abs(delta)} since {month(points[0].date)}
                  </Text>
                </View>
              )}
            </View>
            {graph ? (
              <>
                <Svg viewBox="0 0 328 110" style={styles.chart}>
                  <Path d="M0 10H328M0 55H328M0 100H328" stroke={Colors.divider} strokeWidth={1} />
                  <Path d={graph.area} fill={Colors.accSoft} />
                  <Polyline
                    points={graph.line}
                    fill="none"
                    stroke={Colors.acc}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <Circle cx={graph.last[0]} cy={graph.last[1]} r={5} fill={Colors.white} stroke={Colors.acc} strokeWidth={2.5} />
                </Svg>
                <View style={styles.months}>
                  {points.map((p) => (
                    <Text key={p.id} style={styles.month}>
                      {month(p.date)}
                    </Text>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.noData}>Take another check to see your trend.</Text>
            )}
          </>
        )}
      </View>

      <View style={styles.past}>
        <View style={styles.pastHead}>
          <Text style={styles.h3}>Past checks</Text>
          {sessions.length > ROWS && (
            <Pressable accessibilityRole="button" onPress={() => setAll(!all)} hitSlop={8}>
              <Text style={styles.seeAll}>{all ? 'Show less' : 'See all'}</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.list}>
          {rows.map((s, i) => (
            <PastCheck key={s.id} session={s} first={i === 0} />
          ))}
        </View>
      </View>
    </Screen>
  );
}

function PastCheck({ session, first }: { session: SessionSummary; first: boolean }) {
  const date = new Date(session.date);
  const single = session.mode === 'single' ? testInfo(session.tests[0]) : undefined;
  const title = single ? single.name : MODE_TITLE[session.mode === 'single' ? 'full' : session.mode];
  const what = single
    ? `${CATEGORIES.find((c) => c.id === single.category)?.tile}`
    : `${session.tests.length} ${session.tests.length === 1 ? 'test' : 'tests'}`;
  const sub = `${what} · ${session.shopName ? `At ${session.shopName}` : 'Both eyes'}`;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/results/[sessionId]', params: { sessionId: session.id } })}
      style={({ pressed }) => [styles.row, !first && styles.rowDivider, pressed && styles.rowPressed]}>
      <View style={styles.dateBox}>
        <Text style={styles.day}>{date.getDate()}</Text>
        <Text style={styles.mon}>{month(session.date).toUpperCase()}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <StatusBadge status={session.status} label={session.status === 'good' ? 'All clear' : undefined} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 40 },
  trend: { padding: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  tabs: { height: 36, padding: 3, flexDirection: 'row', borderRadius: Radius.pill, backgroundColor: Colors.fill },
  tab: { flex: 1, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  tabOn: {
    backgroundColor: Colors.white,
    shadowColor: Colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabText: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.tabInactive },
  tabTextOn: { color: Colors.ink },
  valueRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  value: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  valueNumber: { fontFamily: Fonts.bold, fontSize: 34, lineHeight: 38, letterSpacing: -1, color: Colors.ink },
  outOf: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.muted },
  delta: { height: 28, paddingHorizontal: 10, borderRadius: Radius.pill, justifyContent: 'center' },
  deltaText: { fontFamily: Fonts.semibold, fontSize: 13 },
  chart: { marginTop: 12, width: '100%', aspectRatio: 328 / 110 },
  months: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  month: { fontFamily: Fonts.regular, fontSize: 12, color: '#8A8A85' },
  noData: { marginTop: 16, fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22, color: Colors.muted },
  past: { gap: 10 },
  pastHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h3: { fontFamily: Fonts.bold, fontSize: 18, letterSpacing: -0.2, color: Colors.ink },
  seeAll: { paddingVertical: 8, fontFamily: Fonts.semibold, fontSize: 15, color: Colors.ink },
  list: { borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, overflow: 'hidden' },
  row: { minHeight: 64, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowDivider: { borderTopWidth: 1, borderTopColor: Colors.divider },
  rowPressed: { backgroundColor: Colors.pressed },
  dateBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center' },
  day: { fontFamily: Fonts.bold, fontSize: 16, lineHeight: 17, color: Colors.ink },
  mon: { marginTop: 3, fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 0.4, color: Colors.muted },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontFamily: Fonts.semibold, fontSize: 16, color: Colors.ink },
  rowSub: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.muted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingBottom: 40 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: 20, fontFamily: Fonts.bold, fontSize: 22, letterSpacing: -0.4, color: Colors.ink },
  emptyBody: {
    marginTop: 8,
    maxWidth: 280,
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: Colors.muted,
  },
  emptyButton: { marginTop: 24, height: 52, paddingHorizontal: 28, alignSelf: 'center' },
});
