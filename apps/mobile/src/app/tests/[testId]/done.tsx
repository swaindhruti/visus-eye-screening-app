import { TestId } from '@visus/shared';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';

import { alertError } from '@/components/alertError';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { EyeCards, FieldMap, NoteCard } from '@/components/results';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { CATEGORIES, testInfo } from '@/constants/tests';
import { Colors, Fonts } from '@/constants/theme';
import { getVerdict, GUEST_SESSION } from '@/services/sessions';
import { startSingleTest, useCheck } from '@/store/check';

/** Ends the single test and goes to the Tests tab. */
function finish() {
  router.dismissTo('/tests');
  useCheck.getState().reset();
}

/** Screen 48: Single test complete. The result of a test started from Test detail. */
export default function SingleTestComplete() {
  const { offline, testId } = useLocalSearchParams<{ offline?: string; testId: string }>();
  return offline ? <TakenOffline testId={testId} /> : <Scored />;
}

/** Taken offline: no score yet, the answers wait on the phone. */
function TakenOffline({ testId }: { testId: string }) {
  const parsed = TestId.safeParse(testId);
  const test = testInfo(parsed.success ? parsed.data : 'tumbling_e')!;
  const category = CATEGORIES.find((c) => c.id === test.category)!;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      finish();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <Screen>
      <View style={styles.root}>
        <ScreenHeader left="close" onLeft={finish} title={category.tile} small />
        <View style={styles.complete}>
          <View style={styles.tick}>
            <Icon name="check" size={14} color={Colors.accInk} strokeWidth={2.4} />
          </View>
          <Text style={styles.completeText}>Test complete</Text>
        </View>
        <Text style={styles.title}>{test.name}</Text>
        <View style={[styles.scoreCard, styles.offlineCard]}>
          <Icon name="wifiOff" size={22} />
          <View style={styles.offlineText}>
            <Text style={styles.offlineTitle}>Saved on this phone</Text>
            <Text style={styles.offlineBody}>
              You&apos;re offline. Your answers are sent and scored as soon as you&apos;re back online, then the result shows in
              Results.
            </Text>
          </View>
        </View>
        <View style={styles.spacer} />
        <Button title="Done" onPress={finish} />
      </View>
    </Screen>
  );
}

function Scored() {
  // Kept from when the screen opened: Retake and Done reset the check store.
  const [{ sessionId, step }] = useState(() => useCheck.getState());
  const [saved, setSaved] = useState<'saving' | 'saved' | 'failed'>('saving');
  const [attempt, setAttempt] = useState(0);
  const [starting, setStarting] = useState(false);

  const guest = sessionId === GUEST_SESSION;

  // The server saves each result as it comes in; the verdict closes the check so it shows in Results.
  // Guest results are only scored, never saved.
  useEffect(() => {
    if (!sessionId || guest) return;
    let live = true;
    getVerdict(sessionId)
      .then((v) => {
        if (!live) return;
        useCheck.getState().setVerdict(v);
        setSaved('saved');
      })
      .catch(() => live && setSaved('failed'));
    return () => {
      live = false;
    };
  }, [sessionId, attempt, guest]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      finish();
      return true;
    });
    return () => sub.remove();
  }, []);

  // Usually "done"; a red flag on a single test also ends here after Continue.
  if (!step || step.type === 'next_test') return <Redirect href="/tests" />;

  const result = step.result;
  const test = testInfo(result.testId)!;
  const category = CATEGORIES.find((c) => c.id === test.category)!;

  async function retake() {
    setStarting(true);
    try {
      router.replace(await startSingleTest(result.testId));
    } catch (e) {
      alertError(e, "Couldn't start the test");
    } finally {
      setStarting(false);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.root}>
        <ScreenHeader left="close" onLeft={finish} title={category.tile} small />

        <View style={styles.complete}>
          <View style={styles.tick}>
            <Icon name="check" size={14} color={Colors.accInk} strokeWidth={2.4} />
          </View>
          <Text style={styles.completeText}>Test complete</Text>
        </View>
        <Text style={styles.title}>{test.name}</Text>

        <View style={styles.scoreCard}>
          <View style={styles.scoreText}>
            <Text style={styles.label}>Your score</Text>
            <View style={styles.score}>
              <Text style={styles.scoreValue}>{result.score}</Text>
              <Text style={styles.outOf}>/ 100</Text>
            </View>
          </View>
          <View style={styles.badge}>
            <StatusBadge status={result.status} />
          </View>
        </View>

        {result.field ? (
          <>
            <FieldMap field={result.field} />
            <Text style={styles.meaning}>{result.meaning ?? result.summary}</Text>
            <NoteCard text="Rough screen only; see a doctor for a full field test." />
          </>
        ) : (
          <>
            {result.eyes && (
              <>
                <Text style={styles.h3}>Left vs right</Text>
                <EyeCards eyes={result.eyes} />
              </>
            )}
            <Text style={styles.meaning}>{result.meaning ?? result.summary}</Text>
          </>
        )}

        <View style={styles.spacer} />
        {guest ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/signup')} style={styles.saved}>
            <Text style={styles.savedText}>
              Guest mode: this result isn&apos;t saved. <Text style={styles.signup}>Sign up</Text> to keep it.
            </Text>
          </Pressable>
        ) : saved === 'failed' ? (
          <Pressable accessibilityRole="button" onPress={() => (setSaved('saving'), setAttempt(attempt + 1))} style={styles.saved}>
            <Text style={[styles.savedText, styles.retry]}>Couldn&apos;t save to Results. Try again</Text>
          </Pressable>
        ) : (
          <View style={styles.saved}>
            <Icon name="checkLarge" size={16} color={Colors.muted} />
            <Text style={styles.savedText}>{saved === 'saved' ? 'Saved to Results' : 'Saving to Results…'}</Text>
          </View>
        )}
        <View style={styles.actions}>
          <Button title="Retake" variant="secondary" onPress={() => void retake()} disabled={starting} style={styles.action} />
          <Button title="Done" onPress={finish} style={styles.action} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  complete: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tick: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.accSoft, alignItems: 'center', justifyContent: 'center' },
  completeText: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.muted },
  title: { marginTop: 8, fontFamily: Fonts.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.7, color: Colors.ink },
  scoreCard: {
    marginTop: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  scoreText: { gap: 6 },
  label: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.muted },
  score: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  scoreValue: { fontFamily: Fonts.bold, fontSize: 52, lineHeight: 56, letterSpacing: -2, color: Colors.ink },
  outOf: { fontFamily: Fonts.regular, fontSize: 16, color: Colors.muted },
  badge: { marginBottom: 6 },
  h3: { marginTop: 22, fontFamily: Fonts.bold, fontSize: 17, color: Colors.ink },
  meaning: { marginTop: 16, fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24, color: Colors.inkSoft },
  spacer: { flex: 1, minHeight: 16 },
  saved: { marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  savedText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.muted },
  signup: { fontFamily: Fonts.semibold, color: Colors.ink },
  retry: { fontFamily: Fonts.semibold, color: Colors.ink, textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
  offlineCard: { alignItems: 'flex-start', justifyContent: 'flex-start' },
  offlineText: { flex: 1, gap: 4 },
  offlineTitle: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.ink },
  offlineBody: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22, color: Colors.muted },
});
