import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { LoadState } from '@/components/results';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { drName } from '@/constants/consult';
import { fullDate } from '@/constants/report';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { listMyPrescriptions, type ConsultPrescription } from '@/services/consults';

/** C4: Prescriptions from your video consults, newest first. */
export default function Prescriptions() {
  const [list, setList] = useState<ConsultPrescription[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    listMyPrescriptions().then(setList, () => setFailed(true));
  }, []);
  useFocusEffect(load);

  return (
    <Screen scroll>
      <ScreenHeader left="back" onLeft={() => router.back()} title="Prescriptions" />
      {!list ? (
        <LoadState failed={failed} onRetry={load} />
      ) : list.length === 0 ? (
        <Text style={styles.empty}>No prescriptions yet. After a video consult, the doctor&apos;s prescription is saved here.</Text>
      ) : (
        <View style={styles.card}>
          {list.map((rx, i) => (
            <Pressable
              key={rx.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/profile/prescriptions/[id]', params: { id: rx.id } })}
              style={[styles.row, i > 0 && styles.divider]}>
              <View style={styles.icon}>
                <Icon name="document" size={20} strokeWidth={1.8} />
              </View>
              <View style={styles.text}>
                <Text style={styles.title}>{drName(rx.doctor.name)}</Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {fullDate(rx.date)} · {rx.clinic.name}
                  {rx.medicines.length ? ` · ${rx.medicines.length} medicine${rx.medicines.length === 1 ? '' : 's'}` : ''}
                  {rx.glasses ? ' · glasses' : ''}
                </Text>
              </View>
              <Icon name="chevronRight" size={16} color={Colors.faint} strokeWidth={2.2} />
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 14, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  row: { minHeight: 68, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.divider },
  icon: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.fill },
  text: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: Fonts.semibold, fontSize: 16, color: Colors.ink },
  sub: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.muted },
  empty: { marginTop: 24, fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24, color: Colors.muted },
});
