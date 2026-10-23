import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { GuestDialog } from '@/components/GuestDialog';
import { Text } from '@/components/Text';
import { Colors, Fonts, Type } from '@/constants/theme';
import { setGuest } from '@/services/auth';
import { useCheck } from '@/store/check';

/** Screen 1: Entry. */
export default function Welcome() {
  const [guestDialog, setGuestDialog] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.wordmark}>Visus</Text>

      <View style={styles.main}>
        <View style={styles.art}>
          <Image
            source={require('@/assets/images/visus-eye.png')}
            accessibilityLabel="Hand-drawn blue eye"
            contentFit="contain"
            style={styles.image}
          />
        </View>
        <Text style={styles.hero}>Quick eye checks, right on your phone.</Text>
        <Text style={styles.body}>Simple guided tests for sharpness, focus and colour, whenever you have five minutes.</Text>
      </View>

      <View style={styles.actions}>
        <Button title="Sign up" onPress={() => router.push('/signup')} />
        <Button title="Log in" variant="secondary" onPress={() => router.push('/login')} />
        <Pressable accessibilityRole="button" onPress={() => setGuestDialog(true)} style={styles.guest}>
          <Text style={styles.guestText}>Continue as guest</Text>
        </Pressable>
      </View>
      <GuestDialog
        visible={guestDialog}
        onBack={() => setGuestDialog(false)}
        onContinue={() => {
          setGuestDialog(false);
          setGuest(true);
          useCheck.getState().reset();
          router.replace('/tests');
        }}
      />

      <Text style={styles.terms}>
        By continuing you agree to our <Text style={styles.link}>Terms</Text> and{' '}
        <Text style={styles.link}>Privacy Policy</Text>.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: 24 },
  wordmark: { fontFamily: Fonts.bold, fontSize: 20, letterSpacing: -0.2, color: Colors.ink },
  main: { flex: 1, minHeight: 0, justifyContent: 'flex-end', paddingBottom: 32 },
  art: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', paddingTop: 8, paddingBottom: 20 },
  image: { width: '100%', height: '100%', maxHeight: 360 },
  // Smaller than the design's hero, by request, so the illustration gets more room.
  hero: { ...Type.hero, fontSize: 32, lineHeight: 35, letterSpacing: -0.96, color: Colors.ink },
  body: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24, color: Colors.muted, marginTop: 12, maxWidth: 330 },
  actions: { gap: 12 },
  guest: { height: 40, alignItems: 'center', justifyContent: 'center' },
  guestText: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.muted },
  terms: { ...Type.caption, lineHeight: 20, color: Colors.muted, textAlign: 'center', marginTop: 16 },
  link: { fontFamily: Fonts.semibold, color: Colors.ink },
});
