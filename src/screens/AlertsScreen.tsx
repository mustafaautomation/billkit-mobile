import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useOrgQuery } from '../hooks/useOrgQuery';
import { formatLongDate } from '../domain/dates';
import type { AppNotification } from '../domain/types';
import { useApp } from '../state/useApp';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export function AlertsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { repo, activeMembership, revision } = useApp();
  const organizationId = activeMembership?.organizationId ?? '';
  const result = useOrgQuery<AppNotification[]>(
    'alerts',
    () => repo.listNotifications(organizationId),
    [organizationId, revision],
  );

  async function open(alert: AppNotification) {
    if (!activeMembership) return;
    if (!alert.readAt) await repo.markNotificationRead(activeMembership.organizationId, alert.id);
    if (alert.invoiceId) router.push(`/invoice/${alert.invoiceId}`);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title="Alerts" />
      <ScrollView contentContainerStyle={styles.content}>
        <Button
          testID="mark-alerts-read"
          label="Mark all read"
          variant="ghost"
          onPress={() => {
            if (!activeMembership) return;
            void repo.markAllNotificationsRead(activeMembership.organizationId);
          }}
        />
        {result.loading && !result.data ? <LoadingState label="Loading alerts" /> : null}
        {result.error && !result.data ? <ErrorState message={result.error} onRetry={() => void result.refresh()} /> : null}
        {result.data && result.data.length === 0 ? (
          <EmptyState title="No alerts yet" body="When a customer views or pays an invoice, it shows up here." />
        ) : null}
        {result.data?.map((alert) => (
          <Pressable
            key={alert.id}
            testID={`alert-${alert.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${alert.title}. ${alert.body}`}
            onPress={() => void open(alert)}
            style={[styles.row, { backgroundColor: alert.readAt ? colors.surface : colors.infoSoft, borderColor: colors.line }]}
          >
            <Text style={{ color: colors.ink, fontFamily: fonts.semibold }}>{alert.title}</Text>
            <Text style={{ color: colors.ink, fontFamily: fonts.body }}>{alert.body}</Text>
            <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>{formatLongDate(alert.createdAt)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  row: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 },
});
