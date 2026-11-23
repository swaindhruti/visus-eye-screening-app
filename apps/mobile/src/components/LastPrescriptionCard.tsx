import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { drName } from '@/constants/consult';
import { Colors, Radius, Type } from '@/constants/theme';
import { listMyPrescriptions, type ConsultPrescription } from '@/services/consults';

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** What's on it, in a few words: "Glasses power · 2 medicines". */
function contents(rx: ConsultPrescription) {
  const parts = [
    rx.glasses && 'Glasses power',
    rx.medicines.length > 0 && `${rx.medicines.length} medicine${rx.medicines.length === 1 ? '' : 's'}`,
    rx.remedies.length > 0 && 'Daily care',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Notes from your doctor';
}

/** Home (bottom): the latest prescription from a video consult, or a short note when there is none yet. */
export function LastPrescriptionCard() {
  const [rx, setRx] = useState<ConsultPrescription | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      listMyPrescriptions()
        .then((list) => live && setRx(list[0] ?? null))
        .catch(() => live && setRx(null));
      return () => {
        live = false;
      };
    }, []),
  );

  if (rx === undefined) return null;
  return (
    <Card
      style={styles.card}
      onPress={() => (rx ? router.push({ pathname: '/profile/prescriptions/[id]', params: { id: rx.id } }) : router.push('/consults'))}>
      <View style={styles.icon}>
        <Icon name="document" size={20} color={Colors.accInk} strokeWidth={1.9} />
      </View>
      <View style={styles.text}>
        <Text style={Type.rowTitle}>Last consult prescription</Text>
        <Text style={styles.caption} numberOfLines={2}>
          {rx
            ? `${drName(rx.doctor.name)} · ${shortDate(rx.date)}\n${contents(rx)}`
            : 'After a video consult, your doctor’s prescription shows here.'}
        </Text>
      </View>
      <Icon name="chevronRight" size={16} color={Colors.faint} strokeWidth={2.2} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 62, paddingVertical: 12, paddingLeft: 14, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 38, height: 38, borderRadius: Radius.pill, backgroundColor: Colors.accSoft, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  caption: { ...Type.caption, color: Colors.muted },
});
