import type { ScoredResult } from '@visus/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { LoadState } from '@/components/results';
import { Screen } from '@/components/Screen';
import { HeaderButton, ScreenHeader } from '@/components/ScreenHeader';
import { areasOf, dayLabel, findingsOf } from '@/constants/report';
import { CATEGORIES, testInfo } from '@/constants/tests';
import { Colors, Fonts, StatusColors } from '@/constants/theme';
import { useCheck, useVerdict } from '@/store/check';
import { useSayInTalkMode } from '@/services/talk';

/** Two tiles per row, as in the design's 2-column grid. */
const pairs = <T,>(items: T[]) => items.flatMap((item, i) => (i % 2 ? [] : [items.slice(i, i + 2)]));

/** Screen 17: Results & analysis. Right after a check, or a past check from the Results tab. */
export default function Results() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { verdict, failed, retry } = useVerdict(sessionId);
  // Just finished: closing ends the check and goes Home. A past check just goes back.
  const fresh = useCheck((s) => s.verdict?.sessionId === sessionId);
  // Talk mode reads the result (headline and advice come in the chosen language).
  useSayInTalkMode(verdict && fresh ? `${verdict.headline}. ${verdict.advice}` : undefined);

  useEffect(() => {
    if (!fresh) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      finish();
      return true;
    });
    return () => sub.remove();
  }, [fresh]);

  function close() {
    if (fresh) finish();
    else router.back();
  }

  if (!verdict) {
    return (
      <Screen>
        <ScreenHeader left="close" onLeft={close} title="Your results" />
        <LoadState failed={failed} onRetry={retry} />
      </Screen>
    );
  }

  const tests = verdict.results.length;
  const findings = findingsOf(verdict);

  return (
    <Screen scroll>
      <View style={styles.root}>
        <ScreenHeader
          left="close"
          onLeft={close}
          title="Your results"
          right={
            <HeaderButton
              icon="share"
              label="Share report"
              onPress={() => router.push({ pathname: '/results/[sessionId]/share', params: { sessionId } })}
            />
          }
        />

        <View style={styles.hero}>
          <Text style={styles.heroMeta}>
            {dayLabel(verdict.date)} · {tests} {tests === 1 ? 'test' : 'tests'}
            {verdict.minutes ? ` · ${verdict.minutes} min` : ''}
          </Text>
          <Text style={styles.heroTitle}>{verdict.headline}</Text>
          <Text style={styles.heroBody}>{verdict.advice}</Text>
        </View>

        <View style={styles.tiles}>
          {pairs(areasOf(verdict)).map((row) => (
            <View key={row[0].id} style={styles.tileRow}>
              {row.map((a) => {
                const doctor = a.status === 'see_doctor';
                return (
                  <View key={a.id} style={[styles.tile, doctor && styles.tileDoctor]}>
                    <View style={styles.tileTop}>
                      <Text style={styles.tileName}>{a.tile}</Text>
                      <View style={[styles.dot, { backgroundColor: StatusColors[a.status].dot }]} />
                    </View>
                    <Text style={[styles.tileStatus, doctor && styles.tileStatusDoctor]}>{StatusColors[a.status].label}</Text>
                  </View>
                );
              })}
              {row.length === 1 && <View style={styles.tileGap} />}
            </View>
          ))}
        </View>

        {findings.length > 0 && (
          <>
            <Text style={styles.h3}>Findings</Text>
            <View style={styles.findings}>
              {findings.map((r) => (
                <Finding key={r.testId} sessionId={sessionId} result={r} />
              ))}
            </View>
          </>
        )}

        <View style={styles.spacer} />
        <View style={styles.note}>
          <Icon name="info" size={16} color={Colors.muted} />
          <Text style={styles.noteText}>Screening, not diagnosis.</Text>
        </View>
        <Button
          title="See lens suggestions"
          onPress={() => router.push({ pathname: '/results/[sessionId]/lens', params: { sessionId: verdict.sessionId } })}
        />
        <Button title="Done" variant="ghost" onPress={close} style={styles.done} />
      </View>
    </Screen>
  );
}

/** Ends the check that just finished and goes Home. */
function finish() {
  router.dismissTo('/home');
  useCheck.getState().reset();
}

/** One result that needs attention. Opens Test result detail (18). */
function Finding({ sessionId, result }: { sessionId: string; result: ScoredResult }) {
  const test = testInfo(result.testId)!;
  const c = StatusColors[result.status];
  const icon = result.testId === 'amsler' ? 'amsler' : CATEGORIES.find((k) => k.id === test.category)?.icon;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/results/[sessionId]/[testId]', params: { sessionId, testId: result.testId } })}
      style={({ pressed }) => [styles.finding, pressed && styles.pressed]}>
      <View style={[styles.findingIcon, { backgroundColor: c.bg }]}>
        {icon === 'E' || !icon ? (
          <Text style={[styles.findingE, { color: c.fg }]}>E</Text>
        ) : (
          <Icon name={icon} size={20} color={c.fg} />
        )}
      </View>
      <View style={styles.findingText}>
        <Text style={styles.findingTitle}>{result.summary}</Text>
        <Text style={styles.findingSub}>
          {test.name} · {c.label}
        </Text>
      </View>
      <Icon name="chevronRight" size={16} color={Colors.faint} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { marginTop: 16, paddingVertical: 18, paddingHorizontal: 20, gap: 4, borderRadius: 24, backgroundColor: Colors.hero },
  heroMeta: { fontFamily: Fonts.semibold, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  heroTitle: { marginTop: 4, fontFamily: Fonts.bold, fontSize: 24, lineHeight: 29, letterSpacing: -0.5, color: Colors.white },
  heroBody: { marginTop: 2, fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.75)' },
  tiles: { marginTop: 12, gap: 10 },
  tileRow: { flexDirection: 'row', gap: 10 },
  tileGap: { flex: 1 },
  tile: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  tileDoctor: { borderColor: '#F2D3CE' },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tileName: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.ink },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tileStatus: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.muted },
  tileStatusDoctor: { fontFamily: Fonts.semibold, color: StatusColors.see_doctor.fg },
  h3: { marginTop: 20, fontFamily: Fonts.bold, fontSize: 18, letterSpacing: -0.2, color: Colors.ink },
  findings: { marginTop: 10, gap: 10 },
  finding: {
    minHeight: 72,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  pressed: { transform: [{ scale: 0.98 }], borderColor: '#D6D6D1' },
  findingIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  findingE: { fontFamily: Fonts.bold, fontSize: 18 },
  findingText: { flex: 1, minWidth: 0, gap: 2 },
  findingTitle: { fontFamily: Fonts.semibold, fontSize: 16, color: Colors.ink },
  findingSub: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.muted },
  spacer: { flex: 1, minHeight: 12 },
  note: { marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  noteText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.muted },
  done: { marginTop: 4, height: 44 },
});
