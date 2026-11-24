import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { LoadState } from '@/components/results';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { consultWhen, drName, STATUS_LABEL } from '@/constants/consult';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { joinable, listMyConsults, type ConsultSummary } from '@/services/consults';

/** C2: My consults. Booked by a clinic you linked; upcoming first, then past. */
export default function MyConsults() {
  const [list, setList] = useState<ConsultSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    listMyConsults().then(setList, () => setFailed(true));
  }, []);
  useFocusEffect(load);

  const open = list?.filter((c) => c.status === 'scheduled' || c.status === 'live') ?? [];
  const past = list?.filter((c) => !open.includes(c)) ?? [];

  return (
    <Screen scroll>
      <ScreenHeader left="back" onLeft={() => router.back()} title="My consults" />
      {!list ? (
        <LoadState failed={failed} onRetry={load} />
      ) : list.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIcon}>
            <Icon name="video" size={28} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>No consults yet</Text>
          <Text style={styles.emptyBody}>
            When a clinic you linked books a video consult with an eye doctor for you, it shows up here and on Home.
          </Text>
        </View>
      ) : (
        <>
          <Group title="Upcoming" items={open} empty="Nothing booked right now." />
          {past.length > 0 && <Group title="Past" items={past} />}
        </>
      )}
    </Screen>
  );
}

function Group({ title, items, empty }: { title: string; items: ConsultSummary[]; empty?: string }) {
  return (
    <>
      <Text style={styles.section}>{title}</Text>
      <View style={styles.card}>
        {items.length === 0 && <Text style={styles.empty}>{empty}</Text>}
        {items.map((c, i) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/consults/[id]', params: { id: c.id } })}
            style={[styles.row, i > 0 && styles.divider]}>
            <View style={styles.icon}>
              <Icon name={c.hasPrescription ? 'document' : 'video'} size={20} strokeWidth={1.8} />
            </View>
            <View style={styles.text}>
              <Text style={styles.title} numberOfLines={1}>
                {drName(c.doctor.name)}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {consultWhen(c.startsAt)} · {c.clinic.name}
              </Text>
            </View>
            {joinable(c) ? (
              <View style={[styles.badge, styles.badgeLive]}>
                <Text style={[styles.badgeText, styles.badgeLiveText]}>Join now</Text>
              </View>
            ) : (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{c.hasPrescription ? 'Prescription' : STATUS_LABEL[c.status]}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 18, marginBottom: 8, marginLeft: 4, fontFamily: Fonts.bold, fontSize: 13, color: Colors.muted },
  card: { paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  row: { minHeight: 68, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.divider },
  icon: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.fill },
  text: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: Fonts.semibold, fontSize: 16, color: Colors.ink },
  sub: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.muted },
  badge: { paddingHorizontal: 10, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.pill },
  badgeText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.inkSoft },
  badgeLive: { backgroundColor: Colors.ink },
  badgeLiveText: { color: Colors.white },
  empty: { paddingVertical: 18, fontFamily: Fonts.regular, fontSize: 15, color: Colors.muted },
  emptyBox: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  emptyTitle: { marginTop: 8, fontFamily: Fonts.bold, fontSize: 22, color: Colors.ink },
  emptyBody: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24, textAlign: 'center', color: Colors.muted },
});
