import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Text } from '@/components/Text';
import { Colors, Fonts, Radius, Sizes, Type } from '@/constants/theme';
import { useAuth } from '@/store/auth';

const TABS: Record<string, { label: string; icon: IconName }> = {
  home: { label: 'Home', icon: 'home' },
  tests: { label: 'Tests', icon: 'eye' },
  results: { label: 'Results', icon: 'results' },
  profile: { label: 'Profile', icon: 'profile' },
};

/** Gap between the bar and the screen bottom: 26px in the design, more above a system nav bar. */
export const tabBarBottom = (insetBottom: number) => Math.max(insetBottom + 10, 26);

/** Space a tab screen leaves at the bottom so content clears the bar (112px in the design). */
export const tabBarSpace = (insetBottom: number) => tabBarBottom(insetBottom) + Sizes.tabBar + 20;

/** Floating pill tab bar from the design. Used as the `tabBar` of (tabs). */
export function BottomTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const guest = useAuth((s) => s.guest);
  // Guests only have the Tests library: a Guest mode bar with the way to the full app.
  if (guest)
    return (
      <View style={[styles.bar, styles.guestBar, { bottom: tabBarBottom(insets.bottom) }]}>
        <View style={styles.guestText}>
          <Text style={styles.guestTitle}>Guest mode</Text>
          <Text style={styles.guestSub} numberOfLines={1}>
            Results aren&apos;t saved
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/login')} style={({ pressed }) => [styles.guestLink, pressed && styles.pressed]}>
          <Text style={styles.guestLinkText}>Log in</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/signup')} style={[styles.guestLink, styles.guestSignup]}>
          <Text style={[styles.guestLinkText, { color: Colors.white }]}>Sign up</Text>
        </Pressable>
      </View>
    );
  return (
    <View style={[styles.bar, { bottom: tabBarBottom(insets.bottom) }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const color = focused ? Colors.white : Colors.tabInactive;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={onPress}
            style={({ pressed }) => [styles.tab, focused && styles.active, !focused && pressed && styles.pressed]}>
            <Icon name={tab.icon} size={22} color={color} />
            <Text style={[Type.tab, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: Sizes.tabBar,
    padding: 6,
    gap: 4,
    flexDirection: 'row',
    borderRadius: Radius.hero,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    boxShadow: '0 10px 30px rgba(17,17,17,0.08)',
  },
  tab: {
    flex: 1,
    borderRadius: Radius.tile,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  active: { backgroundColor: Colors.ink },
  pressed: { backgroundColor: Colors.pressed },
  guestBar: { alignItems: 'center', paddingLeft: 16 },
  guestText: { flex: 1, minWidth: 0 },
  guestTitle: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.ink },
  guestSub: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.muted },
  guestLink: { height: '100%', paddingHorizontal: 12, borderRadius: Radius.tile, justifyContent: 'center' },
  guestSignup: { paddingHorizontal: 16, backgroundColor: Colors.ink },
  guestLinkText: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.inkSoft },
});
