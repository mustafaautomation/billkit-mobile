import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { BillkitError } from '../data/errors';

export async function shareInvoicePdf(html: string): Promise<void> {
  const file = await Print.printToFileAsync({ html });
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new BillkitError('Sharing is not available on this device.', 'network');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}
