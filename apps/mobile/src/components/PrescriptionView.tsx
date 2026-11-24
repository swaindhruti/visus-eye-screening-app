// A prescription from a video consult, in the patient's language ("Show original" for the doctor's words).
// Everything on it was written by the doctor: Visus never suggests medicines.
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { drName } from '@/constants/consult';
import { fullDate } from '@/constants/report';
import { Colors, Fonts, Radius } from '@/constants/theme';
import type { ConsultPrescription } from '@/services/consults';

const power = (n: number) => (n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2));

export function PrescriptionView({ rx }: { rx: ConsultPrescription }) {
  const [original, setOriginal] = useState(false);
  const t = !original && rx.translated ? rx.translated : null;
  const symptoms = t?.symptoms ?? rx.symptoms;
  const observations = t?.observations ?? rx.observations;
  const remedies = t?.remedies ?? rx.remedies;

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.doctor}>{drName(rx.doctor.name)}</Text>
        <Text style={styles.meta}>
          {rx.doctor.specialty} · Reg. no. {rx.doctor.registrationNo}
        </Text>
        <Text style={styles.meta}>
          {rx.clinic.name}
          {rx.clinic.city ? `, ${rx.clinic.city}` : ''} · {fullDate(rx.date)}
        </Text>
        <Text style={styles.meta}>
          For {rx.patient.name}, {rx.patient.age} · {rx.kind === 'follow_up' ? 'Follow-up' : 'First consult'}
        </Text>
      </View>

      {rx.translated && (
        <Pressable accessibilityRole="button" onPress={() => setOriginal(!original)} style={styles.toggle}>
          <Text style={styles.toggleText}>{original ? 'Show in my language' : 'Show original'}</Text>
        </Pressable>
      )}

      {!!symptoms && <Block title="What you told the doctor" body={symptoms} />}
      {!!observations && <Block title="What the doctor found" body={observations} />}

      {rx.glasses && (
        <View style={styles.card}>
          <Text style={styles.h}>Glasses power</Text>
          <View style={styles.table}>
            <View style={styles.tr}>
              {['', 'SPH', 'CYL', 'AXIS', 'ADD'].map((h) => (
                <Text key={h} style={[styles.td, styles.th]}>
                  {h}
                </Text>
              ))}
            </View>
            {(['right', 'left'] as const).map((side) => {
              const e = rx.glasses![side];
              return (
                <View key={side} style={styles.tr}>
                  <Text style={[styles.td, styles.th]}>{side === 'right' ? 'Right' : 'Left'}</Text>
                  <Text style={styles.td}>{power(e.sph)}</Text>
                  <Text style={styles.td}>{power(e.cyl)}</Text>
                  <Text style={styles.td}>{e.axis}°</Text>
                  <Text style={styles.td}>{e.add ? power(e.add) : '–'}</Text>
                </View>
              );
            })}
          </View>
          {rx.glasses.pd ? <Text style={styles.meta}>PD {rx.glasses.pd} mm</Text> : null}
        </View>
      )}

      {rx.medicines.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.h}>Medicines</Text>
          {rx.medicines.map((m, i) => (
            <View key={`${m.name}-${i}`} style={[styles.item, i > 0 && styles.divider]}>
              <Text style={styles.itemTitle}>{m.name}</Text>
              <Text style={styles.body}>
                {[m.dose, m.frequency, m.days ? `${m.days} days` : ''].filter(Boolean).join(' · ')}
              </Text>
              {!!m.notes && <Text style={styles.meta}>{m.notes}</Text>}
            </View>
          ))}
        </View>
      )}

      {remedies.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.h}>Daily care</Text>
          {remedies.map((r, i) => (
            <Text key={`${r}-${i}`} style={styles.body}>
              • {r}
            </Text>
          ))}
        </View>
      )}

      {rx.followUpDate && <Block title="Follow-up" body={`${fullDate(rx.followUpDate)}${rx.followUpConsultId ? ' · booked for you' : ' · the clinic will book it'}`} />}

      <Text style={styles.note}>Written by your doctor. Visus is a screening, not a diagnosis. Ask your doctor or the clinic if anything is unclear.</Text>
    </View>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.h}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  card: { gap: 6, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  doctor: { fontFamily: Fonts.bold, fontSize: 19, color: Colors.ink },
  meta: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, color: Colors.muted },
  h: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.ink },
  body: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24, color: Colors.inkSoft },
  toggle: { alignSelf: 'flex-start', paddingHorizontal: 14, height: 36, borderRadius: Radius.pill, justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.card },
  toggleText: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.ink },
  table: { gap: 4 },
  tr: { flexDirection: 'row' },
  td: { flex: 1, fontFamily: Fonts.medium, fontSize: 15, color: Colors.ink },
  th: { fontFamily: Fonts.semibold, color: Colors.muted },
  item: { paddingVertical: 6, gap: 2 },
  itemTitle: { fontFamily: Fonts.semibold, fontSize: 16, color: Colors.ink },
  divider: { borderTopWidth: 1, borderTopColor: Colors.divider },
  note: { marginTop: 4, fontFamily: Fonts.regular, fontSize: 13, lineHeight: 19, color: Colors.muted },
});
