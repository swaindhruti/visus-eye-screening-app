import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Switch } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FixedText, Text } from '@/components/Text';
import { LANGUAGE_OPTIONS } from '@visus/shared';

import { Colors, Fonts, Radius, StatusColors } from '@/constants/theme';
import { logout } from '@/services/auth';
import { forgetProfiles } from '@/services/profiles';
import { canDrawOverlays, coachAvailable, getCoachStatus, setBreakReminders } from '@/services/coach';
import { UNAVAILABLE_NOTE } from '@/services/reminders';
import { useAuth } from '@/store/auth';
import { useCalibration } from '@/store/calibration';
import { useCheck } from '@/store/check';
import { useSettings, type Reminder, type TextSize } from '@/store/settings';

const TEXT_SIZES: [TextSize, string, number][] = [
  ['normal', 'Default', 15],
  ['large', 'Large', 19],
  ['larger', 'Larger', 23],
];
const REMINDERS: [Reminder, string, string][] = [
  ['check', 'Check reminders', 'Once a month'],
  ['breaks', 'Break reminders', 'Every 20 min of screen time'],
  ['weekly', 'Weekly report', 'Sunday evening'],
];

// Loaded on first use: importing expo-notifications in Expo Go logs a warning about push (not used here).
const reminders = () => import('@/services/reminders');

/** "+91 98•••• 4210", "as•••@gmail.com". */
function masked(identifier: string) {
  if (identifier.includes('@')) {
    const [name, domain] = identifier.split('@');
    return `${name.slice(0, 2)}•••@${domain}`;
  }
  if (identifier.length <= 6) return identifier;
  return `${identifier.slice(0, Math.min(6, identifier.length - 4))}••••${identifier.slice(-4)}`;
}

/** Screen 24: Settings. */
export default function Settings() {
  const { textSize, reminders: on, setTextSize, setReminder, language, setLanguage, talk, setTalk } = useSettings();
  const calibrated = useCalibration((s) => s.pxPerMm !== null);
  const identifier = useAuth((s) => s.user?.identifier ?? '');
  const [languages, setLanguages] = useState(false);
  const [blocked, setBlocked] = useState<'denied' | 'unavailable' | null>(null);
  const [armed, setArmed] = useState(false);

  async function toggleReminder(key: Reminder, on: boolean) {
    // Break reminders run in Screen Coach (installed app): the overlay permission comes first.
    if (key === 'breaks' && coachAvailable) {
      if (on && !canDrawOverlays()) return router.push('/coach/permission');
      return setBreakReminders(on);
    }
    if (key !== 'check') return setReminder(key, on);
    setBlocked(null);
    if (!on) {
      setReminder('check', false);
      await (await reminders()).disableCheckReminder();
      return;
    }
    const outcome = await (await reminders()).enableCheckReminder().catch(() => 'unavailable' as const);
    setReminder('check', outcome === 'on');
    setBlocked(outcome === 'on' ? null : outcome);
  }

  async function logOut() {
    if (!armed) return setArmed(true);
    if (on.check) {
      setReminder('check', false);
      await (await reminders()).disableCheckReminder();
    }
    useCheck.getState().reset();
    forgetProfiles();
    logout();
    router.dismissAll();
    router.replace('/welcome');
  }

  return (
    <Screen scroll>
      <View style={styles.root}>
        <ScreenHeader left="back" onLeft={() => router.back()} title="Settings" />

        <Text style={[styles.section, styles.first]}>General</Text>
        <View style={styles.card}>
          <Pressable accessibilityRole="button" onPress={() => setLanguages(true)} style={styles.row}>
            <Icon name="globe" size={20} strokeWidth={1.8} />
            <Text style={styles.rowTitle}>Language</Text>
            <Text style={styles.value}>{LANGUAGE_OPTIONS.find((o) => o.code === language)?.name}</Text>
            <Icon name="chevronRight" size={16} color={Colors.faint} strokeWidth={2.2} />
          </Pressable>
          <View style={[styles.notif, styles.divider]}>
            <Icon name="speaker" size={20} strokeWidth={1.8} />
            <View style={styles.notifText}>
              <Text style={styles.rowTitle}>Talk mode</Text>
              <Text style={styles.sub}>Visus reads aloud and listens for spoken answers</Text>
            </View>
            <Switch value={talk} onChange={setTalk} label="Talk mode" />
          </View>
          <View style={[styles.textSize, styles.divider]}>
            <View style={styles.textSizeTop}>
              <Icon name="textSize" size={20} strokeWidth={1.8} />
              <Text style={styles.rowTitle}>Text size</Text>
              <FixedText style={[styles.preview, { fontSize: TEXT_SIZES.find(([k]) => k === textSize)![2] }]}>Aa</FixedText>
            </View>
            <View style={styles.segments}>
              {TEXT_SIZES.map(([key, label]) => (
                <Pressable
                  key={key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: key === textSize }}
                  onPress={() => setTextSize(key)}
                  style={[styles.segment, key === textSize && styles.segmentOn]}>
                  <Text style={[styles.segmentText, key === textSize && styles.segmentTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.section}>Notifications</Text>
        <View style={styles.card}>
          {REMINDERS.map(([key, label, sub], i) => (
            <View key={key} style={[styles.notif, i > 0 && styles.divider]}>
              <View style={styles.notifText}>
                <Text style={styles.rowTitle}>{label}</Text>
                <Text style={styles.sub}>{sub}</Text>
              </View>
              <Switch
                value={key === 'breaks' && coachAvailable ? (getCoachStatus()?.enabled ?? false) : on[key]}
                onChange={(value) => void toggleReminder(key, value)}
                label={label}
              />
            </View>
          ))}
        </View>
        {blocked === 'unavailable' ? (
          <Text style={[styles.note, styles.noteAction]}>{UNAVAILABLE_NOTE}</Text>
        ) : blocked ? (
          <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()}>
            <Text style={[styles.note, styles.noteAction]}>
              Notifications are off for Visus. Tap to open your phone settings.
            </Text>
          </Pressable>
        ) : (
          coachAvailable ? (
            <Pressable accessibilityRole="button" onPress={() => router.push('/coach')}>
              <Text style={[styles.note, styles.noteLink]}>Screen time, breaks and the weekly report are in Screen Coach.</Text>
            </Pressable>
          ) : (
            <Text style={styles.note}>Break reminders and the weekly report need the installed Visus app (Screen Coach).</Text>
          )
        )}

        <Text style={styles.section}>Optical shops</Text>
        <View style={styles.card}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/settings/shops')} style={styles.row}>
            <Icon name="shieldCheck" size={20} strokeWidth={1.8} />
            <Text style={styles.rowTitle}>Linked shops and mobile number</Text>
            <Icon name="chevronRight" size={16} color={Colors.faint} strokeWidth={2.2} />
          </Pressable>
        </View>

        <Text style={styles.section}>Data</Text>
        <View style={styles.card}>
          <View style={styles.offline}>
            <Icon name="phone" size={20} strokeWidth={1.8} />
            <View style={styles.notifText}>
              <Text style={styles.rowTitle}>Offline data</Text>
              <Text style={styles.sub}>{calibrated ? 'Screen calibration saved on this phone' : 'Nothing saved yet'}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={!calibrated}
              onPress={() => useCalibration.getState().clear()}
              style={[styles.clear, !calibrated && styles.cleared]}>
              <Text style={styles.clearText}>{calibrated ? 'Clear' : 'Cleared'}</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/settings/about')} style={[styles.row, styles.divider]}>
            <Icon name="info" size={20} strokeWidth={1.8} />
            <Text style={styles.rowTitle}>About &amp; disclaimer</Text>
            <Icon name="chevronRight" size={16} color={Colors.faint} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={styles.spacer} />
        <Pressable
          accessibilityRole="button"
          onPress={() => void logOut()}
          style={[styles.logout, armed && styles.logoutArmed]}>
          <Text style={[styles.logoutText, armed && styles.logoutTextArmed]}>{armed ? 'Tap again to log out' : 'Log out'}</Text>
        </Pressable>
        <Text style={styles.footer}>
          Visus {Constants.expoConfig?.version ?? '1.0'}
          {identifier ? ` · Signed in as ${masked(identifier)}` : ''}
        </Text>
      </View>

      <Modal visible={languages} transparent animationType="fade" onRequestClose={() => setLanguages(false)}>
        <Pressable style={styles.scrim} onPress={() => setLanguages(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Language</Text>
            <Text style={styles.sub}>Visus AI chats, speaks and reads instructions in it. Screens stay in English.</Text>
            {LANGUAGE_OPTIONS.map((o, i) => (
              <Pressable
                key={o.code}
                accessibilityRole="radio"
                accessibilityState={{ checked: language === o.code }}
                onPress={() => setLanguage(o.code)}
                style={[styles.langRow, i > 0 && styles.divider]}>
                <Text style={styles.rowTitle}>{o.name}</Text>
                {language === o.code && <Icon name="checkLarge" size={20} color={Colors.acc} />}
              </Pressable>
            ))}
            <Button title="Done" onPress={() => setLanguages(false)} style={styles.sheetButton} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  section: { marginTop: 18, marginBottom: 8, marginLeft: 4, fontFamily: Fonts.bold, fontSize: 13, color: Colors.muted },
  first: { marginTop: 20 },
  card: { paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  divider: { borderTopWidth: 1, borderTopColor: Colors.divider },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { flex: 1, fontFamily: Fonts.semibold, fontSize: 16, color: Colors.ink },
  value: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.muted },
  textSize: { paddingTop: 14, paddingBottom: 16, gap: 12 },
  textSizeTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  preview: { fontFamily: Fonts.regular, color: Colors.muted },
  segments: { minHeight: 40, padding: 3, flexDirection: 'row', borderRadius: Radius.pill, backgroundColor: Colors.fill },
  segment: { flex: 1, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  segmentOn: {
    backgroundColor: Colors.white,
    shadowColor: Colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.tabInactive },
  segmentTextOn: { color: Colors.ink },
  notif: { minHeight: 60, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifText: { flex: 1, gap: 2 },
  sub: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.muted },
  note: { marginTop: 8, marginHorizontal: 4, fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18, color: Colors.muted },
  noteLink: { fontFamily: Fonts.semibold, color: Colors.accInk },
  noteAction: { fontFamily: Fonts.semibold, color: StatusColors.see_doctor.fg },
  offline: { minHeight: 64, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  clear: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.card,
    justifyContent: 'center',
  },
  cleared: { opacity: 0.5 },
  clearText: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.ink },
  spacer: { flex: 1, minHeight: 24 },
  logout: {
    minHeight: 52,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutArmed: { backgroundColor: StatusColors.see_doctor.fg, borderColor: StatusColors.see_doctor.fg },
  logoutText: { fontFamily: Fonts.semibold, fontSize: 16, color: StatusColors.see_doctor.fg },
  logoutTextArmed: { color: Colors.white },
  footer: { marginTop: 10, textAlign: 'center', fontFamily: Fonts.regular, fontSize: 12, color: '#8A8A85' },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,17,17,0.35)' },
  sheet: {
    margin: 12,
    padding: 20,
    paddingBottom: 16,
    borderRadius: Radius.hero,
    backgroundColor: Colors.card,
  },
  sheetTitle: { marginBottom: 8, fontFamily: Fonts.bold, fontSize: 20, color: Colors.ink },
  langRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetButton: { marginTop: 12 },
});
