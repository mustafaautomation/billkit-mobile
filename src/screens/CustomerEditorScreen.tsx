import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { errorMessage } from '../data/errors';
import { useApp } from '../state/useApp';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export function CustomerEditorScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { repo, activeMembership, offline } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!activeMembership) return;
    if (offline) {
      setError('You are offline. Reconnect to save this customer.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await repo.createCustomer(activeMembership.organizationId, { name, email, company });
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 32 }}>
        New customer
      </Text>
      <TextField label="Name" value={name} onChangeText={setName} testID="customer-name" autoCapitalize="words" />
      <TextField label="Email" value={email} onChangeText={setEmail} testID="customer-email" keyboardType="email-address" />
      <TextField label="Company" value={company} onChangeText={setCompany} testID="customer-company" autoCapitalize="words" />
      {error ? <Text style={{ color: colors.danger, fontFamily: fonts.medium }}>{error}</Text> : null}
      <Button testID="save-customer" label="Save customer" loading={loading} onPress={() => void save()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12 },
});
