import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '../components/Button';
import { LoadingState } from '../components/States';
import { errorMessage } from '../data/errors';
import { useApp } from '../state/useApp';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export function AuthCallbackScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; access_token?: string; refresh_token?: string; error_description?: string }>();
  const incoming = Linking.useURL();
  const { completeAuthCallback, ready } = useApp();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const query = new URLSearchParams();
    if (typeof params.token === 'string') query.set('token', params.token);
    if (typeof params.access_token === 'string') query.set('access_token', params.access_token);
    if (typeof params.refresh_token === 'string') query.set('refresh_token', params.refresh_token);
    if (typeof params.error_description === 'string') query.set('error_description', params.error_description);
    const url = incoming && incoming.includes('access_token') ? incoming : `billkit://auth/callback?${query.toString()}`;
    let cancelled = false;
    void (async () => {
      try {
        await completeAuthCallback(url);
        if (!cancelled) router.replace('/(app)/(tabs)');
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, incoming, params.token, params.access_token, params.refresh_token, params.error_description, completeAuthCallback, router]);

  if (error) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <Text testID="callback-error" style={{ color: colors.danger, fontFamily: fonts.semibold, fontSize: 18 }}>
          {error}
        </Text>
        <Button label="Back to sign in" onPress={() => router.replace('/(auth)/sign-in')} />
      </View>
    );
  }
  return <LoadingState label="Signing you in" />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
});
