import { Redirect } from 'expo-router';
import { LoadingState } from '../components/States';
import { useApp } from '../state/useApp';

export default function Index() {
  const { ready, session } = useApp();
  if (!ready) return <LoadingState label="Opening Billkit" />;
  if (session) return <Redirect href="/(app)/(tabs)" />;
  return <Redirect href="/(auth)/sign-in" />;
}
