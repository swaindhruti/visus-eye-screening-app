import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { alertError } from '@/components/alertError';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { answerShopRequest, listShopRequests, type ShopRequest } from '@/services/shops';

/**
 * Home: an optical shop added you by phone and asks to see your eye records. Allow: the shop sees
 * your checks and the checks it runs land in your Results. You can remove it in Settings.
 */
export function ShopRequestCard({ onAnswered }: { onAnswered?: () => void }) {
  const [requests, setRequests] = useState<ShopRequest[]>([]);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      listShopRequests()
        .then((r) => live && setRequests(r))
        .catch(() => undefined);
      return () => {
        live = false;
      };
    }, []),
  );

  async function answer(id: string, approve: boolean) {
    setBusy(true);
    try {
      await answerShopRequest(id, approve);
      setRequests((r) => r.filter((x) => x.id !== id));
      onAnswered?.();
    } catch (e) {
      alertError(e);
    } finally {
      setBusy(false);
    }
  }

  if (!requests.length) return null;
  return (
    <>
      {requests.map((r) => (
        <View key={r.id} style={styles.card}>
          <View style={styles.top}>
            <View style={styles.icon}>
              <Icon name="shieldCheck" size={20} color={Colors.accInk} />
            </View>
            <View style={styles.text}>
              <Text style={styles.title}>
                {r.shopName}
                {r.city ? `, ${r.city}` : ''} wants to see your eye records
              </Text>
              <Text style={styles.body}>
                If you allow it, the shop sees your checks and the checks it runs for you are saved here. You can remove it in Settings.
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void answer(r.id, false)} style={[styles.btn, styles.decline]}>
              <Text style={styles.declineText}>Decline</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void answer(r.id, true)} style={[styles.btn, styles.allow]}>
              <Text style={styles.allowText}>Allow</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.accSoft, backgroundColor: Colors.card },
  top: { flexDirection: 'row', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accSoft },
  text: { flex: 1, gap: 4 },
  title: { fontFamily: Fonts.bold, fontSize: 16, lineHeight: 21, color: Colors.ink },
  body: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, color: Colors.muted },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  decline: { borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.card },
  declineText: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.ink },
  allow: { backgroundColor: Colors.ink },
  allowText: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.white },
});
