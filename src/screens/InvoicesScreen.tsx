import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { StatusPill, FilterChips } from '../components/StatusPill';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { TextField } from '../components/TextField';
import { useOrgQuery } from '../hooks/useOrgQuery';
import { formatLongDate } from '../domain/dates';
import { formatMoney } from '../domain/money';
import { canCreateInvoice } from '../domain/permissions';
import type { InvoiceFilter, InvoiceSummary } from '../domain/types';
import { useApp } from '../state/useApp';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export function InvoicesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { repo, activeMembership, revision } = useApp();
  const [filter, setFilter] = useState<InvoiceFilter>('all');
  const [query, setQuery] = useState('');
  const organizationId = activeMembership?.organizationId;
  const result = useOrgQuery<InvoiceSummary[]>(
    `invoices:${filter}:${query}`,
    () => repo.listInvoices(organizationId ?? '', filter, query),
    [organizationId, filter, query, revision],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title="Invoices" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {activeMembership && canCreateInvoice(activeMembership.role) ? (
          <Button
            testID="new-invoice"
            label={activeMembership.role === 'member' ? 'New draft' : 'New invoice'}
            onPress={() => router.push('/invoice/new')}
          />
        ) : null}
        <TextField label="Search" value={query} onChangeText={setQuery} testID="invoice-search" placeholder="Number or customer" />
        <FilterChips value={filter} onChange={setFilter} />
        {result.loading && !result.data ? <LoadingState label="Loading invoices" /> : null}
        {result.error && !result.data ? <ErrorState message={result.error} onRetry={() => void result.refresh()} /> : null}
        {result.data && result.data.length === 0 ? (
          <EmptyState title="No invoices here" body="Try another filter, or create an invoice when you are ready to bill." />
        ) : null}
        {result.data?.map((invoice) => (
          <Pressable
            key={invoice.id}
            testID={`invoice-${invoice.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${invoice.number}, ${invoice.customerName}, ${formatMoney(invoice.balanceCents, invoice.currency)}`}
            onPress={() => router.push(`/invoice/${invoice.id}`)}
            style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.ink, fontFamily: fonts.semibold, fontSize: 16 }}>{invoice.customerName}</Text>
              <Text style={{ color: colors.muted, fontFamily: fonts.body }}>
                {invoice.number} · Due {formatLongDate(invoice.dueDate)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={{ color: colors.ink, fontFamily: fonts.semibold }}>{formatMoney(invoice.balanceCents || invoice.totalCents, invoice.currency)}</Text>
              <StatusPill status={invoice.displayStatus} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  row: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', gap: 12 },
});
