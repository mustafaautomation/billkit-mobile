import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { TextField } from '../components/TextField';
import { useOrgQuery } from '../hooks/useOrgQuery';
import { canManageCustomers } from '../domain/permissions';
import type { Customer } from '../domain/types';
import { useApp } from '../state/useApp';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export function CustomersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { repo, activeMembership, revision } = useApp();
  const [query, setQuery] = useState('');
  const organizationId = activeMembership?.organizationId ?? '';
  const result = useOrgQuery<Customer[]>('customers', () => repo.listCustomers(organizationId), [organizationId, revision]);
  const filtered = (result.data ?? []).filter((customer) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return customer.name.toLowerCase().includes(needle) || customer.email.toLowerCase().includes(needle);
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title="Customers" />
      <ScrollView contentContainerStyle={styles.content}>
        {activeMembership && canManageCustomers(activeMembership.role) ? (
          <Button testID="add-customer" label="Add customer" onPress={() => router.push('/customer/new')} />
        ) : null}
        <TextField label="Search customers" value={query} onChangeText={setQuery} testID="customer-search" />
        {result.loading && !result.data ? <LoadingState label="Loading customers" /> : null}
        {result.error && !result.data ? <ErrorState message={result.error} onRetry={() => void result.refresh()} /> : null}
        {result.data && filtered.length === 0 ? (
          <EmptyState title="No customers match" body="Add a customer when you bill someone new." />
        ) : null}
        {filtered.map((customer) => (
          <View key={customer.id} testID={`customer-row-${customer.id}`} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={{ color: colors.ink, fontFamily: fonts.semibold, fontSize: 16 }}>{customer.name}</Text>
            <Text style={{ color: colors.muted, fontFamily: fonts.body }}>{customer.email}</Text>
            {customer.company ? <Text style={{ color: colors.muted, fontFamily: fonts.body }}>{customer.company}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  row: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 2 },
});
