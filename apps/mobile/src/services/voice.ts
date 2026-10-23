// Voice input for the intake chat (9): speech → text in the message box, the user checks and sends.
// Uses the phone's speech recognizer (expo-speech-recognition). Only in the installed app:
// in Expo Go the native module is missing, so `voiceAvailable` is false and the mic is hidden.
import { requireOptionalNativeModule } from 'expo';
import type { ExpoSpeechRecognitionModuleType } from 'expo-speech-recognition/build/ExpoSpeechRecognitionModule.types';

const Speech = requireOptionalNativeModule<ExpoSpeechRecognitionModuleType>('ExpoSpeechRecognition');

export const voiceAvailable = (() => {
  try {
    return !!Speech?.isRecognitionAvailable();
  } catch {
    return false;
  }
})();

type Handlers = { onText: (text: string) => void; onEnd: () => void; onError: (message: string) => void };

/** Starts listening; words arrive live through `onText`. Returns a function that stops listening. */
export async function startListening({ onText, onEnd, onError }: Handlers): Promise<() => void> {
  if (!Speech) throw new Error('Voice input needs the installed Visus app.');
  const permission = await Speech.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Allow the microphone for Visus in your phone settings to talk instead of typing.');

  const subs = [
    Speech.addListener('result', (e) => onText(e.results[0]?.transcript ?? '')),
    Speech.addListener('end', () => {
      stopAll();
      onEnd();
    }),
    Speech.addListener('error', (e) => {
      stopAll();
      // "no-speech" / "aborted" just end the turn; anything else is worth telling.
      if (e.error === 'no-speech' || e.error === 'aborted') onEnd();
      else onError(e.message || "Couldn't hear that. Try again or type it.");
    }),
  ];
  function stopAll() {
    subs.forEach((s) => s.remove());
  }
  Speech.start({ lang: 'en-IN', interimResults: true, continuous: false });
  return () => Speech.stop();
}
