import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../components/Button';
import { InvoicePaper } from '../components/InvoicePaper';
import { ErrorState, LoadingState } from '../components/States';
import { errorMessage } from '../data/errors';
import { formatLongDate } from '../domain/dates';
import { canSendInvoice } from '../domain/permissions';
import type { InvoiceDetail, Organization } from '../domain/types';
import { useApp } from '../state/useApp';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export function InvoiceDetailScreen({ invoiceId }: { invoiceId: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { repo, activeMembership, offline, revision } = useApp();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'send' | 'remind' | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!activeMembership) return;
      setLoading(true);
      try {
        const [nextInvoice, nextOrg] = await Promise.all([
          repo.getInvoice(activeMembership.organizationId, invoiceId),
          repo.getOrganization(activeMembership.organizationId),
        ]);
        if (!cancelled) {
          setInvoice(nextInvoice);
          setOrganization(nextOrg);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeMembership, invoiceId, repo, revision]);

  async function run(action: 'send' | 'remind') {
    if (!activeMembership) return;
    if (offline) {
      setError('You are offline. Reconnect to update this invoice.');
      return;
    }
    setBusy(action);
    setError(null);
    try {
      const next =
        action === 'send'
          ? await repo.sendInvoice(activeMembership.organizationId, invoiceId)
          : await repo.sendReminder(activeMembership.organizationId, invoiceId);
      setInvoice(next);
      const latest = next.events[next.events.length - 1];
      setNotice(latest?.message ?? (action === 'send' ? 'Invoice sent.' : 'Reminder queued.'));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (loading && !invoice) return <LoadingState label="Loading invoice" />;
  if (error && !invoice) return <ErrorState message={error} />;
  if (!invoice || !organization) return <LoadingState label="Loading invoice" />;
  const canSend = activeMembership ? canSendInvoice(activeMembership.role) : false;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <InvoicePaper invoice={{ ...invoice, customerName: invoice.customer.name }} organization={organization} />
      {notice ? (
        <Text testID="invoice-notice" style={{ color: colors.success, fontFamily: fonts.semibold }}>
          {notice}
        </Text>
      ) : null}
      {error ? <Text style={{ color: colors.danger, fontFamily: fonts.medium }}>{error}</Text> : null}
      {canSend && invoice.status === 'draft' ? (
        <Button testID="send-invoice" label="Send invoice" loading={busy === 'send'} onPress={() => void run('send')} />
      ) : null}
      {canSend && invoice.balanceCents > 0 && invoice.status !== 'draft' ? (
        <Button testID="send-reminder" label="Send reminder" variant="secondary" loading={busy === 'remind'} onPress={() => void run('remind')} />
      ) : null}
      <Button testID="view-pdf" label="View PDF" variant="secondary" onPress={() => router.push(`/invoice/pdf/${invoice.id}`)} />
      {invoice.status !== 'draft' ? (
        <Button testID="open-payment-link" label="Preview customer link" variant="ghost" onPress={() => router.push(`/pay/${invoice.publicToken}`)} />
      ) : null}
      <Text style={{ color: colors.muted, fontFamily: fonts.semibold, marginTop: 8 }}>Activity</Text>
      {invoice.events.map((event) => (
        <View key={event.id} style={[styles.event, { borderColor: colors.line }]}>
          <Text style={{ color: colors.ink, fontFamily: fonts.medium }}>{event.message}</Text>
          <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>{formatLongDate(event.createdAt)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  event: { borderTopWidth: 1, paddingTop: 8, gap: 2 },
});
