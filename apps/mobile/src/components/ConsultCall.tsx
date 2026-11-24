// C1: the video consult call (patient side, development build: react-native-agora).
// Agora carries only video and voice. Captions, the tests the doctor sends and the consult's state come
// from GET /consults/:id/live, polled every 2 s. Your own speech is captioned on this phone
// (expo-speech-recognition, in the consult's language) and each finished sentence goes to the server,
// which translates it for the doctor. Captions are off until turned on; then they show in a panel. A test the doctor sends opens full screen; the call goes on.
// Loaded lazily by app/consults/[id]/call.tsx, so Expo Go never loads react-native-agora.
import { SPEECH_LOCALE, type Eye, type Language } from '@visus/shared';
import { requireOptionalNativeModule } from 'expo';
import { router } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ActivityIndicator, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  RtcSurfaceView,
  type IRtcEngine,
} from 'react-native-agora';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ExpoSpeechRecognitionModuleType } from 'expo-speech-recognition/build/ExpoSpeechRecognitionModule.types';

import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { Text } from '@/components/Text';
import { drName } from '@/constants/consult';
import { testInfo } from '@/constants/tests';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { getConsult, getLive, joinConsult, sendCaption, submitConsultTest, type Caption, type ConsultDetail, type ConsultTest } from '@/services/consults';
import { TESTS, WHITE_PAGE } from '@/tests';
import type { Answers } from '@/tests/parts';
import { SwitchEye } from '@/tests/SwitchEye';

const Speech = requireOptionalNativeModule<ExpoSpeechRecognitionModuleType>('ExpoSpeechRecognition');
const POLL_MS = 2_000;
const DOCTOR_UID = 1;

type Phase = 'joining' | 'in_call' | 'ended' | 'error';

export default function ConsultCall({ id }: { id: string }) {
  const insets = useSafeAreaInsets();
  const engine = useRef<IRtcEngine | null>(null);
  const [consult, setConsult] = useState<ConsultDetail | null>(null);
  const [phase, setPhase] = useState<Phase>('joining');
  const [error, setError] = useState('');
  const [remotes, setRemotes] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [partial, setPartial] = useState('');
  const [pending, setPending] = useState<ConsultTest | null>(null);
  const [testOpen, setTestOpen] = useState<string | null>(null);
  const lastCaption = useRef<string | undefined>(undefined);
  const dismissed = useRef(new Set<string>());

  const language: Language = consult?.language ?? 'en';

  // ---------- Join ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]);
          if (granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== 'granted') throw new Error('Allow the microphone for Visus to join the call.');
        }
        const [detail, join] = await Promise.all([getConsult(id), joinConsult(id)]);
        if (cancelled) return;
        setConsult(detail);
        const e = createAgoraRtcEngine();
        e.initialize({ appId: join.appId, channelProfile: ChannelProfileType.ChannelProfileCommunication });
        e.registerEventHandler({
          onJoinChannelSuccess: () => setPhase('in_call'),
          onUserJoined: (_c, uid) => setRemotes((r) => (r.includes(uid) ? r : [...r, uid])),
          onUserOffline: (_c, uid) => setRemotes((r) => r.filter((x) => x !== uid)),
          onError: (code, msg) => console.warn(`Agora ${code} ${msg}`),
        });
        e.enableVideo();
        e.setDefaultAudioRouteToSpeakerphone(true);
        e.startPreview();
        e.joinChannel(join.token ?? '', join.channel, join.uid, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          publishCameraTrack: true,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        });
        engine.current = e;
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Couldn't join the call.");
        setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
      hangUp();
    };
  }, [id]);

  function hangUp() {
    Speech?.abort();
    engine.current?.leaveChannel();
    engine.current?.release();
    engine.current = null;
  }

  // ---------- Live state (every 2 s) ----------
  const poll = useEffectEvent(async () => {
    try {
      const live = await getLive(id, lastCaption.current);
      if (live.captions.length) {
        lastCaption.current = live.captions[live.captions.length - 1].id;
        setCaptions((c) => [...c, ...live.captions.filter((n) => !c.some((x) => x.id === n.id))].slice(-100));
      }
      setPending(live.pendingTest);
      if (live.pendingTest && !dismissed.current.has(live.pendingTest.id)) setTestOpen((open) => open ?? live.pendingTest!.id);
      if (!live.pendingTest) setTestOpen(null);
      if (live.status === 'completed' || live.status === 'cancelled') {
        hangUp();
        setPhase('ended');
      }
    } catch {
      // A missed poll is fine: the next one catches up.
    }
  });
  useEffect(() => {
    if (phase !== 'in_call') return;
    void poll();
    const t = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(t);
  }, [phase]);

  // ---------- Captions: your own speech, in the consult's language ----------
  const listening = phase === 'in_call' && captionsOn && !muted && !!Speech;
  const onFinal = useEffectEvent((text: string) => {
    const t = text.trim();
    setPartial('');
    if (t) void sendCaption(id, t, language).then((c) => setCaptions((list) => (list.some((x) => x.id === c.id) ? list : [...list, c].slice(-100))), () => undefined);
  });
  useEffect(() => {
    if (!listening || !Speech) return;
    let stopped = false;
    const start = () => {
      if (stopped) return;
      try {
        Speech.start({ lang: SPEECH_LOCALE[language], interimResults: true, continuous: true });
      } catch {
        // Recognition busy: the end listener retries.
      }
    };
    const subs = [
      Speech.addListener('result', (e) => {
        const text = e.results[0]?.transcript ?? '';
        if (e.isFinal) onFinal(text);
        else setPartial(text);
      }),
      // Android stops after a pause: start again while the call is on.
      Speech.addListener('end', () => setTimeout(start, 300)),
      Speech.addListener('error', (e) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') console.warn(`Captions: ${e.error} ${e.message}`);
      }),
    ];
    void Speech.requestPermissionsAsync().then((p) => p.granted && start());
    return () => {
      stopped = true;
      subs.forEach((s) => s.remove());
      Speech.abort();
      setPartial('');
    };
  }, [listening, language]);

  // ---------- Controls ----------
  function toggleMute() {
    engine.current?.muteLocalAudioStream(!muted);
    setMuted(!muted);
  }
  function toggleCamera() {
    engine.current?.enableLocalVideo(cameraOff);
    engine.current?.muteLocalVideoStream(!cameraOff);
    setCameraOff(!cameraOff);
  }
  function toggleAudioOnly() {
    const next = !audioOnly;
    engine.current?.enableLocalVideo(!next && !cameraOff);
    engine.current?.muteLocalVideoStream(next || cameraOff);
    engine.current?.muteAllRemoteVideoStreams(next);
    setAudioOnly(next);
  }
  function leave() {
    hangUp();
    router.back();
  }

  const doctorName = consult ? drName(consult.doctor.name) : 'Doctor';
  const big = remotes.includes(DOCTOR_UID) ? DOCTOR_UID : remotes[0];
  const speaker = (c: Caption) => (c.from === 'patient' ? 'You' : c.from === 'doctor' ? doctorName : (consult?.clinic.name ?? 'Clinic'));
  const panel = useRef<ScrollView>(null);
  const test = pending && testOpen === pending.id ? pending : null;

  if (phase === 'error' || phase === 'ended')
    return (
      <View style={[styles.center, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.endIcon}>
          <Icon name={phase === 'ended' ? 'checkLarge' : 'alertCircle'} size={30} color={Colors.white} />
        </View>
        <Text style={styles.endTitle}>{phase === 'ended' ? 'The consult has ended' : "Couldn't join the call"}</Text>
        <Text style={styles.endBody}>
          {phase === 'ended' ? 'Your prescription shows on the consult page once the doctor saves it.' : error}
        </Text>
        <Button title={phase === 'ended' ? 'See the consult' : 'Back'} variant="inverted" onPress={() => (phase === 'ended' ? router.replace({ pathname: '/consults/[id]', params: { id } }) : router.back())} style={styles.endButton} />
      </View>
    );

  return (
    <View style={styles.root}>
      {/* The doctor, full screen (or a placeholder until they join / in audio-only mode). */}
      {big !== undefined && !audioOnly ? (
        <RtcSurfaceView canvas={{ uid: big }} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          {phase === 'joining' ? <ActivityIndicator color={Colors.white} /> : <View style={styles.avatar}><Text style={styles.avatarText}>{doctorName.replace(/^Dr\.?\s*/i, '').slice(0, 1)}</Text></View>}
          <Text style={styles.waiting}>{phase === 'joining' ? 'Joining…' : big === undefined ? `Waiting for ${doctorName}…` : `${doctorName} · audio only`}</Text>
        </View>
      )}

      {/* Your own camera, small. */}
      {phase === 'in_call' && !cameraOff && !audioOnly && !test && (
        <View style={[styles.self, { top: insets.top + 12 }]}>
          <RtcSurfaceView canvas={{ uid: 0 }} style={StyleSheet.absoluteFill} zOrderMediaOverlay />
        </View>
      )}

      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.topName}>{doctorName}</Text>
        <Text style={styles.topSub}>{consult ? `${consult.clinic.name} · video consult` : ''}</Text>
      </View>

      {/* A test the doctor sent and you closed: open it again. */}
      {pending && !test && (
        <Pressable accessibilityRole="button" onPress={() => setTestOpen(pending.id)} style={[styles.testBanner, { top: insets.top + 70 }]}>
          <Icon name="eye" size={18} color={Colors.ink} />
          <Text style={styles.testBannerText}>{doctorName} sent a test · Open</Text>
        </Pressable>
      )}

      {/* Captions (only while on): the whole call so far, newest at the bottom, each line in your language. */}
      {captionsOn && (
        <View style={[styles.panel, { bottom: insets.bottom + 96 }]}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>Captions</Text>
            <Pressable accessibilityRole="button" onPress={() => setCaptionsOn(false)} hitSlop={8}>
              <Text style={styles.panelOff}>Turn off</Text>
            </Pressable>
          </View>
          <ScrollView ref={panel} style={styles.panelList} contentContainerStyle={styles.panelBody} onContentSizeChange={() => panel.current?.scrollToEnd({ animated: true })}>
            {!captions.length && !partial && <Text style={styles.panelEmpty}>What you and {doctorName} say shows here, in your language. It is saved with the consult.</Text>}
            {captions.map((c) => (
              <Text key={c.id} style={styles.caption}>
                <Text style={styles.captionWho}>{speaker(c)}: </Text>
                {c.from === 'patient' ? c.text : (c.translations[language] ?? c.text)}
              </Text>
            ))}
            {!!partial && (
              <Text style={[styles.caption, styles.captionPartial]}>
                <Text style={styles.captionWho}>You: </Text>
                {partial}
              </Text>
            )}
          </ScrollView>
        </View>
      )}

      <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
        <Control icon={muted ? 'micOff' : 'mic'} label={muted ? 'Unmute' : 'Mute'} on={muted} onPress={toggleMute} />
        <Control icon={cameraOff ? 'videoOff' : 'video'} label={cameraOff ? 'Camera on' : 'Camera off'} on={cameraOff} onPress={toggleCamera} disabled={audioOnly} />
        <Control icon="speaker" label={audioOnly ? 'Video on' : 'Audio only'} on={audioOnly} onPress={toggleAudioOnly} />
        <Control icon="textSize" label={captionsOn ? 'Captions off' : 'Captions on'} on={!captionsOn} onPress={() => setCaptionsOn(!captionsOn)} disabled={!Speech} />
        <Pressable accessibilityRole="button" accessibilityLabel="Leave the call" onPress={leave} style={[styles.control, styles.hangUp]}>
          <Icon name="hangUp" size={24} color={Colors.white} />
        </Pressable>
      </View>

      {test && (
        <View style={styles.testLayer}>
          <ConsultTestRunner
            key={test.id}
            consultId={id}
            test={test}
            onClose={() => {
              dismissed.current.add(test.id);
              setTestOpen(null);
            }}
            onSent={() => {
              dismissed.current.add(test.id);
              setTestOpen(null);
              setPending(null);
            }}
          />
          {/* The doctor stays in a corner while you take the test; the voice goes on. */}
          {big !== undefined && !audioOnly && (
            <View style={[styles.mini, { top: insets.top + 8 }]}>
              <RtcSurfaceView canvas={{ uid: big }} style={StyleSheet.absoluteFill} zOrderMediaOverlay />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function Control({ icon, label, on, onPress, disabled }: { icon: IconName; label: string; on?: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[styles.control, on && styles.controlOn, disabled && styles.controlDisabled]}>
      <Icon name={icon} size={22} color={on ? Colors.ink : Colors.white} strokeWidth={1.9} />
    </Pressable>
  );
}

type RunPhase = 'test' | 'switch' | 'sending' | 'sent' | 'error';

/**
 * One test the doctor sent, with the app's normal test screen (clinical white page, calibrated sizes).
 * One-eye-at-a-time tests run right then left when the doctor asked for both eyes. Raw answers only:
 * the server scores them and the doctor sees the result card.
 */
function ConsultTestRunner({ consultId, test, onClose, onSent }: { consultId: string; test: ConsultTest; onClose: () => void; onSent: () => void }) {
  const insets = useSafeAreaInsets();
  const info = testInfo(test.testId)!;
  const Test = TESTS[test.testId];
  const eyes: Eye[] = info.eachEye && test.eye === 'both' ? ['right', 'left'] : [test.eye];
  const [eyeIndex, setEyeIndex] = useState(0);
  const [phase, setPhase] = useState<RunPhase>('test');
  const answers = useRef<Partial<Record<Eye, Answers>>>({});
  const startedAt = useRef(0);
  const eye = eyes[eyeIndex];
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  async function send() {
    setPhase('sending');
    const a = answers.current;
    const result = {
      testId: test.testId,
      eye: eyes.length === 2 ? ('both' as const) : eyes[0],
      answers: info.eachEye ? Object.fromEntries(eyes.map((e) => [e, a[e]])) : (a[eye] ?? {}),
      durationSec: Math.round((Date.now() - startedAt.current) / 1000),
    };
    try {
      await submitConsultTest(consultId, test.id, result);
      setPhase('sent');
      setTimeout(onSent, 1200);
    } catch {
      setPhase('error');
    }
  }

  function done(result: Answers) {
    answers.current[eye] = result;
    if (eyeIndex < eyes.length - 1) {
      setEyeIndex(eyeIndex + 1);
      setPhase('switch');
    } else void send();
  }

  return (
    <View style={[styles.testPage, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }, WHITE_PAGE.includes(test.testId) && styles.white]}>
      {phase === 'test' && <Test key={eye} eye={eye} onExit={onClose} onDone={done} />}
      {phase === 'switch' && <SwitchEye title={info.name} onExit={onClose} onStart={() => setPhase('test')} />}
      {phase !== 'test' && phase !== 'switch' && (
        <View style={styles.center}>
          {phase === 'sending' && <ActivityIndicator color={Colors.ink} />}
          <Text style={styles.testMsg}>
            {phase === 'sending' ? 'Sending your answers…' : phase === 'sent' ? 'Sent to your doctor' : "Couldn't send your answers"}
          </Text>
          {phase === 'error' && <Button title="Try again" onPress={() => void send()} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.hero },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24, backgroundColor: Colors.hero },
  avatar: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  avatarText: { fontFamily: Fonts.bold, fontSize: 38, color: Colors.white },
  waiting: { fontFamily: Fonts.medium, fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  self: { position: 'absolute', right: 14, width: 104, height: 148, borderRadius: Radius.tile, overflow: 'hidden', backgroundColor: '#000' },
  mini: { position: 'absolute', right: 10, width: 92, height: 124, borderRadius: Radius.tile, overflow: 'hidden', backgroundColor: '#000' },
  top: { position: 'absolute', left: 18, right: 130 },
  topName: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.white },
  topSub: { fontFamily: Fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  testBanner: { position: 'absolute', left: 18, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 40, borderRadius: Radius.pill, backgroundColor: Colors.white },
  testBannerText: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.ink },
  panel: { position: 'absolute', left: 12, right: 12, maxHeight: '42%', borderRadius: Radius.card, backgroundColor: 'rgba(15,16,17,0.88)', overflow: 'hidden' },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  panelTitle: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.white },
  panelOff: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.accBright },
  panelList: { flexGrow: 0 },
  panelBody: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  panelEmpty: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.75)' },
  caption: { fontFamily: Fonts.regular, fontSize: 17, lineHeight: 23, color: Colors.white },
  captionWho: { fontFamily: Fonts.semibold, color: Colors.accBright },
  captionPartial: { opacity: 0.75 },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'center', gap: 12, paddingTop: 14, backgroundColor: 'rgba(0,0,0,0.35)' },
  control: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  controlOn: { backgroundColor: Colors.white },
  controlDisabled: { opacity: 0.4 },
  hangUp: { backgroundColor: '#D93025' },
  testLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: Colors.white },
  testPage: { flex: 1, paddingHorizontal: 20, backgroundColor: Colors.bg },
  white: { backgroundColor: Colors.white },
  testMsg: { fontFamily: Fonts.semibold, fontSize: 18, color: Colors.ink },
  endIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  endTitle: { fontFamily: Fonts.bold, fontSize: 24, color: Colors.white, textAlign: 'center' },
  endBody: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  endButton: { alignSelf: 'stretch', marginTop: 10 },
});
