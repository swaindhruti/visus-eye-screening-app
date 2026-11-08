import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/Chip';
import { useLeaveCheck } from '@/components/ExitDialog';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { testInfo } from '@/constants/tests';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { firstStep, useCheck } from '@/store/check';
import { VOICE_TEXT } from '@visus/shared';
import { speak, stopSpeaking, useSayInTalkMode } from '@/services/talk';
import { useSettings } from '@/store/settings';

const REST_SECONDS = 20;

/** Screen 14: Between-test analysis. The last result, then what the agent picked next and why. */
export default function BetweenTests() {
  const step = useCheck((s) => s.step);
  const done = useCheck((s) => s.results.length);
  const total = useCheck((s) => s.plan.length);
  const exit = useLeaveCheck();
  const [rest, setRest] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  // Talk mode: say what comes next (the reason is written in the chosen language).
  useSayInTalkMode(step?.type === 'next_test' ? step.reason : undefined);

  useEffect(
    () => () => {
      clearInterval(timer.current);
      stopSpeaking();
    },
    [],
  );

  if (step?.type !== 'next_test') return <Redirect href="/home" />;

  const finished = testInfo(step.result.testId)!;
  const next = testInfo(step.testId)!;

  // 20-20-20 rule: look far away for 20 seconds, read aloud since eyes are elsewhere.
  function restEyes() {
    let left = REST_SECONDS;
    setRest(left);
    speak(VOICE_TEXT[useSettings.getState().language].rest);
    timer.current = setInterval(() => {
      left -= 1;
      setRest(left);
      if (left <= 0) {
        clearInterval(timer.current);
        setRest(null);
        speak(VOICE_TEXT[useSettings.getState().language].restDone);
      }
    }, 1000);
  }

  return (
    <Screen>
      <View style={styles.root}>
        <ScreenHeader left="close" leftLabel="Exit check" onLeft={exit.ask} title="Eye check" right={`${done} of ${total}`} />
        <View style={styles.segments}>
          {Array.from({ length: total }, (_, k) => (
            <View key={k} style={[styles.segment, { backgroundColor: k < done ? Colors.ink : Colors.borderOption }]} />
          ))}
        </View>

        <Text style={styles.eyebrow}>Test {done} done</Text>
        <Text style={styles.title}>{finished.name}</Text>

        <View style={styles.result}>
          <View style={styles.score}>
            <Text style={styles.label}>Score</Text>
            <Text style={styles.value}>
              {step.result.score}
              <Text style={styles.outOf}> / 100</Text>
            </Text>
            <View style={styles.badge}>
              <StatusBadge status={step.result.status} />
            </View>
          </View>
          <Text style={styles.summary}>{step.result.summary}</Text>
        </View>

        <View style={styles.next}>
          <View style={styles.nextTop}>
            <Text style={styles.nextLabel}>Next we&apos;ll check</Text>
            {step.added && (
              <View style={styles.added}>
                <Text style={styles.addedText}>Added to plan</Text>
              </View>
            )}
          </View>
          <Text style={styles.nextName}>
            {next.name} · {next.minutes} min
          </Text>
          <Text style={styles.reason}>{step.reason}</Text>
        </View>

        <View style={styles.spacer} />
        <Button title="Continue" arrow onPress={() => router.replace(firstStep())} />
        <Button
          title={rest === null ? `Rest my eyes for ${REST_SECONDS} seconds` : `Look far away… ${rest} s`}
          variant="ghost"
          onPress={rest === null ? restEyes : undefined}
          style={styles.rest}
        />
        {exit.dialog}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  segments: { marginTop: 14, flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 6, borderRadius: 99 },
  eyebrow: { marginTop: 26, fontFamily: Fonts.semibold, fontSize: 14, color: Colors.muted },
  title: { marginTop: 4, fontFamily: Fonts.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.7, color: Colors.ink },
  result: {
    marginTop: 18,
    padding: 16,
    gap: 14,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  score: { gap: 4 },
  label: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.muted },
  value: { fontFamily: Fonts.bold, fontSize: 26, lineHeight: 29, letterSpacing: -0.5, color: Colors.ink },
  outOf: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.muted, letterSpacing: 0 },
  badge: { marginTop: 4, alignSelf: 'flex-start' },
  summary: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.inkSoft,
  },
  next: { marginTop: 12, padding: 16, gap: 6, borderRadius: Radius.card, backgroundColor: Colors.accSoft },
  nextTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  nextLabel: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.accInk },
  added: { height: 24, paddingHorizontal: 10, borderRadius: Radius.pill, backgroundColor: Colors.white, justifyContent: 'center' },
  addedText: { fontFamily: Fonts.semibold, fontSize: 12, color: Colors.accInk },
  nextName: { fontFamily: Fonts.bold, fontSize: 20, letterSpacing: -0.2, color: Colors.ink },
  reason: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22, color: Colors.inkSoft },
  spacer: { flex: 1, minHeight: 16 },
  rest: { marginTop: 4 },
});
