// C1: the video consult call. The call itself (react-native-agora) needs the installed app (development
// build), so it loads lazily; in Expo Go this screen says so instead.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { lazy, Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { Colors, Fonts } from '@/constants/theme';

const ConsultCall = lazy(() => import('@/components/ConsultCall'));
const native = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export default function CallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      {native ? (
        <Suspense
          fallback={
            <View style={styles.center}>
              <ActivityIndicator color={Colors.white} />
            </View>
          }>
          <ConsultCall id={id} />
        </Suspense>
      ) : (
        <View style={styles.center}>
          <Text style={styles.text}>Video calls need the installed Visus app, not Expo Go.</Text>
          <Button title="Back" variant="inverted" onPress={() => router.back()} />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: Colors.hero },
  text: { fontFamily: Fonts.semibold, fontSize: 17, color: Colors.white, textAlign: 'center' },
});
