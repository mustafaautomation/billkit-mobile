import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Button } from '../components/Button';
import { InvoicePaper } from '../components/InvoicePaper';
import { PaymentSheet } from '../components/PaymentSheet';
import { ErrorState, LoadingState } from '../components/States';
import { errorMessage } from '../data/errors';
import { formatMoney } from '../domain/money';
import type { SharedInvoice } from '../domain/types';
import { useApp } from '../state/useApp';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export function PayScreen({ token }: { token: string }) {
  const { colors } = useTheme();
  const { repo, ready, offline } = useApp();
  const [invoice, setInvoice] = useState<SharedInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const next = await repo.getSharedInvoice(token);
        if (!cancelled) {
          setInvoice(next);
          setPaid(next.displayStatus === 'paid');
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
  }, [ready, repo, token]);

  async function startPay() {
    if (!invoice) return;
    if (offline) {
      setError('You are offline. Reconnect to pay this invoice.');
      return;
    }
    setError(null);
    try {
      const checkout = await repo.createCheckout(token);
      if (checkout.mode === 'stripe') {
        await WebBrowser.openBrowserAsync(checkout.url);
        return;
      }
      setSheet(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function confirm(cardNumber: string) {
    setBusy(true);
    setError(null);
    try {
      await repo.paySharedInvoice(token, cardNumber);
      const next = await repo.getSharedInvoice(token);
      setInvoice(next);
      setPaid(true);
      setSheet(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!ready || loading) return <LoadingState label="Opening invoice" />;
  if (error && !invoice) return <ErrorState message={error} />;
  if (!invoice) return <ErrorState message="This invoice link is not valid." />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <Text style={[styles.mark, { color: colors.primary, fontFamily: fonts.displayItalic }]}>Billkit</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink, fontFamily: fonts.display }]}>
        {invoice.organizationName}
      </Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.body }}>Invoice for {invoice.customerName}</Text>
      <InvoicePaper invoice={invoice} />
      {paid ? (
        <View testID="paid-state" style={[styles.paid, { backgroundColor: colors.successSoft }]}>
          <Text style={{ color: colors.success, fontFamily: fonts.display, fontSize: 28 }}>Paid</Text>
          <Text style={{ color: colors.ink, fontFamily: fonts.body }}>
            {formatMoney(invoice.totalCents, invoice.currency)} is settled. You can close this page.
          </Text>
        </View>
      ) : (
        <Button testID="pay-now" label={`Pay ${formatMoney(invoice.balanceCents, invoice.currency)}`} onPress={() => void startPay()} />
      )}
      {error ? <Text testID="pay-error" style={{ color: colors.danger, fontFamily: fonts.medium }}>{error}</Text> : null}
      <PaymentSheet
        visible={sheet}
        amountCents={invoice.balanceCents}
        currency={invoice.currency}
        invoiceNumber={invoice.number}
        busy={busy}
        error={error}
        onClose={() => setSheet(false)}
        onConfirm={(card) => void confirm(card)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  mark: { fontSize: 16 },
  title: { fontSize: 34 },
  paid: { borderRadius: 18, padding: 16, gap: 6 },
});
