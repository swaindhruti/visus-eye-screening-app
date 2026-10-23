import { TEST_CATALOG } from '@visus/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { alertError } from '@/components/alertError';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text, TextInput } from '@/components/Text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useOnline } from '@/services/network';
import { startListening, voiceAvailable } from '@/services/voice';
import { listProfiles } from '@/services/profiles';
import { createSession, intakeChat, intakeText, type IntakeMessage, type Session } from '@/services/sessions';
import { useCheck } from '@/store/check';

type Message = { from: 'ai' | 'me'; text: string; chips?: string[]; cta?: boolean };

const minutes = (s: Session) =>
  s.plan.reduce((sum, p) => sum + (TEST_CATALOG.find((t) => t.id === p.testId)?.minutes ?? 0), 0);

/**
 * Screen 9: Issue intake. A chat with the AI (POST /intake/chat): it asks follow-up questions
 * with quick-reply chips until it knows enough, then the whole chat goes to POST /sessions for the plan.
 */
export default function Intake() {
  const insets = useSafeAreaInsets();
  const start = useCheck((s) => s.start);
  const scroll = useRef<ScrollView>(null);

  const [name, setName] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  /** The chat after the greeting. */
  const [chat, setChat] = useState<IntakeMessage[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [failed, setFailed] = useState<'chat' | 'plan' | null>(null);
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const stopVoice = useRef<(() => void) | null>(null);

  // Voice input: the words fill the box live (after anything already typed); the user checks and sends.
  async function toggleVoice() {
    if (listening) return stopVoice.current?.();
    const before = text.trim();
    try {
      setListening(true);
      stopVoice.current = await startListening({
        onText: (words) => setText(before ? `${before} ${words}` : words),
        onEnd: () => setListening(false),
        onError: (message) => {
          setListening(false);
          alertError(new Error(message), 'Voice input');
        },
      });
    } catch (e) {
      setListening(false);
      alertError(e, 'Voice input');
    }
  }
  useEffect(() => () => stopVoice.current?.(), []);

  // Whose check (Who is this for); the account owner by default.
  const params = useLocalSearchParams<{ profileId?: string }>();
  useEffect(() => {
    listProfiles().then((all) => {
      const p = all.find((x) => x.id === params.profileId) ?? all[0];
      setName(p.name.split(' ')[0]);
      setProfileId(p.id);
    }, alertError);
  }, [params.profileId]);

  const greeting = `Hi${name ? ` ${name}` : ''}. What's bothering your eyes today?`;
  const withGreeting = (list: IntakeMessage[]): IntakeMessage[] => [{ from: 'ai', text: greeting }, ...list];

  async function plan(list: IntakeMessage[]) {
    if (!profileId) return;
    setFailed(null);
    setTyping(true);
    try {
      const s = await createSession({ profileId, intake: intakeText(withGreeting(list)), mode: 'full' });
      start('full', s);
      setSession(s);
    } catch {
      setFailed('plan');
    } finally {
      setTyping(false);
    }
  }

  /** Asks the AI for its next turn; when it has enough, makes the plan. */
  async function reply(list: IntakeMessage[]) {
    if (!profileId) return;
    setFailed(null);
    setTyping(true);
    try {
      const turn = await intakeChat(profileId, withGreeting(list));
      if (turn.done) {
        setDone(true);
        return void (await plan(list));
      }
      setChat([...list, { from: 'ai', text: turn.reply }]);
      setChips(turn.chips);
    } catch {
      setFailed('chat');
    } finally {
      setTyping(false);
    }
  }

  function send(value: string) {
    const v = value.trim();
    if (!v || typing || done) return;
    stopVoice.current?.();
    setText('');
    setChips([]);
    const next: IntakeMessage[] = [...chat, { from: 'me', text: v }];
    setChat(next);
    void reply(next);
  }

  const messages: Message[] = [{ from: 'ai', text: greeting }, ...chat.map((m) => ({ ...m }))];
  const last = messages[messages.length - 1];
  if (!typing && last.from === 'ai' && chips.length) last.chips = chips;
  if (done && session) {
    messages.push({
      from: 'ai',
      text: `Thanks, that helps. I've picked ${session.plan.length} tests for you, about ${minutes(session)} minutes.`,
      cta: true,
    });
  }
  if (failed && !typing)
    messages.push({
      from: 'ai',
      text: failed === 'plan' ? "Sorry, I couldn't make your plan just now." : "Sorry, I couldn't reply just now.",
      chips: ['Try again'],
    });
  const retry = () => (failed === 'plan' ? plan(chat) : reply(chat));

  // Offline (54): the AI chat needs internet; tests can still be picked by hand.
  const online = useOnline();
  const canSend = online && !!profileId && text.trim().length > 0 && !typing && !done;

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <View style={[styles.inner, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 16 }]}>
        <ScreenHeader
          left="back"
          onLeft={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          title="New check"
        />
        {!online && (
          <View style={styles.offlinePill}>
            <Icon name="wifiOff" size={16} color={Colors.inkSoft} />
            <Text style={styles.offlinePillText}>You&apos;re offline</Text>
          </View>
        )}

        <ScrollView
          ref={scroll}
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {messages.map((m, i) => (
            <View key={i} style={[styles.turn, m.from === 'me' && styles.turnMe]}>
              <View style={[styles.bubble, m.from === 'me' ? styles.me : styles.ai]}>
                <Text style={[styles.bubbleText, m.from === 'me' && styles.meText]}>{m.text}</Text>
              </View>
              {m.chips && (
                <View style={styles.chips}>
                  {m.chips.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => (c === 'Try again' ? void retry() : send(c))}
                      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
                      <Text style={styles.chipText}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {m.cta && (
                <Pressable
                  onPress={() => router.push('/check/plan')}
                  style={({ pressed }) => [styles.cta, pressed && styles.chipPressed]}>
                  <Text style={styles.ctaText}>See my test plan</Text>
                  <Icon name="arrowRight" size={18} color={Colors.white} strokeWidth={2.2} />
                </Pressable>
              )}
            </View>
          ))}
          {!online && (
            <View style={styles.offlineCard}>
              <View style={styles.offlineTop}>
                <View style={styles.offlineIcon}>
                  <Icon name="wifiOff" size={20} strokeWidth={1.9} />
                </View>
                <View style={styles.offlineText}>
                  <Text style={styles.offlineTitle}>AI chat needs internet</Text>
                  <Text style={styles.offlineBody}>
                    Tests still work. Pick them yourself and your answers wait on this phone until you&apos;re back online.
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.dismissTo('/tests')}
                style={({ pressed }) => [styles.cta, styles.offlineButton, pressed && styles.chipPressed]}>
                <Text style={styles.ctaText}>Choose tests myself</Text>
                <Icon name="arrowRight" size={18} color={Colors.white} strokeWidth={2.2} />
              </Pressable>
            </View>
          )}
          {typing && (
            <View style={[styles.bubble, styles.ai, styles.typing]}>
              <View style={[styles.dot, { backgroundColor: '#BDBDB8' }]} />
              <View style={[styles.dot, { backgroundColor: '#A5A5A0' }]} />
              <View style={[styles.dot, { backgroundColor: '#8A8A85' }]} />
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputBar, !online && styles.inputOff]}>
          <TextInput
            editable={online}
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => send(text)}
            placeholder={!online ? 'Chat is offline' : listening ? 'Listening…' : done ? 'Add anything else…' : 'Type your answer…'}
            placeholderTextColor={Colors.faint}
            returnKeyType="send"
            style={styles.input}
          />
          {voiceAvailable && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={listening ? 'Stop listening' : 'Speak instead of typing'}
              accessibilityState={{ selected: listening }}
              disabled={!online || typing || done}
              onPress={() => void toggleVoice()}
              style={[styles.round, styles.mic, listening && styles.micOn]}>
              <Icon name={listening ? 'stop' : 'mic'} size={20} color={listening ? Colors.white : Colors.ink} strokeWidth={1.9} />
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            disabled={!canSend}
            onPress={() => send(text)}
            style={[styles.round, { backgroundColor: canSend ? Colors.ink : '#D6D6D1' }]}>
            <Icon name="send" size={18} color={Colors.white} strokeWidth={2.2} />
          </Pressable>
        </View>
        <Text style={styles.disclaimer}>Visus isn&apos;t a diagnosis. Sudden vision loss? See a doctor now.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  offlinePill: {
    alignSelf: 'center',
    marginTop: 12,
    minHeight: 32,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 99,
    backgroundColor: Colors.pill,
  },
  offlinePillText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.inkSoft },
  offlineCard: { padding: 16, gap: 14, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  offlineTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  offlineIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center' },
  offlineText: { flex: 1, minWidth: 0, gap: 3 },
  offlineTitle: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.ink },
  offlineBody: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, color: Colors.muted },
  offlineButton: { alignSelf: 'stretch', justifyContent: 'center', height: 48, borderRadius: 14 },
  inputOff: { backgroundColor: Colors.fill },
  inner: { flex: 1, paddingHorizontal: Spacing.xl },
  chat: { flex: 1 },
  chatContent: { flexGrow: 1, justifyContent: 'flex-end', gap: 12, paddingTop: 16, paddingBottom: 14 },
  turn: { alignItems: 'flex-start', gap: 8 },
  turnMe: { alignItems: 'flex-end' },
  bubble: { maxWidth: '82%', paddingVertical: 11, paddingHorizontal: 15, borderWidth: 1, borderRadius: 18 },
  ai: { backgroundColor: Colors.card, borderColor: Colors.border, borderBottomLeftRadius: 6 },
  me: { backgroundColor: Colors.ink, borderColor: Colors.ink, borderBottomRightRadius: 6 },
  bubbleText: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 22, color: Colors.ink },
  meText: { color: Colors.white },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.card,
    justifyContent: 'center',
  },
  chipPressed: { transform: [{ scale: 0.97 }] },
  chipText: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.ink },
  cta: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaText: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.white },
  typing: { height: 42, paddingVertical: 0, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  inputBar: {
    height: 56,
    paddingLeft: 18,
    paddingRight: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  input: { flex: 1, minWidth: 0, fontFamily: Fonts.regular, fontSize: 16, color: Colors.ink },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  mic: { backgroundColor: Colors.fill },
  micOn: { backgroundColor: Colors.ink },
  disclaimer: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 17, color: '#8A8A85', textAlign: 'center', marginTop: 10 },
});
