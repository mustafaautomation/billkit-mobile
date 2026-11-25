import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { roleLabel } from '../domain/permissions';
import { DEMO_PASSWORD, type PushRegistration, type TeamMember, type ThemePreference } from '../domain/types';
import { useOrgQuery } from '../hooks/useOrgQuery';
import { registerPushToken } from '../notifications/push';
import { useApp } from '../state/useApp';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';
import { Button } from '../components/Button';

const DEMO_ACCOUNTS = [
  ['maya@northwind.studio', 'Owner at Northwind, accountant at Harbor'],
  ['jordan@northwind.studio', 'Admin at Northwind'],
  ['nia@northwind.studio', 'Member, drafts only'],
  ['sam@northwind.studio', 'Viewer, read only'],
  ['riley@harborandco.com', 'Owner at Harbor & Co'],
] as const;

export function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();
  const app = useApp();
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const organizationId = app.activeMembership?.organizationId ?? '';
  const team = useOrgQuery<TeamMember[]>('team', () => app.repo.listTeam(organizationId), [organizationId, app.revision]);
  const registration = useOrgQuery<PushRegistration | null>(
    'push',
    () => app.repo.getPushRegistration(),
    [app.session?.userId, app.revision],
  );

  async function enablePush() {
    setBusy(true);
    try {
      const token = await registerPushToken();
      if (!token) {
        setPushMessage('Alerts stay in the Alerts tab until notifications are allowed.');
        return;
      }
      await app.repo.registerPushToken({ token, platform: Platform.OS });
      setPushMessage(
        token === 'local-only'
          ? 'Local payment alerts are on. Add an Expo project ID before remote push can leave this device.'
          : 'Payment alerts are on for this device.',
      );
      await registration.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink, fontFamily: fonts.display }]}>
        Settings
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={{ color: colors.ink, fontFamily: fonts.semibold, fontSize: 18 }}>{app.session?.fullName}</Text>
        <Text style={{ color: colors.muted, fontFamily: fonts.body }}>{app.session?.email}</Text>
        {app.activeMembership ? (
          <Text testID="active-role" style={{ color: colors.muted, fontFamily: fonts.body }}>
            {app.activeMembership.organizationName} · {roleLabel(app.activeMembership.role)}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.section, { color: colors.ink, fontFamily: fonts.semibold }]}>Appearance</Text>
      <View style={styles.row}>
        {(['system', 'light', 'dark'] as ThemePreference[]).map((option) => (
          <Button
            key={option}
            testID={`theme-${option}`}
            label={option[0].toUpperCase() + option.slice(1)}
            variant={preference === option ? 'primary' : 'secondary'}
            onPress={() => setPreference(option)}
          />
        ))}
      </View>
      <Text style={[styles.section, { color: colors.ink, fontFamily: fonts.semibold }]}>Team</Text>
      {team.data?.map((member) => (
        <View key={member.userId} style={[styles.person, { borderColor: colors.line }]}>
          <Text style={{ color: colors.ink, fontFamily: fonts.medium }}>{member.fullName}</Text>
          <Text style={{ color: colors.muted, fontFamily: fonts.body }}>{roleLabel(member.role)}</Text>
        </View>
      ))}
      <Text style={[styles.section, { color: colors.ink, fontFamily: fonts.semibold }]}>Payment alerts</Text>
      <Text testID="push-status" style={{ color: colors.muted, fontFamily: fonts.body }}>
        {pushMessage ??
          (registration.data
            ? `Registered on ${registration.data.platform}.`
            : 'No device registration yet.')}
      </Text>
      <Button testID="enable-push" label="Enable payment alerts" loading={busy} onPress={() => void enablePush()} />
      <Text style={[styles.section, { color: colors.ink, fontFamily: fonts.semibold }]}>Connection</Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.body }}>
        {app.repo.mode === 'mock' ? 'Demo data on this device.' : 'Connected to Supabase. Row Level Security applies.'}
      </Text>
      {app.repo.mode === 'mock' ? (
        <View style={styles.switchRow}>
          <Text style={{ color: colors.ink, fontFamily: fonts.medium, flex: 1 }}>Simulate offline</Text>
          <Switch
            testID="simulate-offline"
            accessibilityLabel="Simulate offline"
            value={app.forcedOffline}
            onValueChange={app.setForcedOffline}
          />
        </View>
      ) : null}
      {app.repo.mode === 'mock' ? (
        <>
          <Text style={[styles.section, { color: colors.ink, fontFamily: fonts.semibold }]}>Demo accounts</Text>
          <Text style={{ color: colors.muted, fontFamily: fonts.body }}>Password {DEMO_PASSWORD}</Text>
          {DEMO_ACCOUNTS.map(([email, note]) => (
            <Button
              key={email}
              testID={`demo-account-${email}`}
              label={`${email} · ${note}`}
              variant="secondary"
              onPress={() => void app.signInWithPassword(email, DEMO_PASSWORD)}
            />
          ))}
          <Button testID="reset-demo" label="Reset demo data" variant="secondary" onPress={() => void app.resetDemo()} />
        </>
      ) : null}
      <Button testID="sign-out" label="Sign out" variant="danger" onPress={() => void app.signOut()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 48 },
  title: { fontSize: 34 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 4 },
  section: { fontSize: 16, marginTop: 8 },
  row: { gap: 8 },
  person: { borderBottomWidth: 1, paddingVertical: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
});
