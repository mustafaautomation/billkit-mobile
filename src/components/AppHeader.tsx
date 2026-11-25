import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { roleLabel } from '../domain/permissions';
import { useApp } from '../state/useApp';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';
import { Icon } from './Icon';
import { OrgSwitcher } from './OrgSwitcher';

export function AppHeader({ title }: { title?: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeMembership, memberships, setActiveOrganization } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 8, backgroundColor: colors.bg }}>
      <View style={styles.row}>
        <Pressable
          testID="org-switcher"
          accessibilityRole="button"
          accessibilityLabel="Switch workspace"
          onPress={() => setOpen(true)}
          style={styles.org}
        >
          <Text style={[styles.mark, { color: colors.primary, fontFamily: fonts.displayItalic }]}>Billkit</Text>
          <Text style={[styles.orgName, { color: colors.ink, fontFamily: fonts.semibold }]} numberOfLines={1}>
            {activeMembership?.organizationName ?? 'Workspace'}
          </Text>
          {activeMembership ? (
            <Text style={[styles.role, { color: colors.muted, fontFamily: fonts.medium }]}>{roleLabel(activeMembership.role)}</Text>
          ) : null}
        </Pressable>
        <Pressable
          testID="open-settings"
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
          style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.line }]}
        >
          <Icon name="settings" color={colors.ink} />
        </Pressable>
      </View>
      {title ? (
        <Text accessibilityRole="header" style={[styles.title, { color: colors.ink, fontFamily: fonts.display }]}>
          {title}
        </Text>
      ) : null}
      <OrgSwitcher
        visible={open}
        memberships={memberships}
        activeId={activeMembership?.organizationId ?? null}
        onClose={() => setOpen(false)}
        onSelect={setActiveOrganization}
      />
    </View>
  );
}

export function OfflineBanner() {
  const { offline } = useApp();
  const { colors } = useTheme();
  if (!offline) return null;
  return (
    <View testID="offline-banner" style={[styles.banner, { backgroundColor: colors.warningSoft }]}>
      <Text style={{ color: colors.warning, fontFamily: fonts.medium, textAlign: 'center' }}>
        You are offline. Showing the last saved workspace.
      </Text>
    </View>
  );
}

export function ToastBanner() {
  const { toast, dismissToast } = useApp();
  const { colors } = useTheme();
  if (!toast) return null;
  return (
    <Pressable
      testID="payment-toast"
      accessibilityRole="button"
      accessibilityLabel={toast}
      onPress={dismissToast}
      style={[styles.toast, { backgroundColor: colors.success }]}
    >
      <Text style={{ color: colors.onPrimary, fontFamily: fonts.semibold }}>{toast}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  org: { flex: 1, gap: 1 },
  mark: { fontSize: 14 },
  orgName: { fontSize: 16 },
  role: { fontSize: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 34, marginTop: 12 },
  banner: { paddingHorizontal: 16, paddingVertical: 8 },
  toast: { marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 12 },
});
