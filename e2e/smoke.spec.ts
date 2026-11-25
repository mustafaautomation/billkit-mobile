import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    const boot = 'billkit-playwright-boot';
    if (!window.sessionStorage.getItem(boot)) {
      window.localStorage.clear();
      window.sessionStorage.setItem(boot, '1');
    }
  });
});

test('owner reviews the ledger, filters overdue invoices, and sends a reminder', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('try-demo').click();
  await expect(page.getByTestId('dashboard-collected')).toContainText('$14,454.00');
  await expect(page.getByTestId('dashboard-outstanding')).toContainText('$6,551.60');
  await expect(page.getByTestId('dashboard-overdue')).toContainText('$5,663.70');
  await expect(page.getByTestId('org-switcher')).toContainText('Northwind Studio');

  await page.getByTestId('tab-invoices').click();
  await page.getByTestId('filter-overdue').click();
  await page.getByTestId('invoice-inv_1042').click();
  await expect(page.getByTestId('invoice-paper').getByText('INV-1042')).toBeVisible();
  await page.getByTestId('send-reminder').click();
  await expect(page.getByTestId('invoice-notice')).toContainText('Reminder queued for ada@lumen.health');
  await page.getByTestId('view-pdf').click();
  await expect(page.getByTestId('invoice-paper')).toContainText('Lumen Health');
  await expect(page.getByTestId('share-pdf')).toBeVisible();
});

test('owner creates and sends an invoice from the phone layout', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('try-demo').click();
  await page.getByTestId('tab-invoices').click();
  await page.getByTestId('new-invoice').click();
  await page.getByTestId('customer-cus_lumen').click();
  await page.getByTestId('line-description-0').fill('On-site critique');
  await page.getByTestId('line-qty-0').fill('3');
  await page.getByTestId('line-price-0').fill('400');
  await page.getByTestId('due-14').click();
  await expect(page.getByTestId('draft-total')).toContainText('$1,302.00');
  await page.getByTestId('send-new-invoice').click();
  await expect(page.getByTestId('invoice-paper').getByText('INV-1057')).toBeVisible();
  await expect(page.getByText('Sent to ada@lumen.health')).toBeVisible();
});

test('customer pays a shared invoice and the owner sees the alert', async ({ page }) => {
  await page.goto('/pay/pay_atlas_1048');
  await expect(page.getByTestId('invoice-paper').getByText('Atlas Goods')).toBeVisible();
  await page.getByTestId('pay-now').click();
  await page.getByTestId('card-name').fill('Ada Lovelace');
  await page.getByTestId('mock-pay-confirm').click();
  await expect(page.getByTestId('paid-state')).toContainText('Paid');

  await page.goto('/');
  await page.getByTestId('try-demo').click();
  await page.getByTestId('tab-alerts').click();
  await expect(page.getByText('INV-1048 was paid by Atlas Goods.')).toBeVisible();
});

test('magic link and viewer role hide sending', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('magic-link').click();
  await page.getByTestId('magic-email').fill('sam@northwind.studio');
  await page.getByTestId('send-magic-link').click();
  await page.getByTestId('open-magic-link').click();
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();
  await expect(page.getByTestId('new-invoice')).toHaveCount(0);
  await expect(page.getByTestId('tab-home')).toHaveCount(0);
});

test('wrong password and a missing invoice link show errors', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('password-input').fill('not-the-password');
  await page.getByTestId('sign-in').click();
  await expect(page.getByTestId('auth-error')).toContainText('do not match');
  await page.goto('/pay/missing-token');
  await expect(page.getByTestId('error-state')).toContainText('not valid');
});
