import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { ErrorState, LoadingState } from '../components/States';
import { errorMessage } from '../data/errors';
import { addDays } from '../domain/dates';
import { dollarsToCents, formatMoney } from '../domain/money';
import { parseQuantity, parseTaxRate, priceLines } from '../domain/invoiceMath';
import { canSendInvoice } from '../domain/permissions';
import type { Customer } from '../domain/types';
import { useOrgQuery } from '../hooks/useOrgQuery';
import { useApp } from '../state/useApp';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

type DraftLine = { key: string; description: string; quantity: string; price: string };

export function InvoiceEditorScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { repo, activeMembership, offline } = useApp();
  const organizationId = activeMembership?.organizationId ?? '';
  const customers = useOrgQuery<Customer[]>('customers', () => repo.listCustomers(organizationId), [organizationId]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [tax, setTax] = useState('8.5');
  const [dueIn, setDueIn] = useState(14);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([{ key: 'line-1', description: '', quantity: '1', price: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'draft' | 'send' | null>(null);
  const canSend = activeMembership ? canSendInvoice(activeMembership.role) : false;
  const issueDate = repo.today();

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  const pricedLines = lines.flatMap((line) => {
    const quantity = parseQuantity(line.quantity);
    const unit = dollarsToCents(line.price);
    if (!line.description.trim() || quantity === null || unit === null) return [];
    return [{ description: line.description.trim(), quantity, unitAmountCents: unit }];
  });
  const rate = parseTaxRate(tax) ?? 0;
  const totals = priceLines(pricedLines, rate);

  async function save(send: boolean) {
    if (!activeMembership) return;
    if (offline) {
      setError('You are offline. Reconnect to save this invoice.');
      return;
    }
    setBusy(send ? 'send' : 'draft');
    setError(null);
    try {
      let nextCustomerId = customerId;
      if (adding || !nextCustomerId) {
        const created = await repo.createCustomer(activeMembership.organizationId, { name, email, company });
        nextCustomerId = created.id;
      }
      if (!nextCustomerId) throw new Error('Choose a customer.');
      const taxRate = parseTaxRate(tax);
      if (taxRate === null) throw new Error('Enter a tax rate between 0 and 100.');
      if (pricedLines.length === 0) throw new Error('Add a description, quantity, and price for at least one line.');
      const invoice = await repo.createInvoice(activeMembership.organizationId, {
        customerId: nextCustomerId,
        dueDate: addDays(issueDate, dueIn),
        taxRatePercent: taxRate,
        notes,
        lines: pricedLines,
      });
      const finalInvoice = send ? await repo.sendInvoice(activeMembership.organizationId, invoice.id) : invoice;
      router.replace(`/invoice/${finalInvoice.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (customers.loading && !customers.data) return <LoadingState label="Loading customers" />;
  if (customers.error && !customers.data) return <ErrorState message={customers.error} onRetry={() => void customers.refresh()} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.section, { color: colors.ink, fontFamily: fonts.semibold }]}>Customer</Text>
      {customers.data?.map((customer) => {
        const selected = customerId === customer.id && !adding;
        return (
          <Pressable
            key={customer.id}
            testID={`customer-${customer.id}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={customer.name}
            onPress={() => {
              setCustomerId(customer.id);
              setAdding(false);
            }}
            style={[styles.choice, { borderColor: selected ? colors.primary : colors.line, backgroundColor: colors.surface }]}
          >
            <Text style={{ color: colors.ink, fontFamily: fonts.semibold }}>{customer.name}</Text>
            <Text style={{ color: colors.muted, fontFamily: fonts.body }}>{customer.email}</Text>
          </Pressable>
        );
      })}
      <Button label={adding ? 'Use an existing customer' : 'Add a new customer'} variant="ghost" onPress={() => setAdding((value) => !value)} testID="toggle-new-customer" />
      {adding || (customers.data && customers.data.length === 0) ? (
        <View style={{ gap: 10 }}>
          <TextField label="Customer name" value={name} onChangeText={setName} testID="new-customer-name" autoCapitalize="words" />
          <TextField label="Customer email" value={email} onChangeText={setEmail} testID="new-customer-email" keyboardType="email-address" />
          <TextField label="Company" value={company} onChangeText={setCompany} testID="new-customer-company" autoCapitalize="words" />
        </View>
      ) : null}
      <Text style={[styles.section, { color: colors.ink, fontFamily: fonts.semibold }]}>Line items</Text>
      {lines.map((line, index) => (
        <View key={line.key} style={[styles.line, { borderColor: colors.line, backgroundColor: colors.surface }]}>
          <TextField label={`Description ${index + 1}`} value={line.description} onChangeText={(value) => updateLine(line.key, { description: value })} testID={`line-description-${index}`} autoCapitalize="sentences" />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <TextField label="Qty" value={line.quantity} onChangeText={(value) => updateLine(line.key, { quantity: value })} testID={`line-qty-${index}`} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Price" value={line.price} onChangeText={(value) => updateLine(line.key, { price: value })} testID={`line-price-${index}`} keyboardType="decimal-pad" placeholder="0.00" />
            </View>
          </View>
          {lines.length > 1 ? (
            <Button label="Remove line" variant="ghost" onPress={() => setLines((current) => current.filter((item) => item.key !== line.key))} />
          ) : null}
        </View>
      ))}
      <Button
        label="Add line"
        variant="secondary"
        testID="add-line"
        onPress={() => setLines((current) => [...current, { key: `line-${current.length + 1}-${Date.now()}`, description: '', quantity: '1', price: '' }])}
      />
      <Text style={[styles.section, { color: colors.ink, fontFamily: fonts.semibold }]}>Terms</Text>
      <View style={styles.row}>
        {[7, 14, 30].map((days) => (
          <Pressable
            key={days}
            testID={`due-${days}`}
            accessibilityRole="button"
            accessibilityState={{ selected: dueIn === days }}
            onPress={() => setDueIn(days)}
            style={[styles.due, { borderColor: dueIn === days ? colors.primary : colors.line, backgroundColor: dueIn === days ? colors.infoSoft : colors.surface }]}
          >
            <Text style={{ color: colors.ink, fontFamily: fonts.medium }}>{days} days</Text>
          </Pressable>
        ))}
      </View>
      <TextField label="Tax percent" value={tax} onChangeText={setTax} testID="tax-rate" keyboardType="decimal-pad" />
      <TextField label="Notes" value={notes} onChangeText={setNotes} testID="invoice-notes" multiline />
      <Text testID="draft-total" style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 28 }}>
        {formatMoney(totals.totalCents, activeMembership?.currency ?? 'USD')}
      </Text>
      {error ? <Text testID="editor-error" style={{ color: colors.danger, fontFamily: fonts.medium }}>{error}</Text> : null}
      <Button testID="save-draft" label="Save draft" variant="secondary" loading={busy === 'draft'} onPress={() => void save(false)} />
      {canSend ? <Button testID="send-new-invoice" label="Send invoice" loading={busy === 'send'} onPress={() => void save(true)} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 48 },
  section: { fontSize: 16, marginTop: 8 },
  choice: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 2 },
  line: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  due: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
