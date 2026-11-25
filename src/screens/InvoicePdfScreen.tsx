import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button } from '../components/Button';
import { InvoicePaper } from '../components/InvoicePaper';
import { ErrorState, LoadingState } from '../components/States';
import { errorMessage } from '../data/errors';
import type { InvoiceDetail, Organization } from '../domain/types';
import { invoiceHtml } from '../invoice/invoiceHtml';
import { shareInvoicePdf } from '../invoice/sharePdf';
import { useApp } from '../state/useApp';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export function InvoicePdfScreen({ invoiceId }: { invoiceId: string }) {
  const { colors } = useTheme();
  const { repo, activeMembership } = useApp();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!activeMembership) return;
    let cancelled = false;
    void (async () => {
      try {
        const [nextInvoice, nextOrg] = await Promise.all([
          repo.getInvoice(activeMembership.organizationId, invoiceId),
          repo.getOrganization(activeMembership.organizationId),
        ]);
        if (!cancelled) {
          setInvoice(nextInvoice);
          setOrganization(nextOrg);
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeMembership, invoiceId, repo]);

  async function share() {
    if (!invoice || !organization) return;
    setBusy(true);
    setError(null);
    try {
      await shareInvoicePdf(invoiceHtml(invoice, organization));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (error && !invoice) return <ErrorState message={error} />;
  if (!invoice || !organization) return <LoadingState label="Preparing the invoice" />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 28 }}>
        Invoice PDF
      </Text>
      <InvoicePaper invoice={{ ...invoice, customerName: invoice.customer.name }} organization={organization} />
      {error ? <Text style={{ color: colors.danger, fontFamily: fonts.medium }}>{error}</Text> : null}
      <Button testID="share-pdf" label="Share PDF" loading={busy} onPress={() => void share()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 40 },
});
