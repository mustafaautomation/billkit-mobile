import { expect, test } from '@playwright/test';
import path from 'node:path';

const dir = path.join(process.cwd(), 'docs', 'screenshots');

test('capture the demo workspace', async ({ page }) => {
  await page.addInitScript(() => {
    const boot = 'billkit-shot-boot';
    if (!window.sessionStorage.getItem(boot)) {
      window.localStorage.clear();
      window.sessionStorage.setItem(boot, '1');
    }
  });
  await page.goto('/');
  await page.getByTestId('try-demo').waitFor();
  await page.screenshot({ path: path.join(dir, 'sign-in.png') });
  await page.getByTestId('try-demo').click();
  await expect(page.getByTestId('dashboard-collected')).toContainText('$14,454.00');
  await page.screenshot({ path: path.join(dir, 'dashboard.png') });
  await page.getByTestId('tab-invoices').click();
  await page.getByTestId('filter-overdue').click();
  await expect(page.getByTestId('invoice-inv_1042')).toBeVisible();
  await page.screenshot({ path: path.join(dir, 'invoices.png') });
  await page.getByTestId('invoice-inv_1042').click();
  await expect(page.getByTestId('invoice-paper')).toBeVisible();
  await page.screenshot({ path: path.join(dir, 'invoice.png') });
  await page.getByTestId('view-pdf').click();
  await expect(page.getByTestId('share-pdf')).toBeVisible();
  await page.screenshot({ path: path.join(dir, 'pdf.png') });
  await page.goBack();
  await page.goBack();
  await page.getByTestId('new-invoice').click();
  await expect(page.getByTestId('customer-cus_lumen')).toBeVisible();
  await page.screenshot({ path: path.join(dir, 'new-invoice.png') });
  await page.goto('/pay/pay_atlas_1048');
  await expect(page.getByTestId('pay-now')).toBeVisible();
  await page.screenshot({ path: path.join(dir, 'pay.png') });
  await page.getByTestId('pay-now').click();
  await page.getByTestId('card-name').fill('Ada Lovelace');
  await page.screenshot({ path: path.join(dir, 'payment-sheet.png') });
  await page.getByTestId('mock-pay-confirm').click();
  await expect(page.getByTestId('paid-state')).toBeVisible();
  await page.screenshot({ path: path.join(dir, 'paid.png') });
  await page.goto('/');
  await page.getByTestId('tab-alerts').click();
  await expect(page.getByText('INV-1048 was paid by Atlas Goods.')).toBeVisible();
  await page.screenshot({ path: path.join(dir, 'alerts.png') });
  await page.goto('/settings');
  await page.getByTestId('theme-dark').click();
  await expect(page.getByTestId('active-role')).toBeVisible();
  await page.screenshot({ path: path.join(dir, 'settings-dark.png') });
});
