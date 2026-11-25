import { StyleSheet, Text, View } from 'react-native';
import { formatLongDate } from '../domain/dates';
import { formatMoney } from '../domain/money';
import type { InvoiceDetail, Organization, SharedInvoice } from '../domain/types';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';
import { StatusPill } from './StatusPill';

type PaperInvoice = Pick<
  InvoiceDetail,
  | 'number'
  | 'displayStatus'
  | 'customerName'
  | 'issueDate'
  | 'dueDate'
  | 'currency'
  | 'lines'
  | 'subtotalCents'
  | 'taxCents'
  | 'totalCents'
  | 'balanceCents'
  | 'notes'
  | 'taxRatePercent'
> & { taxLabel?: string; customerEmail?: string };

export function InvoicePaper({
  invoice,
  organization,
}: {
  invoice: PaperInvoice | (SharedInvoice & { taxRatePercent?: number });
  organization?: Pick<Organization, 'name' | 'email' | 'addressLine1' | 'addressLine2' | 'city' | 'region' | 'postalCode' | 'taxLabel'>;
}) {
  const { colors } = useTheme();
  const merchant = organization?.name ?? ('organizationName' in invoice ? invoice.organizationName : 'Billkit');
  const email = organization?.email ?? ('organizationEmail' in invoice ? invoice.organizationEmail : '');
  const sharedTaxLabel = 'taxLabel' in invoice && typeof invoice.taxLabel === 'string' ? invoice.taxLabel : 'Tax';
  const taxLabel = organization?.taxLabel || sharedTaxLabel;
  const address = organization
    ? [organization.addressLine1, organization.addressLine2, [organization.city, organization.region, organization.postalCode].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join('\n')
    : '';

  return (
    <View testID="invoice-paper" style={[styles.paper, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.merchant, { color: colors.ink, fontFamily: fonts.display }]}>{merchant}</Text>
          {address ? <Text style={[styles.meta, { color: colors.muted, fontFamily: fonts.body }]}>{address}</Text> : null}
          {email ? <Text style={[styles.meta, { color: colors.muted, fontFamily: fonts.body }]}>{email}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={[styles.number, { color: colors.primary, fontFamily: fonts.display }]}>{invoice.number}</Text>
          <StatusPill status={invoice.displayStatus} />
        </View>
      </View>
      <View style={[styles.rule, { backgroundColor: colors.line }]} />
      <View style={styles.metaRow}>
        <View>
          <Text style={[styles.kicker, { color: colors.muted, fontFamily: fonts.medium }]}>Bill to</Text>
          <Text style={[styles.strong, { color: colors.ink, fontFamily: fonts.semibold }]}>{invoice.customerName}</Text>
        </View>
        <View>
          <Text style={[styles.kicker, { color: colors.muted, fontFamily: fonts.medium }]}>Issued</Text>
          <Text style={[styles.strong, { color: colors.ink, fontFamily: fonts.body }]}>{formatLongDate(invoice.issueDate)}</Text>
        </View>
        <View>
          <Text style={[styles.kicker, { color: colors.muted, fontFamily: fonts.medium }]}>Due</Text>
          <Text style={[styles.strong, { color: colors.ink, fontFamily: fonts.body }]}>{formatLongDate(invoice.dueDate)}</Text>
        </View>
      </View>
      {invoice.lines.map((line) => (
        <View key={line.id} style={[styles.line, { borderColor: colors.line }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.ink, fontFamily: fonts.medium }}>{line.description}</Text>
            <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>
              {line.quantity} × {formatMoney(line.unitAmountCents, invoice.currency)}
            </Text>
          </View>
          <Text style={{ color: colors.ink, fontFamily: fonts.semibold }}>{formatMoney(line.amountCents, invoice.currency)}</Text>
        </View>
      ))}
      <View style={styles.totals}>
        <Total label="Subtotal" value={formatMoney(invoice.subtotalCents, invoice.currency)} />
        <Total label={taxLabel} value={formatMoney(invoice.taxCents, invoice.currency)} />
        <Total label="Total" value={formatMoney(invoice.totalCents, invoice.currency)} strong />
        <Total label="Balance" value={formatMoney(invoice.balanceCents, invoice.currency)} strong />
      </View>
      {invoice.notes ? (
        <Text style={[styles.notes, { color: colors.muted, fontFamily: fonts.body }]}>{invoice.notes}</Text>
      ) : null}
    </View>
  );
}

function Total({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.totalRow}>
      <Text style={{ color: colors.muted, fontFamily: fonts.medium }}>{label}</Text>
      <Text style={{ color: colors.ink, fontFamily: strong ? fonts.display : fonts.semibold, fontSize: strong ? 22 : 15 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 14 },
  top: { flexDirection: 'row', gap: 12 },
  merchant: { fontSize: 26 },
  number: { fontSize: 20 },
  meta: { fontSize: 13, lineHeight: 18 },
  rule: { height: 1 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  kicker: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  strong: { fontSize: 14, marginTop: 2 },
  line: { flexDirection: 'row', gap: 12, borderTopWidth: 1, paddingTop: 10 },
  totals: { gap: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notes: { fontSize: 14, lineHeight: 20 },
});
