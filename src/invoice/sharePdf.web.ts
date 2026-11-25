import { BillkitError } from '../data/errors';

export async function shareInvoicePdf(html: string): Promise<void> {
  if (typeof document === 'undefined') {
    throw new BillkitError('Printing is not available in this browser.', 'network');
  }
  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'Invoice PDF');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);
  const popup = frame.contentDocument;
  if (!popup || !frame.contentWindow) {
    frame.remove();
    throw new BillkitError('The print view could not be opened.', 'network');
  }
  popup.open();
  popup.write(html);
  popup.close();
  frame.contentWindow.focus();
  frame.contentWindow.print();
  window.setTimeout(() => frame.remove(), 1000);
}
