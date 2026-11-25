import { useLocalSearchParams } from 'expo-router';
import { InvoicePdfScreen } from '../../../../screens/InvoicePdfScreen';

export default function InvoicePdfRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <InvoicePdfScreen invoiceId={id ?? ''} />;
}
