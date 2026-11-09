import { TEST_CATALOG } from '@visus/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Chip';
import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { Colors, Fonts, Type } from '@/constants/theme';
import { firstStep, useCheck } from '@/store/check';
import { useSayInTalkMode } from '@/services/talk';

const BEFORE: [IconName, string][] = [
  ['sun', 'Good light'],
  ['armsLength', "Arm's length"],
  ['glasses', 'Your glasses'],
];

/** Screen 10: Your test plan. */
export default function Plan() {
  const { plan, summary } = useCheck();
  const tests = plan.map((p) => ({ ...p, info: TEST_CATALOG.find((t) => t.id === p.testId)! }));
  const total = tests.reduce((sum, t) => sum + t.info.minutes, 0);
  // Talk mode reads the plan summary (written in the chosen language).
  useSayInTalkMode(summary || undefined);

  return (
    <Screen scroll>
      <ScreenHeader left="back" onLeft={() => router.back()} title="Your test plan" />

      <View style={styles.intro}>
        <Text style={styles.eyebrow}>Picked for you</Text>
        <Text style={styles.title}>
          {tests.length} {tests.length === 1 ? 'test' : 'tests'} · about {total} min
        </Text>
        {summary ? <Text style={styles.summary}>{summary}</Text> : null}
      </View>

      <Card flush>
        {tests.map((t, i) => (
          <View key={t.testId} style={[styles.row, i > 0 && styles.divider]}>
            <View style={styles.num}>
              <Text style={styles.numText}>{i + 1}</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={Type.rowTitle}>{t.info.name}</Text>
              <Text style={styles.reason}>{t.reason}</Text>
            </View>
            <Text style={styles.min}>{t.info.minutes} min</Text>
          </View>
        ))}
      </Card>

      <View>
        <Text style={styles.eyebrow}>Before you start</Text>
        <View style={styles.pills}>
          {BEFORE.map(([icon, label]) => (
            <Pill key={label} size="tall" label={label} leading={<Icon name={icon} size={16} color={Colors.inkSoft} />} />
          ))}
        </View>
      </View>

      <View style={styles.spacer} />
      <View>
        <Button title="Begin" arrow disabled={tests.length === 0} onPress={() => router.push(firstStep())} />
        <Button title="Choose tests myself" variant="ghost" onPress={() => router.navigate('/tests')} style={styles.choose} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 4 },
  eyebrow: { ...Type.label, color: Colors.muted },
  title: { ...Type.question, letterSpacing: -0.7, marginTop: 4, color: Colors.ink },
  summary: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24, marginTop: 8, color: Colors.muted },
  row: { minHeight: 70, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.divider },
  num: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.accSoft, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.accInk },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  reason: { ...Type.caption, color: Colors.muted },
  min: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.inkSoft },
  pills: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  spacer: { flex: 1, minHeight: 0 },
  choose: { marginTop: 4 },
});
