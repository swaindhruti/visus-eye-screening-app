import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { consultWhen, drName } from '@/constants/consult';
import { Colors, Fonts, Radius, StatusColors } from '@/constants/theme';
import { joinable, listMyConsults, type ConsultSummary } from '@/services/consults';

// Red tint (the design's "see a doctor" colours) so the consult is the first thing on Home.
const RED = StatusColors.see_doctor;

/**
 * Home (top): the next consult a clinic booked for you ("Consult with Dr X · Today 4:15 pm"), with
 * "Join now" from 10 minutes before the start. Nothing when there is none.
 */
export function ConsultCard() {
  const [next, setNext] = useState<ConsultSummary | null>(null);
  const [, tick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      listMyConsults()
        .then((list) => live && setNext(list.find((c) => c.status === 'scheduled' || c.status === 'live') ?? null))
        .catch(() => undefined);
      return () => {
        live = false;
      };
    }, []),
  );
  // Re-render every 30 s so "Join now" appears on time.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!next) return null;
  const canJoin = joinable(next);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/consults/[id]', params: { id: next.id } })}
      style={[styles.card, canJoin && styles.live]}>
      <View style={[styles.icon, canJoin && styles.iconLive]}>
        <Icon name="video" size={20} color={Colors.white} strokeWidth={1.9} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, canJoin && styles.white]} numberOfLines={1}>
          Consult with {drName(next.doctor.name)}
        </Text>
        <Text style={[styles.sub, canJoin && styles.whiteSoft]} numberOfLines={1}>
          {consultWhen(next.startsAt)} · {next.joinFrom === 'clinic' ? `at ${next.clinic.name}` : 'from home'}
        </Text>
      </View>
      {canJoin ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/consults/[id]/call', params: { id: next.id } })}
          style={styles.join}>
          <Text style={styles.joinText}>Join now</Text>
        </Pressable>
      ) : (
        <Icon name="chevronRight" size={16} color={RED.fg} strokeWidth={2.2} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#F2C9C3', backgroundColor: RED.bg },
  live: { backgroundColor: RED.dot, borderColor: RED.dot },
  icon: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: RED.dot },
  iconLive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: Fonts.semibold, fontSize: 16, color: RED.fg },
  sub: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.inkSoft },
  white: { color: Colors.white },
  whiteSoft: { color: 'rgba(255,255,255,0.85)' },
  join: { paddingHorizontal: 14, height: 38, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  joinText: { fontFamily: Fonts.semibold, fontSize: 14, color: RED.fg },
});
