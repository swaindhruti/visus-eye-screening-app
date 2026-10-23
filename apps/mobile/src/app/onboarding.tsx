import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { alertError } from '@/components/alertError';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FormScreen } from '@/components/FormScreen';
import { HeaderButton } from '@/components/ScreenHeader';
import { Icon } from '@/components/Icon';
import { OptionRow } from '@/components/OptionRow';
import { Text, TextInput } from '@/components/Text';
import { Colors, Fonts, Radius, Sizes, Type } from '@/constants/theme';
import { CONDITIONS, EYEWEAR, GENDERS, NONE, PAST, SCREEN_TIME, toggleCondition as toggleIn } from '@/constants/profile';
import { currentUser } from '@/services/auth';
import { createProfile } from '@/services/profiles';

const STEPS = 7;

type Answers = {
  name: string;
  gender: string | null;
  age: number | null;
  specs: string | null;
  past: string | null;
  note: string;
  cond: string[];
  screen: string | null;
};

/** Screen 2: Onboarding, 7 steps + summary. */
export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({
    name: currentUser()?.name.split(' ')[0] ?? '',
    gender: null,
    age: 30,
    specs: null,
    past: null,
    note: '',
    cond: [],
    screen: null,
  });
  const [saving, setSaving] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const set = (patch: Partial<Answers>) => setA((cur) => ({ ...cur, ...patch }));
  /** Tapping the selected answer again clears it, as in the design. */
  const toggle = (field: 'gender' | 'specs' | 'past' | 'screen', value: string) =>
    set({ [field]: a[field] === value ? null : value });
  const toggleCondition = (value: string) => set({ cond: toggleIn(a.cond, value) });

  const age = a.age ?? 30;
  const done = step === STEPS;
  const canNext = step !== 0 || a.name.trim().length > 0;
  const go = (n: number) => setStep(Math.max(0, Math.min(STEPS, n)));

  async function next() {
    if (!canNext || saving) return;
    if (step < STEPS - 1) return go(step + 1);
    await save();
  }

  /** After the last question (answered or skipped): save the profile, then show the summary. */
  async function save() {
    setSaving(true);
    try {
      await createProfile({
        name: a.name.trim(),
        age,
        gender: a.gender ?? undefined,
        isChild: age < 13,
        wearsGlasses: a.specs !== null && a.specs !== 'Neither',
        healthConditions: a.cond.filter((c) => c !== NONE),
        screenHoursPerDay: SCREEN_TIME.find(([label]) => label === a.screen)?.[1] ?? 0,
        relation: 'self',
        eyewear: EYEWEAR.find(([, label]) => label === a.specs)?.[0],
        pastEyeTest: PAST.find(([, label]) => label === a.past)?.[0],
        pastEyeNote: a.past === 'Yes' && a.note.trim() ? a.note.trim() : undefined,
      });
      go(STEPS);
    } catch (e) {
      alertError(e, "Couldn't save your profile");
    } finally {
      setSaving(false);
    }
  }

  const summary: [string, string | null][] = [
    ['Gender', a.gender],
    ['Age', a.age ? `${a.age} years` : null],
    ['Glasses / lenses', a.specs],
    ['Past eye tests', a.past === 'Yes' && a.note.trim() ? `Yes — ${a.note.trim()}` : a.past],
    ['Health conditions', a.cond.length ? a.cond.join(', ') : null],
    ['Screen time', a.screen],
  ];

  return (
    <FormScreen>
      <View style={styles.bar}>
        <View style={step === 0 && styles.faded}>
          <HeaderButton icon="chevronLeft" label="Back" onPress={() => go(step - 1)} />
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(((step + 1) / (STEPS + 1)) * 100)}%` }]} />
        </View>
        <Pressable
          onPress={() => (step === STEPS - 1 ? void save() : go(step + 1))}
          disabled={step === 0 || done || saving}
          style={[styles.skip, (step === 0 || done) && styles.hidden]}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.stepLabel}>{done ? 'All done' : `Step ${step + 1} of ${STEPS}`}</Text>

        {step === 0 && (
          <>
            <Text style={styles.question}>What should we call you?</Text>
            <Text style={styles.sub}>Just your first name is fine.</Text>
            <TextInput
              value={a.name}
              onChangeText={(name) => set({ name })}
              placeholder="Your name"
              placeholderTextColor={Colors.faint}
              autoComplete="given-name"
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              style={[styles.nameInput, nameFocused && styles.focused]}
            />
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.question}>How do you identify?</Text>
            <Text style={styles.sub}>Some eye conditions show up differently, so this helps tune your checks.</Text>
            <Options list={GENDERS} value={a.gender} onPick={(v) => toggle('gender', v)} />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.question}>How old are you?</Text>
            <Text style={styles.sub}>Eyes change with age, so we adjust each test to match.</Text>
            <View style={styles.ageRow}>
              <Pressable
                accessibilityLabel="Decrease age"
                onPress={() => set({ age: Math.max(5, age - 1) })}
                style={({ pressed }) => [styles.stepper, pressed && styles.pressed]}>
                <Icon name="minus" size={22} />
              </Pressable>
              <View style={styles.ageBox}>
                <TextInput
                  value={a.age === null ? '' : String(a.age)}
                  onChangeText={(t) => {
                    const n = parseInt(t.replace(/\D/g, ''), 10);
                    set({ age: isNaN(n) ? null : Math.min(110, n) });
                  }}
                  keyboardType="number-pad"
                  accessibilityLabel="Age in years"
                  maxLength={3}
                  style={styles.ageInput}
                />
                <Text style={styles.years}>years</Text>
              </View>
              <Pressable
                accessibilityLabel="Increase age"
                onPress={() => set({ age: Math.min(110, age + 1) })}
                style={({ pressed }) => [styles.stepper, pressed && styles.pressed]}>
                <Icon name="plusBold" size={22} />
              </Pressable>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.question}>Do you wear glasses or lenses?</Text>
            <Options list={EYEWEAR.map(([, l]) => l)} value={a.specs} onPick={(v) => toggle('specs', v)} />
          </>
        )}

        {step === 4 && (
          <>
            <Text style={styles.question}>Had an eye test or diagnosis before?</Text>
            <Options list={PAST.map(([, l]) => l)} value={a.past} onPick={(v) => toggle('past', v)}>
              {a.past === 'Yes' && (
                <TextInput
                  value={a.note}
                  onChangeText={(note) => set({ note })}
                  placeholder="What was it, and roughly when? (optional)"
                  placeholderTextColor={Colors.faint}
                  multiline
                  numberOfLines={3}
                  style={styles.note}
                />
              )}
            </Options>
          </>
        )}

        {step === 5 && (
          <>
            <Text style={styles.question}>Any health conditions right now?</Text>
            <Text style={styles.sub}>Some affect your eyes. Pick all that apply.</Text>
            <View style={styles.chips}>
              {CONDITIONS.map((c) => (
                <Chip key={c} label={c} selected={a.cond.includes(c)} onPress={() => toggleCondition(c)} />
              ))}
            </View>
          </>
        )}

        {step === 6 && (
          <>
            <Text style={styles.question}>How long are you on screens each day?</Text>
            <Text style={styles.sub}>Phone, laptop and TV together.</Text>
            <Options list={SCREEN_TIME.map(([l]) => l)} value={a.screen} onPick={(v) => toggle('screen', v)} />
          </>
        )}

        {done && (
          <>
            <Text style={styles.question}>You&apos;re all set, {a.name.trim().split(' ')[0] || 'friend'}</Text>
            <Text style={styles.sub}>Here&apos;s what Visus will use to tailor your checks.</Text>
            <View style={styles.summary}>
              {summary.map(([k, v], i) => (
                <View key={k} style={[styles.summaryRow, i > 0 && styles.summaryDivider]}>
                  <Text style={styles.summaryKey}>{k}</Text>
                  <Text style={styles.summaryValue}>{v || 'Skipped'}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      {done ? (
        <>
          <Button title="Start my first eye check" onPress={() => router.replace('/permissions')} style={styles.cta} />
          <Button title="Later" variant="ghost" onPress={() => router.replace({ pathname: '/permissions', params: { then: 'home' } })} style={styles.later} />
          <Text style={styles.footnote}>You can change these anytime in Profile.</Text>
        </>
      ) : (
        <Button
          title={saving ? 'Saving…' : step === STEPS - 1 ? 'Finish' : 'Continue'}
          disabled={!canNext}
          onPress={next}
          style={styles.cta}
        />
      )}
    </FormScreen>
  );
}

function Options({
  list,
  value,
  onPick,
  children,
}: {
  list: string[];
  value: string | null;
  onPick: (v: string) => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.options}>
      {list.map((o) => (
        <OptionRow key={o} label={o} selected={value === o} onPress={() => onPick(o)} />
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: Sizes.iconButton, flexDirection: 'row', alignItems: 'center', gap: 14 },
  faded: { opacity: 0.35 },
  track: { flex: 1, height: 6, borderRadius: 99, backgroundColor: Colors.borderOption, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99, backgroundColor: Colors.acc },
  skip: { height: 44, paddingHorizontal: 6, justifyContent: 'center' },
  skipText: { ...Type.button, fontSize: 16, color: Colors.muted },
  hidden: { opacity: 0 },
  body: { flex: 1, marginTop: 32 },
  stepLabel: { ...Type.label, color: Colors.muted },
  question: { ...Type.question, marginTop: 8, color: Colors.ink },
  sub: { ...Type.body, marginTop: 10, color: Colors.muted },
  nameInput: {
    marginTop: 28,
    minHeight: Sizes.option,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.button,
    backgroundColor: Colors.card,
    ...Type.option,
    fontFamily: Fonts.regular,
    color: Colors.ink,
  },
  focused: { borderColor: Colors.ink, boxShadow: '0 0 0 4px rgba(17,17,17,0.06)' },
  options: { marginTop: 24, gap: 10 },
  ageRow: { marginTop: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  stepper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.94 }] },
  ageBox: {
    width: 150,
    height: 132,
    borderRadius: Radius.hero,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  ageInput: {
    width: 120,
    padding: 0,
    textAlign: 'center',
    fontFamily: Fonts.bold,
    fontSize: 58,
    lineHeight: 61,
    letterSpacing: -1.74,
    color: Colors.ink,
  },
  years: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.muted },
  note: {
    minHeight: 96,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.button,
    backgroundColor: Colors.card,
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: Colors.ink,
    textAlignVertical: 'top',
  },
  chips: { marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summary: {
    marginTop: 22,
    paddingHorizontal: 18,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, paddingVertical: 13 },
  summaryDivider: { borderTopWidth: 1, borderTopColor: Colors.divider },
  summaryKey: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.muted },
  summaryValue: { flex: 1, fontFamily: Fonts.semibold, fontSize: 15, textAlign: 'right', color: Colors.ink },
  cta: { marginTop: 20 },
  later: { marginTop: 4 },
  footnote: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.muted, textAlign: 'center', marginTop: 12 },
});
