// Day 1 checks for the remote consult (developer screen, development build only):
// 1. Does the phone's speech recognition still hear the mic while an Agora call is on,
//    and does the other side still hear us while it listens?
// 2. Which speech languages (en-IN, hi-IN, or-IN) does this phone recognise?
// Loaded lazily by app/settings/call-check.tsx, so Expo Go never loads react-native-agora.
import { requireOptionalNativeModule } from 'expo';
import { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, StyleSheet, View } from 'react-native';
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  RtcSurfaceView,
  type IRtcEngine,
  type IRtcEngineEventHandler,
} from 'react-native-agora';
import type { ExpoSpeechRecognitionModuleType } from 'expo-speech-recognition/build/ExpoSpeechRecognitionModule.types';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { getCheckToken } from '@/services/callCheck';

const Speech = requireOptionalNativeModule<ExpoSpeechRecognitionModuleType>('ExpoSpeechRecognition');
const LOCALES = ['en-IN', 'hi-IN', 'or-IN'] as const;

export default function CallCheck() {
  return (
    <View style={{ gap: Spacing.xxl }}>
      <CallPart />
      <LanguagesPart />
    </View>
  );
}

/** Check 1: join the test channel, then listen with speech recognition during the call. */
function CallPart() {
  const engine = useRef<IRtcEngine | null>(null);
  const [joined, setJoined] = useState(false);
  const [remote, setRemote] = useState<number | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [finals, setFinals] = useState(0);
  const note = (line: string) => setLog((l) => [`${new Date().toLocaleTimeString()} ${line}`, ...l].slice(0, 12));

  useEffect(() => () => leave(), []);

  async function join() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]);
        if (Object.values(granted).some((g) => g !== 'granted')) return note('Camera or microphone not allowed');
      }
      const j = await getCheckToken(2);
      const e = createAgoraRtcEngine();
      e.initialize({ appId: j.appId, channelProfile: ChannelProfileType.ChannelProfileCommunication });
      const handler: IRtcEngineEventHandler = {
        onJoinChannelSuccess: () => {
          setJoined(true);
          note(`Joined "${j.channel}" as uid ${j.uid}`);
        },
        onUserJoined: (_c, uid) => {
          setRemote(uid);
          note(`Other side joined (uid ${uid})`);
        },
        onUserOffline: (_c, uid) => {
          setRemote(null);
          note(`Other side left (uid ${uid})`);
        },
        onError: (err, msg) => note(`Agora error ${err} ${msg}`),
        onAudioVolumeIndication: (_c, speakers) => {
          const me = speakers.find((s) => s.uid === 0);
          if (me) setMicLevel(me.volume ?? 0);
        },
      };
      e.registerEventHandler(handler);
      e.enableVideo();
      e.startPreview();
      e.enableAudioVolumeIndication(400, 3, true);
      e.joinChannel(j.token ?? '', j.channel, j.uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        publishCameraTrack: true,
        autoSubscribeAudio: true,
        autoSubscribeVideo: true,
      });
      engine.current = e;
      note('Joining…');
    } catch (err) {
      note(`Couldn't join: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function leave() {
    Speech?.abort();
    engine.current?.leaveChannel();
    engine.current?.release();
    engine.current = null;
    setJoined(false);
    setRemote(null);
    setListening(false);
  }

  async function listen() {
    if (!Speech) return note('Speech recognition missing in this build');
    const p = await Speech.requestPermissionsAsync();
    if (!p.granted) return note('Speech permission not allowed');
    const subs = [
      Speech.addListener('start', () => note('Recognition started')),
      Speech.addListener('result', (e) => {
        setHeard(e.results[0]?.transcript ?? '');
        if (e.isFinal) setFinals((n) => n + 1);
      }),
      Speech.addListener('error', (e) => note(`Recognition error: ${e.error} ${e.message}`)),
      Speech.addListener('end', () => {
        note('Recognition ended');
        setListening(false);
        subs.forEach((s) => s.remove());
      }),
    ];
    setListening(true);
    Speech.start({ lang: 'en-IN', interimResults: true, continuous: true });
  }

  return (
    <View style={styles.card}>
      <Text style={styles.h}>1 · Call + speech recognition</Text>
      <Text style={styles.p}>Join, open the same channel as uid 1 on the laptop (Agora web demo), then tap Listen and talk.</Text>
      {joined && (
        <View style={styles.videos}>
          <RtcSurfaceView canvas={{ uid: 0 }} style={styles.video} />
          {remote !== null ? <RtcSurfaceView canvas={{ uid: remote }} style={styles.video} /> : <View style={[styles.video, styles.empty]} />}
        </View>
      )}
      <Text style={styles.p}>
        In call: {joined ? 'yes' : 'no'} · Other side: {remote ?? 'none'} · My mic level (Agora): {micLevel}
      </Text>
      <Text style={styles.p}>
        Recognition: {listening ? 'listening' : 'off'} · Finished sentences: {finals}
      </Text>
      <Text style={styles.heard}>{heard || '…'}</Text>
      <View style={styles.row}>
        {!joined ? <Button title="Join test call" onPress={join} /> : <Button title="Leave" variant="secondary" onPress={leave} />}
        {joined && (listening ? <Button title="Stop listening" variant="secondary" onPress={() => Speech?.stop()} /> : <Button title="Listen" onPress={listen} />)}
      </View>
      {log.map((l) => (
        <Text key={l} style={styles.log}>
          {l}
        </Text>
      ))}
    </View>
  );
}

/** Check 2: which locales this phone's recognizer supports, and a 5-second try in each. */
function LanguagesPart() {
  const [info, setInfo] = useState<string>('');
  const [tryLang, setTryLang] = useState<string | null>(null);
  const [result, setResult] = useState('');

  async function load() {
    if (!Speech) return setInfo('Speech recognition missing in this build');
    try {
      const services = Platform.OS === 'android' ? Speech.getSpeechRecognitionServices().join(', ') : 'iOS';
      const def = Platform.OS === 'android' ? Speech.getDefaultRecognitionService().packageName : '';
      const { locales, installedLocales } = await Speech.getSupportedLocales({});
      const rows = LOCALES.map((l) => `${l}: ${locales.includes(l) ? 'supported' : 'not listed'}${installedLocales.includes(l) ? ', offline' : ''}`);
      setInfo([`Default service: ${def || '?'}`, `Services: ${services || 'none'}`, `Locales listed: ${locales.length}`, ...rows].join('\n'));
    } catch (e) {
      setInfo(`Couldn't read locales: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function tryIt(lang: string) {
    if (!Speech) return;
    const p = await Speech.requestPermissionsAsync();
    if (!p.granted) return setResult('Speech permission not allowed');
    setTryLang(lang);
    setResult('Listening… say a sentence');
    const subs = [
      Speech.addListener('result', (e) => setResult(`${lang}: ${e.results[0]?.transcript ?? ''}`)),
      Speech.addListener('error', (e) => setResult(`${lang} error: ${e.error} ${e.message}`)),
      Speech.addListener('end', () => {
        setTryLang(null);
        subs.forEach((s) => s.remove());
      }),
    ];
    Speech.start({ lang, interimResults: true, continuous: false });
  }

  return (
    <View style={styles.card}>
      <Text style={styles.h}>2 · Speech languages</Text>
      <Button title="Show supported languages" variant="secondary" onPress={load} />
      {!!info && <Text style={styles.log}>{info}</Text>}
      <View style={styles.row}>
        {LOCALES.map((l) => (
          <Button key={l} title={tryLang === l ? '…' : `Try ${l}`} variant="secondary" disabled={!!tryLang} onPress={() => tryIt(l)} />
        ))}
      </View>
      {!!result && <Text style={styles.heard}>{result}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.card, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md },
  h: { fontFamily: Fonts.bold, fontSize: 18 },
  p: { color: Colors.muted, fontSize: 15 },
  heard: { fontFamily: Fonts.semibold, fontSize: 17 },
  log: { color: Colors.inkSoft, fontSize: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  videos: { flexDirection: 'row', gap: Spacing.sm },
  video: { flex: 1, height: 200, borderRadius: Radius.tile, overflow: 'hidden', backgroundColor: Colors.hero },
  empty: { opacity: 0.4 },
});
