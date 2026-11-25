import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { errorMessage } from '../data/errors';
import { useApp } from '../state/useApp';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export function MagicLinkScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { requestMagicLink, repo } = useApp();
  const [email, setEmail] = useState('maya@northwind.studio');
  const [error, setError] = useState<string | null>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    setError(null);
    try {
      const token = await requestMagicLink(email);
      setSentTo(email.trim());
      setPreviewToken(token);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink, fontFamily: fonts.display }]}>
        Magic link
      </Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.body, lineHeight: 22 }}>
        {repo.mode === 'mock'
          ? 'In the demo, the link opens on this device. With Supabase configured, it arrives in your inbox.'
          : 'We will email you a link that opens Billkit and signs you in.'}
      </Text>
      <TextField label="Email" value={email} onChangeText={setEmail} testID="magic-email" keyboardType="email-address" />
      {error ? <Text testID="magic-error" style={{ color: colors.danger, fontFamily: fonts.medium }}>{error}</Text> : null}
      <Button testID="send-magic-link" label="Send magic link" loading={loading} onPress={() => void send()} />
      {sentTo ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={{ color: colors.ink, fontFamily: fonts.semibold }}>Check {sentTo}</Text>
          {previewToken ? (
            <Button
              testID="open-magic-link"
              label="Open the link on this device"
              variant="secondary"
              onPress={() => router.replace(`/auth/callback?token=${encodeURIComponent(previewToken)}`)}
            />
          ) : (
            <Text style={{ color: colors.muted, fontFamily: fonts.body }}>Open the email on this phone to finish signing in.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, gap: 14 },
  title: { fontSize: 36 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
});
