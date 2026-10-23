// Welcome → "Continue as guest": what a guest gets and what needs an account (same text as the web).
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { Colors, Fonts, Radius } from '@/constants/theme';

const MISSING = ['AI eye check chat and a test plan made for you', 'Saved results and trends over time', 'Family profiles', 'ZEISS lens suggestions and doctor reports'];

export function GuestDialog({ visible, onBack, onContinue }: { visible: boolean; onBack: () => void; onContinue: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onBack}>
      <Pressable style={styles.scrim} onPress={onBack}>
        <Pressable style={styles.card} accessibilityRole="alert">
          <View style={styles.icon}>
            <Icon name="profile" size={26} color={Colors.accInk} />
          </View>
          <Text style={styles.title}>Continue as a guest?</Text>
          <Text style={styles.body}>You can take any test from the Tests library and see your result. Results aren&apos;t saved to an account.</Text>
          <View style={styles.list}>
            <Text style={styles.listTitle}>Needs an account</Text>
            {MISSING.map((m) => (
              <View key={m} style={styles.item}>
                <View style={styles.dot} />
                <Text style={styles.itemText}>{m}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.note}>Sign up any time to get the full Visus check.</Text>
          <View style={styles.buttons}>
            <Button title="Back" variant="secondary" onPress={onBack} style={styles.button} />
            <Button title="Continue" onPress={onContinue} style={styles.button} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(17,17,17,0.42)', justifyContent: 'center', paddingHorizontal: 20 },
  card: { borderRadius: 28, backgroundColor: Colors.white, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },
  icon: { alignSelf: 'center', width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accSoft, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 16, fontFamily: Fonts.bold, fontSize: 22, letterSpacing: -0.3, textAlign: 'center', color: Colors.ink },
  body: { marginTop: 8, fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24, textAlign: 'center', color: Colors.muted },
  list: { marginTop: 16, gap: 10, borderRadius: Radius.tile, backgroundColor: Colors.fill, paddingHorizontal: 16, paddingVertical: 14 },
  listTitle: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.inkSoft },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { marginTop: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.muted },
  itemText: { flex: 1, fontFamily: Fonts.regular, fontSize: 15, lineHeight: 21, color: Colors.inkSoft },
  note: { marginTop: 12, fontFamily: Fonts.regular, fontSize: 13, lineHeight: 19, textAlign: 'center', color: Colors.muted },
  buttons: { marginTop: 20, flexDirection: 'row', gap: 10 },
  button: { flex: 1 },
});
