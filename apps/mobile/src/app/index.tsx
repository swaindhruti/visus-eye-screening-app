import { Redirect } from 'expo-router';

import { useAuth } from '@/store/auth';

/** Signed in (kept on the phone): Home. Otherwise the entry screen. */
export default function Index() {
  const signedIn = useAuth((s) => s.user !== null);
  const guest = useAuth((s) => s.guest);
  return <Redirect href={signedIn ? '/home' : guest ? '/tests' : '/welcome'} />;
}
