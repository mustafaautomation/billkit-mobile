import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { AppHeader } from '../components/AppHeader';
import { StatusPill } from '../components/StatusPill';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useOrgQuery } from '../hooks/useOrgQuery';
import { formatMoney } from '../domain/money';
import { canViewDashboard } from '../domain/permissions';
import type { Dashboard, InvoiceSummary } from '../domain/types';
import { useApp } from '../state/useApp';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export function DashboardScreen() {
  const { colors } = useTheme();
  const { repo, activeMembership, session, revision } = useApp();
  const organizationId = activeMembership?.organizationId;
  const query = useOrgQuery<Dashboard>(
    'dashboard',
    () => repo.getDashboard(organizationId ?? ''),
    [organizationId, revision],
  );

  if (!activeMembership) return <LoadingState label="Loading your workspace" />;
  if (!canViewDashboard(activeMembership.role)) return <Redirect href="/invoices" />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.greeting, { color: colors.muted, fontFamily: fonts.medium }]}>{activeMembership.organizationName}</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.ink, fontFamily: fonts.display }]}>
          {greeting}, {session?.fullName.split(' ')[0] ?? 'there'}
        </Text>
        {query.loading && !query.data ? <LoadingState label="Loading the ledger" /> : null}
        {query.error && !query.data ? <ErrorState message={query.error} onRetry={() => void query.refresh()} /> : null}
        {query.data ? <DashboardBody dashboard={query.data} /> : null}
      </ScrollView>
    </View>
  );
}

function DashboardBody({ dashboard }: { dashboard: Dashboard }) {
  const { colors } = useTheme();
  const router = useRouter();
  const max = Math.max(...dashboard.monthly.map((item) => item.collectedCents), 1);
  return (
    <>
      <Text style={{ color: colors.muted, fontFamily: fonts.body }}>Collected in {dashboard.periodLabel}</Text>
      <View style={styles.stats}>
        <Stat testID="dashboard-collected" label="Collected" value={formatMoney(dashboard.collectedThisMonthCents, dashboard.currency)} tone="primary" />
        <Stat testID="dashboard-outstanding" label="Outstanding" value={formatMoney(dashboard.outstandingCents, dashboard.currency)} />
        <Stat testID="dashboard-overdue" label="Overdue" value={formatMoney(dashboard.overdueCents, dashboard.currency)} tone="danger" />
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.section, { color: colors.ink, fontFamily: fonts.semibold }]}>Last six months</Text>
        <View style={styles.chart} accessibilityLabel="Collected revenue by month">
          {dashboard.monthly.map((month) => (
            <View key={month.key} style={styles.barWrap} accessibilityLabel={`${month.label} ${formatMoney(month.collectedCents, dashboard.currency)}`}>
              <View style={[styles.bar, { height: Math.max(6, (month.collectedCents / max) * 84), backgroundColor: colors.primary }]} />
              <Text style={{ color: colors.muted, fontSize: 11, fontFamily: fonts.medium }}>{month.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={[styles.section, { color: colors.ink, fontFamily: fonts.semibold }]}>Needs attention</Text>
      {dashboard.attention.length === 0 ? (
        <EmptyState title="Nothing overdue" body="Every open invoice is still inside its due date." />
      ) : (
        dashboard.attention.map((invoice) => (
          <InvoiceLink key={invoice.id} invoice={invoice} onPress={() => router.push(`/invoice/${invoice.id}`)} />
        ))
      )}
    </>
  );
}

function Stat({ label, value, testID, tone = 'default' }: { label: string; value: string; testID: string; tone?: 'default' | 'primary' | 'danger' }) {
  const { colors } = useTheme();
  const color = tone === 'danger' ? colors.danger : tone === 'primary' ? colors.primary : colors.ink;
  return (
    <View testID={testID} style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Text style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 12 }}>{label}</Text>
      <Text style={{ color, fontFamily: fonts.display, fontSize: 22 }}>{value}</Text>
    </View>
  );
}

function InvoiceLink({ invoice, onPress }: { invoice: InvoiceSummary; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${invoice.number} ${invoice.customerName}`}
      onPress={onPress}
      style={[styles.link, { backgroundColor: colors.surface, borderColor: colors.line }]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.semibold }}>{invoice.customerName}</Text>
        <Text style={{ color: colors.muted, fontFamily: fonts.body }}>{invoice.number}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.semibold }}>{formatMoney(invoice.balanceCents, invoice.currency)}</Text>
        <StatusPill status={invoice.displayStatus} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  greeting: { fontSize: 13 },
  title: { fontSize: 34, marginTop: -8 },
  stats: { gap: 10 },
  stat: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 4 },
  card: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 12 },
  section: { fontSize: 16, marginTop: 8 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 6 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  bar: { width: '70%', borderRadius: 8 },
  link: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', gap: 12 },
});
