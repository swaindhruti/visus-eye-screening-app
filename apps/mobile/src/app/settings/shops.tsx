import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { alertError } from '@/components/alertError';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { Colors, Fonts, StatusColors } from '@/constants/theme';
import { getMyPhone, listLinkedShops, setMyPhone, unlinkShop, type ShopRequest } from '@/services/shops';

/** Settings → Optical shops: the number shops find you by, and the shops that can see your checks. */
export default function LinkedShops() {
  const [phone, setPhone] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [shops, setShops] = useState<ShopRequest[]>([]);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      getMyPhone()
        .then((p) => live && setPhone(p))
        .catch(() => undefined);
      listLinkedShops()
        .then((s) => live && setShops(s))
        .catch(() => undefined);
      return () => {
        live = false;
      };
    }, []),
  );

  async function save() {
    setBusy(true);
    try {
      setPhone(await setMyPhone(draft));
      setEditing(false);
    } catch (e) {
      alertError(e);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await unlinkShop(id);
      setShops((s) => s.filter((x) => x.id !== id));
    } catch (e) {
      alertError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <ScreenHeader left="back" onLeft={() => router.back()} title="Optical shops" />
      <Text style={styles.intro}>
        An optical shop can add you by your mobile number. You then get a request here and on Home. Shops you allow can see your checks, and the
        checks they run are saved in your Results.
      </Text>

      <Text style={styles.section}>Mobile number</Text>
      <View style={styles.card}>
        {editing ? (
          <View style={styles.edit}>
            <TextField label="Mobile number" value={draft} onChangeText={setDraft} keyboardType="phone-pad" placeholder="98765 43210" autoFocus />
            <Button title={busy ? 'Saving…' : 'Save'} disabled={busy || draft.replace(/\D/g, '').length < 10} onPress={() => void save()} />
          </View>
        ) : (
          <View style={styles.row}>
            <Icon name="phone" size={20} strokeWidth={1.8} />
            <View style={styles.text}>
              <Text style={styles.title}>{phone ?? 'Not added'}</Text>
              <Text style={styles.sub}>{phone ? 'Shops can send you a request' : 'Add it so a shop can link your account'}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={styles.pill}>
              <Text style={styles.pillText}>{phone ? 'Change' : 'Add'}</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Text style={styles.section}>Shops that can see your checks</Text>
      <View style={styles.card}>
        {shops.length === 0 && <Text style={styles.empty}>None yet.</Text>}
        {shops.map((s, i) => (
          <View key={s.id} style={[styles.row, i > 0 && styles.divider]}>
            <Icon name="shieldCheck" size={20} strokeWidth={1.8} />
            <View style={styles.text}>
              <Text style={styles.title}>{s.shopName}</Text>
              <Text style={styles.sub}>{s.city || 'Linked'}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${s.shopName}`} disabled={busy} onPress={() => void remove(s.id)} style={styles.pill}>
              <Text style={[styles.pillText, styles.remove]}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <Text style={styles.note}>A removed shop keeps only the checks it ran for you.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 12, fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22, color: Colors.muted },
  section: { marginTop: 18, marginBottom: 8, marginLeft: 4, fontFamily: Fonts.bold, fontSize: 13, color: Colors.muted },
  card: { paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  edit: { paddingVertical: 14, gap: 12 },
  row: { minHeight: 64, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.divider },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: Fonts.semibold, fontSize: 16, color: Colors.ink },
  sub: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.muted },
  pill: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.ink },
  remove: { color: StatusColors.see_doctor.fg },
  empty: { paddingVertical: 18, fontFamily: Fonts.regular, fontSize: 15, color: Colors.muted },
  note: { marginTop: 8, marginHorizontal: 4, fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18, color: Colors.muted },
});
