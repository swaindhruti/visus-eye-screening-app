// Screen 44: Switch eye, between the right-eye and left-eye parts of a test.
// Reads the instruction aloud, then counts down 3 seconds and starts.
import { useEffect, useEffectEvent, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { TestHeader } from '@/components/TestHeader';
import { Text } from '@/components/Text';
import { Colors, Fonts, Radius, StatusColors } from '@/constants/theme';
import { VOICE_TEXT } from '@visus/shared';
import { speak } from '@/services/talk';
import { useSettings } from '@/store/settings';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING = 2 * Math.PI * 34; // 213.6
const COUNT = 3;
const TITLE = 'Now cover your right eye';
const BODY = "Use your palm, without pressing. We'll check your left eye next.";

type Props = { title: string; onExit: () => void; onStart: () => void };

export function SwitchEye({ title, onExit, onStart }: Props) {
  // null until the instruction has been read out.
  const [left, setLeft] = useState<number | null>(null);
  const [progress] = useState(() => new Animated.Value(0));

  const start = useEffectEvent(onStart);

  useEffect(() => {
    let active = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const countdown = () => {
      if (!active) return;
      setLeft(COUNT);
      Animated.timing(progress, { toValue: 1, duration: COUNT * 1000, easing: Easing.linear, useNativeDriver: false }).start();
      for (let i = 1; i <= COUNT; i++) timers.push(setTimeout(() => setLeft(COUNT - i), i * 1000));
      timers.push(setTimeout(() => start(), COUNT * 1000 + 600));
    };
    // Read in the chosen language (the Visus voice, else the phone's), then count down.
    const lang = useSettings.getState().language;
    const voice = speak(lang === 'en' ? `${TITLE}. ${BODY}` : VOICE_TEXT[lang].switchEye, lang);
    void voice.done.then(countdown);
    return () => {
      active = false;
      voice.stop();
      timers.forEach(clearTimeout);
      progress.stopAnimation();
    };
  }, [progress]);

  const offset = progress.interpolate({ inputRange: [0, 1], outputRange: [RING, 0] });

  return (
    <View style={styles.root}>
      <TestHeader title={title} onExit={onExit} />

      <View style={styles.centre}>
        <View style={styles.done}>
          <Icon name="check" size={14} color={StatusColors.good.fg} strokeWidth={2.4} />
          <Text style={styles.doneText}>Right eye done</Text>
        </View>

        <View style={styles.eyes}>
          <View style={styles.eye}>
            <View style={[styles.circle, styles.circleOpen]}>
              <Icon name="eye" size={48} strokeWidth={1.6} />
            </View>
            <Text style={styles.eyeName}>Left eye</Text>
            <Text style={styles.eyeSub}>Testing next</Text>
          </View>
          <View style={styles.eye}>
            <View style={[styles.circle, styles.circleCovered]}>
              <Icon name="hand" size={46} color={Colors.white} strokeWidth={1.6} />
            </View>
            <Text style={styles.eyeName}>Right eye</Text>
            <Text style={styles.eyeSub}>Cover it</Text>
          </View>
        </View>

        <Text style={styles.title}>{TITLE}</Text>
        <Text style={styles.body}>{BODY}</Text>

        <View style={styles.timer}>
          <Svg width={76} height={76} viewBox="0 0 76 76" style={styles.ring}>
            <Circle cx={38} cy={38} r={34} fill="none" stroke={Colors.borderOption} strokeWidth={3} />
            <AnimatedCircle
              cx={38}
              cy={38}
              r={34}
              fill="none"
              stroke={Colors.ink}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={RING}
              strokeDashoffset={offset}
            />
          </Svg>
          <Text style={styles.count}>{left === null ? COUNT : left || 'Go'}</Text>
        </View>
        <Text style={styles.timerSub}>
          {left === null ? 'Listen…' : left ? `Starting in ${left}…` : 'Starting now'}
        </Text>
      </View>

      <Button title="I'm ready" onPress={onStart} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centre: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  done: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: StatusColors.good.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  doneText: { fontFamily: Fonts.semibold, fontSize: 14, color: StatusColors.good.fg },
  eyes: { marginTop: 32, flexDirection: 'row', gap: 28 },
  eye: { alignItems: 'center', gap: 4 },
  circle: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  circleOpen: { borderWidth: 2, borderColor: Colors.ink, backgroundColor: Colors.white },
  circleCovered: { backgroundColor: Colors.ink },
  eyeName: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.ink },
  eyeSub: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.muted },
  title: {
    marginTop: 32,
    fontFamily: Fonts.bold,
    fontSize: 30,
    lineHeight: 35,
    letterSpacing: -0.75,
    textAlign: 'center',
    color: Colors.ink,
  },
  body: { marginTop: 10, maxWidth: 300, fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24, textAlign: 'center', color: Colors.muted },
  timer: { marginTop: 28, width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  count: { fontFamily: Fonts.bold, fontSize: 24, color: Colors.ink, fontVariant: ['tabular-nums'] },
  timerSub: { marginTop: 10, fontFamily: Fonts.regular, fontSize: 14, color: Colors.muted },
});
