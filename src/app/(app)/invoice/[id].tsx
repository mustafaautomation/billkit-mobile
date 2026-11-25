import { useLocalSearchParams } from 'expo-router';
import { InvoiceDetailScreen } from '../../../screens/InvoiceDetailScreen';

export default function InvoiceRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <InvoiceDetailScreen invoiceId={id ?? ''} />;
}
