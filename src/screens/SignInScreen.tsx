import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { errorMessage } from '../data/errors';
import { DEMO_PASSWORD } from '../domain/types';
import { useApp } from '../state/useApp';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export function SignInScreen({ onSignedIn }: { onSignedIn?: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signInWithPassword, enterDemo, repo } = useApp();
  const [email, setEmail] = useState('maya@northwind.studio');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'password' | 'demo' | null>(null);

  async function submit() {
    if (!email.trim()) {
      setError('Enter the email on your Billkit account.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setLoading('password');
    setError(null);
    try {
      await signInWithPassword(email, password);
      (onSignedIn ?? (() => router.replace('/(app)/(tabs)')))();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(null);
    }
  }

  async function demo() {
    setLoading('demo');
    setError(null);
    try {
      await enterDemo();
      (onSignedIn ?? (() => router.replace('/(app)/(tabs)')))();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(null);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 20 }]}>
      <Text style={[styles.mark, { color: colors.primary, fontFamily: fonts.displayItalic }]}>Billkit</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink, fontFamily: fonts.display }]}>
        Invoices that get paid.
      </Text>
      <Text style={[styles.copy, { color: colors.muted, fontFamily: fonts.body }]}>
        See what is outstanding, send an invoice from your phone, and know the moment a customer pays.
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <TextField label="Email" value={email} onChangeText={setEmail} testID="email-input" keyboardType="email-address" placeholder="maya@northwind.studio" />
        <TextField label="Password" value={password} onChangeText={setPassword} testID="password-input" secureTextEntry placeholder={DEMO_PASSWORD} />
        {error ? (
          <Text testID="auth-error" style={{ color: colors.danger, fontFamily: fonts.medium }}>
            {error}
          </Text>
        ) : null}
        <Button testID="sign-in" label="Sign in" loading={loading === 'password'} onPress={() => void submit()} />
        <Pressable testID="magic-link" accessibilityRole="button" accessibilityLabel="Email me a magic link" onPress={() => router.push('/(auth)/magic-link')}>
          <Text style={{ color: colors.primary, fontFamily: fonts.semibold, textAlign: 'center' }}>Email me a magic link</Text>
        </Pressable>
      </View>
      {repo.mode === 'mock' ? (
        <Button testID="try-demo" label="Try the demo" variant="secondary" loading={loading === 'demo'} onPress={() => void demo()} />
      ) : null}
      <Text style={[styles.hint, { color: colors.muted, fontFamily: fonts.body }]}>
        Demo password {DEMO_PASSWORD}. Maya owns Northwind Studio. Sam is a viewer.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, gap: 14 },
  mark: { fontSize: 18 },
  title: { fontSize: 40, lineHeight: 44 },
  copy: { fontSize: 16, lineHeight: 23 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  hint: { fontSize: 13, lineHeight: 18 },
});
