import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { alertError } from '@/components/alertError';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { daysAgo, daysSince, elapsed, RECHECK_DAYS } from '@/constants/report';
import { Colors, Fonts, Radius, Type } from '@/constants/theme';
import { getScreenTimeToday, type ScreenTime } from '@/services/coach';
import { listSessions, type SessionSummary } from '@/services/sessions';
import { useAuth } from '@/store/auth';
import { newCheckRoute } from '@/store/check';
import { useSettings } from '@/store/settings';

const hm = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;

/** Screen 3: Home. */
/** Guests only have the Tests library (every "Go to Home" lands there). */
export default function Home() {
  const guest = useAuth((s) => s.guest);
  return guest ? <Redirect href="/tests" /> : <HomeScreen />;
}

function HomeScreen() {
  const [last, setLast] = useState<SessionSummary | null>(null);
  const [screenTime, setScreenTime] = useState<ScreenTime | null>(null);

  const snoozedUntil = useSettings((s) => s.recheckSnoozedUntil);

  // Reload on focus, so a check that just finished updates "Last check" and the reminder.
  useFocusEffect(
    useCallback(() => {
      let live = true;
      listSessions()
        .then((s) => live && setLast(s[0] ?? null))
        .catch(() => undefined);
      getScreenTimeToday()
        .then((t) => live && setScreenTime(t))
        .catch(() => undefined);
      return () => {
        live = false;
      };
    }, []),
  );

  // Re-check reminder (56): the last check is old and the user hasn't asked to be reminded later.
  const recheck = last && daysSince(last.date) >= RECHECK_DAYS && !(snoozedUntil && daysSince(snoozedUntil) < 0);

  return (
    <Screen tabs scroll>
      {recheck && (
        <Card style={styles.recheck} onPress={() => router.push('/check/recheck')}>
          <View style={styles.recheckIcon}>
            <Icon name="bell" size={20} color={Colors.accInk} strokeWidth={2} />
          </View>
          <View style={styles.quickText}>
            <Text style={Type.rowTitle}>Check-up reminder</Text>
            <Text style={styles.caption}>It&apos;s been {elapsed(last.date)} since your last check</Text>
          </View>
          <Icon name="chevronRight" size={16} color={Colors.faint} strokeWidth={2.2} />
        </Card>
      )}
      <Card dark style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.due}>
            <View style={styles.dueDot} />
            <Text style={styles.dueText}>Due today</Text>
          </View>
          <Text style={styles.heroMeta}>About 5 min</Text>
        </View>
        <Text style={styles.heroTitle}>Time for your eye check</Text>
        <Text style={styles.heroBody}>Sharpness, focus, colour and contrast.</Text>
        <Button
          title="Start eye check"
          variant="inverted"
          arrow
          onPress={() => void newCheckRoute().then((href) => router.push(href), (e) => alertError(e))}
          style={styles.heroButton}
        />
      </Card>

      <Card style={styles.quick} onPress={() => router.push('/check/quick')}>
        <View style={styles.quickIcon}>
          <Icon name="bolt" size={20} color={Colors.accInk} />
        </View>
        <View style={styles.quickText}>
          <Text style={Type.rowTitle}>1-minute quick check</Text>
          <Text style={styles.caption}>Tumbling E · Amsler · Clock dial</Text>
        </View>
        <View style={styles.startPill}>
          <Text style={styles.startText}>Start</Text>
        </View>
      </Card>

      <View style={styles.grid}>
        <Card style={styles.tile} onPress={() => router.push('/coach')}>
          <Text style={styles.tileLabel}>{screenTime?.source === 'profile' ? 'Daily screen time' : 'Screen time today'}</Text>
          <Text style={styles.tileValue}>{screenTime ? hm(screenTime.minutes) : '–'}</Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${screenTime ? Math.min(100, (screenTime.minutes / screenTime.goalMinutes) * 100) : 0}%` },
              ]}
            />
          </View>
          <View style={styles.tileFoot}>
            <Text style={styles.caption}>
              {screenTime?.source === 'profile' ? 'From your profile' : `Goal under ${screenTime ? Math.round(screenTime.goalMinutes / 60) : 6}h`}
            </Text>
            <Icon name="chevronRight" size={14} color={Colors.faint} strokeWidth={2.4} />
          </View>
        </Card>

        <Card style={styles.tile} onPress={() => router.push('/results')}>
          <Text style={styles.tileLabel}>Last eye check</Text>
          {last ? (
            <>
              <Text style={styles.tileValue}>
                {new Date(last.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </Text>
              <Text style={[styles.caption, styles.ago]}>{daysAgo(last.date)}</Text>
              <View style={styles.badge}>
                <StatusBadge status={last.status} label={last.status === 'good' ? 'All clear' : undefined} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.tileValue}>–</Text>
              <Text style={[styles.caption, styles.ago]}>No checks yet</Text>
            </>
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={Type.h3}>Popular tests</Text>
          <Pressable onPress={() => router.navigate('/tests')} hitSlop={8}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>
        <Card flush>
          <ListRow first icon="E" title="Distance acuity" right="3 min" onPress={() => router.push('/tests/tumbling_e')} />
          <ListRow
            icon={<Icon name="colour" size={20} />}
            title="Colour vision plates"
            right="3 min"
            onPress={() => router.push('/tests/colour_plates')}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 6 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  due: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dueDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.accBright },
  dueText: { ...Type.label, fontSize: 13, color: Colors.white },
  heroMeta: { fontFamily: Fonts.regular, fontSize: 14, color: 'rgba(255,255,255,0.72)' },
  heroTitle: { ...Type.h1, marginTop: 10, color: Colors.white },
  heroBody: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.75)' },
  heroButton: { marginTop: 14 },
  recheck: { minHeight: 62, paddingVertical: 10, paddingLeft: 14, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: Colors.accSoft },
  recheckIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.accSoft, alignItems: 'center', justifyContent: 'center' },
  quick: { minHeight: 62, paddingVertical: 10, paddingLeft: 14, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: { flex: 1, minWidth: 0, gap: 1 },
  startPill: { height: 36, paddingHorizontal: 14, borderRadius: Radius.pill, backgroundColor: Colors.ink, justifyContent: 'center' },
  startText: { ...Type.label, color: Colors.white },
  caption: { ...Type.caption, color: Colors.muted },
  grid: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1 },
  tileLabel: { ...Type.label, color: Colors.muted },
  tileValue: { fontFamily: Fonts.bold, fontSize: 26, lineHeight: 29, letterSpacing: -0.52, marginTop: 10, color: Colors.ink },
  track: { marginTop: 14, height: 6, borderRadius: 99, backgroundColor: Colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99, backgroundColor: Colors.acc },
  tileFoot: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  ago: { marginTop: 4 },
  badge: { marginTop: 'auto', paddingTop: 10 },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll: { ...Type.rowTitle, fontSize: 15, color: Colors.ink },
});
