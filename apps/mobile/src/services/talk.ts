// Talking with Visus on the phone.
// speak(): the Visus voice (Sarvam via POST /voice/tts), else the phone's own voice (expo-speech).
// useTalk().hear(): records until you stop talking, POST /voice/stt turns it into text; without the
// server voice, the phone's speech recognition (installed app only). Nothing here blocks a check:
// every failure just returns null and the screen carries on with typing and tapping.
// expo-audio and expo-file-system load lazily: a development build made before they were added
// doesn't have them, and then talk mode uses the phone's voice and speech recognition only.
import { SPEECH_LOCALE, type Language, type SttResponse, type TtsResponse, type VoiceStatus } from '@visus/shared';
import { requireOptionalNativeModule } from 'expo';
import type { AudioPlayer, AudioRecorder } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, request, USE_MOCK } from '@/services/api';
import { startListening, voiceAvailable } from '@/services/voice';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';

export type VoiceState = 'idle' | 'speaking' | 'listening' | 'thinking';
export type Heard = { text: string; language: Language | null };

/** This build can record and play audio files (Expo Go and builds made after expo-audio was added). */
const audioReady = !!requireOptionalNativeModule('ExpoAudio') && !!requireOptionalNativeModule('FileSystem');

/** False once the server said its voice is off (503: no key, or the Sarvam credits are used up): use the phone's voice from then on. */
let serverVoice = true;
const serverOn = () => audioReady && serverVoice && !USE_MOCK && !!useAuth.getState().token && !useAuth.getState().guest;

async function ttsFile(text: string, language: Language): Promise<string | null> {
  if (!serverOn() || !text.trim()) return null;
  try {
    const res = await request<TtsResponse>('/voice/tts', { method: 'POST', body: { text: text.slice(0, 2000), language } });
    const { File, Paths } = await import('expo-file-system');
    const file = new File(Paths.cache, `visus-voice-${Date.now()}.${res.mime.includes('mpeg') ? 'mp3' : 'wav'}`);
    file.write(res.audio, { encoding: 'base64' });
    return file.uri;
  } catch (e) {
    if (e instanceof ApiError && e.status === 503) serverVoice = false;
    return null;
  }
}

async function sttFile(uri: string, language?: Language): Promise<SttResponse | null> {
  if (!serverOn()) return null;
  const form = new FormData();
  // React Native's FormData takes a file as { uri, name, type }.
  form.append('file', { uri, name: 'answer.m4a', type: 'audio/m4a' } as unknown as Blob);
  if (language) form.append('language', language);
  try {
    return await request<SttResponse>('/voice/stt', { method: 'POST', form });
  } catch (e) {
    if (e instanceof ApiError && e.status === 503) serverVoice = false;
    return null;
  }
}

/** Many phones have no Odia voice: then the phone stays quiet instead of reading Odia in English. */
let deviceLanguages: string[] | null = null;
async function deviceSpeaks(language: Language) {
  if (language === 'en') return true;
  deviceLanguages ??= (await Speech.getAvailableVoicesAsync().catch(() => [])).map((v) => v.language.toLowerCase());
  return deviceLanguages.some((l) => l.startsWith(language));
}

let stopCurrent: (() => void) | null = null;

/** Stops whatever Visus is saying. */
export function stopSpeaking() {
  stopCurrent?.();
  stopCurrent = null;
  Speech.stop();
}

/** Says `text` in `language`. `done` resolves when it finished, was stopped or failed. */
export function speak(text: string, language: Language = useSettings.getState().language): { done: Promise<void>; stop: () => void } {
  stopSpeaking();
  let stopped = false;
  let player: AudioPlayer | null = null;
  let finish = () => {};
  const stop = () => {
    stopped = true;
    player?.pause();
    Speech.stop();
    finish();
  };
  stopCurrent = stop;
  const done = (async () => {
    const uri = await ttsFile(text, language);
    if (stopped) return;
    if (uri) {
      const { createAudioPlayer, setAudioModeAsync } = await import('expo-audio');
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => undefined);
      const p = createAudioPlayer(uri);
      player = p;
      await new Promise<void>((resolve) => {
        finish = resolve;
        const sub = p.addListener('playbackStatusUpdate', (status) => {
          if (status.didJustFinish) resolve();
        });
        p.play();
        setTimeout(resolve, 60_000);
        finish = () => {
          sub.remove();
          resolve();
        };
      });
      p.remove();
      player = null;
      return;
    }
    if (!(await deviceSpeaks(language)) || stopped) return;
    await new Promise<void>((resolve) => {
      finish = resolve;
      Speech.speak(text, { language: SPEECH_LOCALE[language], rate: 0.95, onDone: resolve, onStopped: resolve, onError: () => resolve() });
    });
  })();
  return { done, stop };
}

/** The phone's speech recognition, one answer (installed app only). */
function deviceHear(): Promise<Heard | null> {
  if (!voiceAvailable) return Promise.resolve(null);
  return new Promise((resolve) => {
    let said = '';
    startListening({ onText: (t) => (said = t), onEnd: () => resolve(said.trim() ? { text: said.trim(), language: null } : null), onError: () => resolve(null) }).catch(() =>
      resolve(null),
    );
  });
}

/** Mic level in dBFS above which it counts as speech, how long a pause ends the answer. */
const SPEECH_DB = -38;
const PAUSE_MS = 1300;
const WAIT_MS = 7000;
const MAX_MS = 25_000; // Sarvam's REST speech to text takes up to 30 s

/**
 * Talk mode for a screen: `say` speaks, `hear` listens for one answer. `state` and `level` drive the
 * VoiceOrb. `finish` ends listening now (and transcribes), `stop` cancels everything.
 */
export function useTalk() {
  const [state, setState] = useState<VoiceState>('idle');
  const [level, setLevel] = useState(0);
  const end = useRef<(() => void) | null>(null);
  const cancelled = useRef(false);

  const say = useCallback(async (text: string) => {
    setState('speaking');
    const s = speak(text);
    end.current = s.stop;
    await s.done;
    setState((st) => (st === 'speaking' ? 'idle' : st));
  }, []);

  const hear = useCallback(async (): Promise<Heard | null> => {
    const language = useSettings.getState().language;
    cancelled.current = false;
    if (!serverOn()) {
      setState('listening');
      const heard = await deviceHear();
      setState('idle');
      return heard;
    }
    const audio = await import('expo-audio');
    const permission = await audio.requestRecordingPermissionsAsync().catch(() => null);
    if (!permission?.granted) return null;
    let recorder: AudioRecorder;
    try {
      // Same as useAudioRecorder(), made here so the screen doesn't need expo-audio when it's missing.
      const { default: AudioModule } = await import('expo-audio/build/AudioModule');
      const { createRecordingOptions } = await import('expo-audio/build/utils/options');
      recorder = new AudioModule.AudioRecorder(createRecordingOptions({ ...audio.RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true }));
      await audio.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      return null;
    }
    setState('listening');
    let spoke = false;
    const started = Date.now();
    let lastVoice = started;
    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        const db = recorder.getStatus().metering ?? -160;
        setLevel(Math.max(0, Math.min(1, (db + 60) / 45)));
        const now = Date.now();
        if (db > SPEECH_DB) {
          spoke = true;
          lastVoice = now;
        }
        if ((spoke && now - lastVoice > PAUSE_MS) || (!spoke && now - started > WAIT_MS) || now - started > MAX_MS) done();
      }, 100);
      const done = () => {
        clearInterval(timer);
        resolve();
      };
      end.current = done;
    });
    await recorder.stop().catch(() => undefined);
    await audio.setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    setLevel(0);
    const uri = recorder.uri;
    recorder.release();
    if (cancelled.current || !spoke || !uri) {
      setState('idle');
      return null;
    }
    setState('thinking');
    const heard = await sttFile(uri, language === 'en' ? undefined : language);
    setState('idle');
    if (!heard) return serverOn() ? null : deviceHear();
    return heard.transcript ? { text: heard.transcript, language: heard.language } : null;
  }, []);

  /** Ends listening now and uses what was said so far. */
  const finish = useCallback(() => end.current?.(), []);
  /** Cancels speaking or listening. */
  const stop = useCallback(() => {
    cancelled.current = true;
    end.current?.();
    stopSpeaking();
    setState('idle');
  }, []);

  useEffect(() => () => stopSpeaking(), []);
  return { state, level, say, hear, finish, stop };
}

/** Talk mode: says `text` once when it's set (a screen opened, a result arrived). */
export function useSayInTalkMode(text: string | undefined) {
  const talk = useSettings((s) => s.talk);
  useEffect(() => {
    if (!talk || !text) return;
    const id = setTimeout(() => speak(text), 300);
    return () => {
      clearTimeout(id);
      stopSpeaking();
    };
  }, [talk, text]);
}

/** Which voice talk mode uses: the Visus voice (Sarvam) or the phone's own. Asks GET /voice once (free). */
export function useVoiceKind(): 'visus' | 'device' {
  const [on, setOn] = useState(serverOn);
  useEffect(() => {
    if (!serverOn()) return;
    request<VoiceStatus>('/voice')
      .then((status) => {
        if (!status.voice) serverVoice = false;
        setOn(status.voice);
      })
      .catch(() => undefined);
  }, []);
  return on ? 'visus' : 'device';
}
