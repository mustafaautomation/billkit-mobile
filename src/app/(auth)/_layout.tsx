import { Redirect, Stack } from 'expo-router';
import { LoadingState } from '../../components/States';
import { useApp } from '../../state/useApp';

export default function AuthLayout() {
  const { ready, session } = useApp();
  if (!ready) return <LoadingState label="Checking your session" />;
  if (session) return <Redirect href="/(app)/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
