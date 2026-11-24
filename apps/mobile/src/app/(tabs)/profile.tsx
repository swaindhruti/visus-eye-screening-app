import type { Profile, SessionSummary } from '@visus/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Chip, ChipAvatar, StatusBadge } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { ListRow } from '@/components/ListRow';
import { LoadState } from '@/components/results';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { EYEWEAR, formatPower, initials, RELATIONS } from '@/constants/profile';
import { dayLabel, daysAgo } from '@/constants/report';
import { Colors, Fonts, Radius, Type } from '@/constants/theme';
import { listProfiles } from '@/services/profiles';
import { listSessions } from '@/services/sessions';
import { useAuth } from '@/store/auth';
import { checkStartFor } from '@/store/check';

const firstName = (p: Profile) => p.name.trim().split(/\s+/)[0];

/** "34 years · Female" for the owner, "8 years · Child" for family. */
function metaOf(p: Profile) {
  const relation = RELATIONS.find(([r]) => r === p.relation)?.[1];
  const extra = p.relation === 'self' || !relation ? p.gender : relation;
  return [`${p.age} years`, extra].filter(Boolean).join(' · ');
}

/** "Glasses · R −1.25 · L −1.00", "Contact lenses", "None". */
function glassesOf(p: Profile) {
  const kind = p.eyewear ? EYEWEAR.find(([e]) => e === p.eyewear)?.[1] : p.wearsGlasses ? 'Glasses' : undefined;
  const rx = p.prescription ? `R ${formatPower(p.prescription.right.sph)} · L ${formatPower(p.prescription.left.sph)}` : undefined;
  if (p.eyewear === 'none') return 'None';
  return [kind, rx].filter(Boolean).join(' · ') || 'Not set yet';
}

/** Screen 6: Profile tab. The account owner and family, each with their eyes. */
export default function ProfileTab() {
  const identifier = useAuth((s) => s.user?.identifier ?? '');
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState(0);

  // Reload on focus, so edits and new family members show up.
  const load = useCallback(() => {
    let live = true;
    Promise.all([listProfiles(), listSessions()])
      .then(([p, s]) => {
        if (!live) return;
        setProfiles(p);
        setSessions(s);
        setFailed(false);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);
  useFocusEffect(load);

  const signedInWith = identifier.includes('@') ? 'Signed in with email' : 'Signed in with phone';

  if (!profiles) {
    return (
      <Screen tabs eyebrow={signedInWith} title="Profile">
        {failed ? <LoadState failed onRetry={load} /> : <ActivityIndicator color={Colors.ink} style={styles.loading} />}
      </Screen>
    );
  }

  const p = profiles[Math.min(selected, profiles.length - 1)];
  const owner = p.relation === 'self' || p === profiles[0];
  const last = sessions.find((s) => s.profileId === p.id);

  return (
    <Screen tabs scroll eyebrow={signedInWith} title="Profile">
      <Card style={styles.me}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(p.name)}</Text>
        </View>
        <View style={styles.meText}>
          <Text style={styles.name} numberOfLines={1}>
            {p.name}
          </Text>
          <Text style={styles.meta}>{metaOf(p)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/profile/edit', params: { id: p.id } })}
          style={({ pressed }) => [styles.edit, pressed && styles.pressed]}>
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      </Card>

      <View style={styles.section}>
        <Text style={Type.h3}>Family</Text>
        <View style={styles.chips}>
          {profiles.map((m, i) => (
            <Chip
              key={m.id}
              label={i === 0 ? 'You' : firstName(m)}
              selected={m.id === p.id}
              onPress={() => setSelected(i)}
              leading={<ChipAvatar initial={m.name.trim()[0]?.toUpperCase() ?? '?'} selected={m.id === p.id} />}
            />
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/profile/family/new')}
            style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
            <Icon name="plusBold" size={18} />
            <Text style={styles.addText}>Add member</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={Type.h3}>{owner ? 'My eyes' : `${firstName(p)}'s eyes`}</Text>
        <Card flush>
          <ListRow
            first
            icon={<Icon name="glasses" size={22} strokeWidth={1.8} />}
            title="Glasses"
            subtitle={glassesOf(p)}
            onPress={() => router.push({ pathname: '/profile/glasses', params: { id: p.id } })}
          />
          <ListRow
            icon={<Icon name="calendar" size={20} strokeWidth={1.8} />}
            title="Last check"
            subtitle={last ? `${dayLabel(last.date)} · ${daysAgo(last.date)}` : 'No checks yet'}
            right={last && <StatusBadge status={last.status} label={last.status === 'good' ? 'All clear' : undefined} />}
            chevron={!last}
            onPress={() =>
              last
                ? router.push({ pathname: '/results/[sessionId]', params: { sessionId: last.id } })
                : router.push(checkStartFor(p))
            }
          />
          <ListRow
            icon={<Icon name="lens" size={20} strokeWidth={1.8} />}
            title="Saved lens"
            subtitle={p.savedLens?.product ?? 'No saved lens yet'}
            chevron={!!p.savedLens}
            onPress={
              p.savedLens
                ? () => router.push({ pathname: '/results/[sessionId]/lens', params: { sessionId: p.savedLens!.sessionId } })
                : undefined
            }
          />
          {owner && (
            <ListRow
              icon={<Icon name="video" size={20} strokeWidth={1.8} />}
              title="My consults"
              subtitle="Video consults booked by your clinic"
              onPress={() => router.push('/consults')}
            />
          )}
          {owner && (
            <ListRow
              icon={<Icon name="document" size={20} strokeWidth={1.8} />}
              title="Prescriptions"
              subtitle="From your eye doctor consults"
              onPress={() => router.push('/profile/prescriptions')}
            />
          )}
          <ListRow
            icon={<Icon name="sliders" size={20} strokeWidth={1.8} />}
            title="Settings"
            subtitle="Reminders, privacy, data"
            onPress={() => router.push('/settings')}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 40 },
  me: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.accSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.bold, fontSize: 21, color: Colors.accInk },
  meText: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: Fonts.bold, fontSize: 20, letterSpacing: -0.2, color: Colors.ink },
  meta: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.muted },
  edit: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.card,
    justifyContent: 'center',
  },
  editText: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.ink },
  pressed: { transform: [{ scale: 0.96 }] },
  section: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  add: {
    minHeight: 44,
    paddingLeft: 12,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.dashed,
  },
  addText: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.ink },
});
