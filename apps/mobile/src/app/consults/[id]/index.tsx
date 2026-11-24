import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { alertError } from '@/components/alertError';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PrescriptionView } from '@/components/PrescriptionView';
import { LoadState } from '@/components/results';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { consultWhen, drName, STATUS_LABEL } from '@/constants/consult';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { addConsultToCalendar } from '@/services/calendar';
import { getConsult, getConsultPrescription, joinable, type ConsultDetail, type ConsultPrescription } from '@/services/consults';

const LANG: Record<string, string> = { en: 'English', hi: 'Hindi', or: 'Odia' };

/** C3: one consult: doctor, clinic, time, where to join; Add to calendar; Join now; the prescription once saved. */
export default function ConsultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [c, setC] = useState<ConsultDetail | null>(null);
  const [rx, setRx] = useState<ConsultPrescription | null>(null);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    getConsult(id).then(
      (d) => {
        setC(d);
        if (d.hasPrescription) getConsultPrescription(id).then(setRx, () => undefined);
      },
      () => setFailed(true),
    );
  }, [id]);
  useFocusEffect(load);

  async function addToCalendar() {
    if (!c) return;
    setAdding(true);
    try {
      const r = await addConsultToCalendar(c);
      if (r === 'added') Alert.alert('Added to your calendar', 'You get reminders 1 hour and 10 minutes before.');
      if (r === 'denied') Alert.alert('Calendar not allowed', 'Allow the calendar for Visus in your phone settings, or add it yourself.');
    } catch (e) {
      alertError(e);
    } finally {
      setAdding(false);
    }
  }

  if (!c)
    return (
      <Screen>
        <ScreenHeader left="back" onLeft={() => router.back()} title="Consult" />
        <LoadState failed={failed} onRetry={load} />
      </Screen>
    );

  const canJoin = joinable(c);
  const upcoming = c.status === 'scheduled' || c.status === 'live';
  return (
    <Screen scroll>
      <ScreenHeader left="back" onLeft={() => router.back()} title="Consult" />
      <View style={styles.head}>
        <Text style={styles.status}>{STATUS_LABEL[c.status]} · Video consult</Text>
        <Text style={styles.title}>{drName(c.doctor.name)}</Text>
        <Text style={styles.sub}>
          {c.doctor.specialty} · Reg. no. {c.doctor.registrationNo}
        </Text>
      </View>

      <View style={styles.card}>
        <Row icon="calendar" title={consultWhen(c.startsAt)} sub={`${c.minutes} minutes`} />
        <Row icon="pin" title={c.joinFrom === 'clinic' ? `At ${c.clinic.name}` : 'From home, in this app'} sub={`Booked by ${c.clinic.name}${c.clinic.city ? `, ${c.clinic.city}` : ''}`} divider />
        <Row icon="globe" title={`Captions in ${LANG[c.language] ?? c.language}`} sub="What the doctor says is shown in your language" divider />
        {!!c.reason && <Row icon="info" title={c.reason} sub="Reason" divider />}
      </View>

      {upcoming && (
        <View style={styles.actions}>
          {canJoin ? (
            <Button title="Join now" arrow onPress={() => router.push({ pathname: '/consults/[id]/call', params: { id: c.id } })} />
          ) : (
            <Text style={styles.hint}>You can join from 10 minutes before the start. You get a reminder if you add it to your calendar.</Text>
          )}
          <Button title={adding ? 'Adding…' : 'Add to calendar'} variant="secondary" icon="calendar" disabled={adding} onPress={() => void addToCalendar()} />
        </View>
      )}

      {rx && (
        <View style={styles.rx}>
          <Text style={styles.section}>Prescription</Text>
          <PrescriptionView rx={rx} />
        </View>
      )}
      {!rx && c.status === 'completed' && <Text style={styles.hint}>The doctor hasn&apos;t saved a prescription for this consult.</Text>}
      <Text style={styles.note}>Visus is a screening, not a diagnosis. Your records are shared with this doctor for the consult.</Text>
    </Screen>
  );
}

function Row({ icon, title, sub, divider }: { icon: 'calendar' | 'pin' | 'globe' | 'info'; title: string; sub: string; divider?: boolean }) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={styles.icon}>
        <Icon name={icon} size={20} strokeWidth={1.8} />
      </View>
      <View style={styles.text}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { marginTop: 14, gap: 4 },
  status: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.muted },
  title: { fontFamily: Fonts.bold, fontSize: 28, lineHeight: 33, letterSpacing: -0.6, color: Colors.ink },
  sub: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.muted },
  card: { marginTop: 16, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  row: { minHeight: 64, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.divider },
  icon: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.fill },
  text: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontFamily: Fonts.semibold, fontSize: 16, color: Colors.ink },
  rowSub: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.muted },
  actions: { marginTop: 16, gap: 10 },
  hint: { marginTop: 12, fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22, color: Colors.muted },
  rx: { marginTop: 22, gap: 10 },
  section: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.ink },
  note: { marginTop: 18, fontFamily: Fonts.regular, fontSize: 13, lineHeight: 19, color: Colors.muted },
});
