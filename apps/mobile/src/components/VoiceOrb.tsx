import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import type { VoiceState } from '@/services/talk';

const LABEL: Record<VoiceState, string> = { idle: 'Talk mode is on', speaking: 'Visus is speaking', listening: 'Listening', thinking: 'Thinking' };
const SHAPE = [0.45, 0.75, 1, 0.75, 0.45];

/**
 * The talk-mode visualizer: five bars in a round badge. Listening, the bars follow the mic level;
 * speaking, they move on their own; thinking, they pulse. Still when the phone asks for reduced motion.
 */
export function VoiceOrb({ state, level = 0, size = 52 }: { state: VoiceState; level?: number; size?: number }) {
  const [wave] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce || (state !== 'speaking' && state !== 'thinking')) return;
      loop = Animated.loop(Animated.timing(wave, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }));
      loop.start();
    });
    return () => {
      loop?.stop();
      wave.setValue(0);
    };
  }, [state, wave]);

  const bg = state === 'listening' ? Colors.accSoft : state === 'speaking' ? Colors.ink : Colors.fill;
  const bar = state === 'speaking' ? Colors.white : state === 'idle' ? Colors.muted : Colors.accInk;
  const barsHeight = size * 0.42;

  return (
    <View accessibilityRole="text" accessibilityLabel={LABEL[state]} accessibilityLiveRegion="polite" style={[styles.orb, { width: size, height: size, backgroundColor: bg }]}>
      <View style={[styles.bars, { height: barsHeight }]}>
        {SHAPE.map((h, i) => {
          const base = state === 'listening' ? 0.18 + Math.min(1, level * 1.6) * h * 0.82 : state === 'idle' ? 0.18 : h * 0.6;
          const scale = wave.interpolate({ inputRange: [0, 0.5, 1], outputRange: i % 2 ? [1.25, 0.6, 1.25] : [0.6, 1.25, 0.6] });
          return (
            <Animated.View
              key={i}
              style={[
                styles.bar,
                { height: Math.max(3, base * barsHeight), backgroundColor: bar },
                state === 'speaking' || state === 'thinking' ? { transform: [{ scaleY: scale }], opacity: state === 'thinking' ? 0.7 : 1 } : null,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bar: { width: 3, borderRadius: 2 },
});
