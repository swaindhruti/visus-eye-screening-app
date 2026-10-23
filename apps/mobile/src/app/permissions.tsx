import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, PermissionsAndroid, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { cameraDistanceAvailable } from '@/components/DistanceCamera';
import type { IconName } from '@/components/Icon';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { Colors, Fonts, StatusColors } from '@/constants/theme';
import { useSettings } from '@/store/settings';
import { newCheckRoute } from '@/store/check';
import { UNAVAILABLE_NOTE, type ReminderResult } from '@/services/reminders';

/** One permission: icon, name, why, and an Allow button that turns green. */
function PermissionCard({ icon, name, body, allowed, busy, onAllow }: { icon: IconName; name: string; body: string; allowed: boolean; busy: boolean; onAllow: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.icon}>
          <Icon name={icon} size={22} color={Colors.accInk} strokeWidth={1.9} />
        </View>
        <View style={styles.text}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" disabled={allowed || busy} onPress={onAllow} style={[styles.allow, allowed && styles.allowed]}>
        {allowed && <Icon name="checkLarge" size={18} color={StatusColors.good.fg} strokeWidth={2.4} />}
        <Text style={[styles.allowText, allowed && styles.allowedText]}>{allowed ? 'Allowed' : busy ? 'Asking…' : 'Allow'}</Text>
      </Pressable>
    </View>
  );
}

/** The camera measures face distance in the installed app (not in Expo Go). */
const askCamera = cameraDistanceAvailable && Platform.OS === 'android';

/**
 * Screen 41: Permissions, once after onboarding. Notifications (monthly reminder) and,
 * in the installed app, the camera for face-distance tracking.
 */
export default function Permissions() {
  const { then } = useLocalSearchParams<{ then?: string }>();
  const reminderOn = useSettings((s) => s.reminders.check);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReminderResult | null>(null);
  const [camera, setCamera] = useState<'idle' | 'asking' | 'granted' | 'denied'>('idle');

  async function allowCamera() {
    setCamera('asking');
    const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA).catch(() => 'denied');
    setCamera(status === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied');
  }

  async function allow() {
    setBusy(true);
    try {
      const outcome = await (await import('@/services/reminders')).enableCheckReminder();
      useSettings.getState().setReminder('check', outcome === 'on');
      setResult(outcome);
    } catch {
      setResult('unavailable');
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    // "Later" on the onboarding summary: Home instead of a first check.
    if (then === 'home') return router.replace('/home');
    try {
      router.replace(await newCheckRoute());
    } catch {
      router.replace('/home');
    }
  }

  return (
    <Screen scroll>
      <View style={styles.root}>
        <ScreenHeader left="back" onLeft={() => void next()} leftLabel="Skip" title="Permissions" />
        <Text style={styles.title}>{askCamera ? 'Two quick permissions' : 'One quick permission'}</Text>
        <Text style={styles.sub}>Visus works without them, but tests and reminders work best with them on.</Text>

        {askCamera && (
          <>
            <PermissionCard
              icon="armsLength"
              name="Camera"
              body="Measures how far your face is from the screen during tests. Only used to measure distance; nothing is saved."
              allowed={camera === 'granted'}
              busy={camera === 'asking'}
              onAllow={() => void allowCamera()}
            />
            {camera === 'denied' && (
              <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()}>
                <Text style={styles.refused}>Camera is off for Visus. Tests still work; tap to open your phone settings.</Text>
              </Pressable>
            )}
          </>
        )}
        <PermissionCard
          icon="bell"
          name="Notifications"
          body="A monthly nudge when it's time to re-check your eyes."
          allowed={reminderOn}
          busy={busy}
          onAllow={() => void allow()}
        />
        {result === 'denied' && (
          <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()}>
            <Text style={styles.refused}>Notifications are off for Visus. Tap to open your phone settings.</Text>
          </Pressable>
        )}
        {result === 'unavailable' && <Text style={styles.refused}>{UNAVAILABLE_NOTE}</Text>}

        <View style={styles.spacer} />
        <View style={styles.note}>
          <Icon name="shieldCheck" size={16} color={Colors.muted} />
          <Text style={styles.noteText}>Change this anytime in Settings.</Text>
        </View>
        {reminderOn || camera === 'granted' ? (
          <Button title="Continue" onPress={() => void next()} />
        ) : (
          <Button title="Not now" variant="ghost" onPress={() => void next()} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { marginTop: 20, fontFamily: Fonts.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.7, color: Colors.ink },
  sub: { marginTop: 6, fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24, color: Colors.muted },
  card: { marginTop: 22, padding: 16, gap: 14, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accSoft, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontFamily: Fonts.bold, fontSize: 17, color: Colors.ink },
  body: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22, color: Colors.muted },
  allow: { minHeight: 48, borderRadius: 14, backgroundColor: Colors.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  allowed: { backgroundColor: StatusColors.good.bg },
  allowText: { fontFamily: Fonts.semibold, fontSize: 16, color: Colors.white },
  allowedText: { color: StatusColors.good.fg },
  refused: { marginTop: 10, marginHorizontal: 4, fontFamily: Fonts.semibold, fontSize: 13, lineHeight: 18, color: StatusColors.see_doctor.fg },
  spacer: { flex: 1, minHeight: 16 },
  note: { marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  noteText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.muted },
});
