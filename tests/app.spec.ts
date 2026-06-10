import { test, expect } from '@playwright/test';

test.describe('Page load', () => {
  test('loads without blank page or JS error', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', e => jsErrors.push(e.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body?.trim().length).toBeGreaterThan(0);
    expect(jsErrors).toHaveLength(0);
  });

  test('title is DREINSIGHT', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/DREINSIGHT/i);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const fatal = errors.filter(e => !e.includes('favicon') && !e.includes('404'));
    expect(fatal).toHaveLength(0);
  });
});

test.describe('Dashboard', () => {
  test('shows brand name or login screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hasBrand = await page.getByText('DRE-Insight').isVisible().catch(() => false);
    const hasLogin = await page.locator('input[type="email"]').isVisible().catch(() => false);
    expect(hasBrand || hasLogin).toBe(true);
  });

  test('upload button present on dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    if (await page.locator('input[type="email"]').isVisible()) {
      test.skip(true, 'auth wall — skipping');
    }

    const btn = page.getByText('Carregar Extrato').or(page.getByText('Adicionar Extrato'));
    await expect(btn.first()).toBeVisible({ timeout: 10_000 });
  });

  test('CSV upload shows KPI cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    if (await page.locator('input[type="email"]').isVisible()) {
      test.skip(true, 'auth wall — skipping');
    }

    const csvContent = [
      'Data,Valor,Identificador,Descrição',
      '01/01/2025,1000.00,TX001,Transferência recebida pelo Pix - Cliente A - ••••',
      '05/01/2025,-200.00,TX002,Compra no débito - Fornecedor B',
      '10/02/2025,500.00,TX003,Transferência recebida pelo Pix - Cliente C - ••••',
      '15/02/2025,-150.00,TX004,Pagamento de boleto - Fornecedor D',
    ].join('\n');

    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'extrato-teste.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    await page.waitForTimeout(1500);

    await expect(page.getByText('Receita Total')).toBeVisible();
    await expect(page.getByText('Despesa Total')).toBeVisible();
    // Header subtitle: "4 transações · 2 meses · 1 conta"
    await expect(page.getByText(/\d+ transações/)).toBeVisible();
  });
});

test.describe('Settings page', () => {
  test('settings loads or redirects to login', async ({ page }) => {
    await page.goto('/settings');
    // Wait for either /settings or /login to settle
    await Promise.race([
      page.waitForURL('**/settings', { timeout: 5000 }).catch(() => null),
      page.waitForURL('**/login', { timeout: 5000 }).catch(() => null),
    ]);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    const url = page.url();
    if (url.includes('/login')) {
      await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
    } else {
      // Use h1 to avoid encoding issues with accented chars
      await expect(page.locator('h1')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Navigation', () => {
  test('unknown route renders app (not blank)', async ({ page }) => {
    await page.goto('/rota-inexistente');
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body?.trim().length).toBeGreaterThan(0);
  });
});
