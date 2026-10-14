import { type Page, expect } from '@playwright/test';

export interface LoginOptions {
  email?: string;
  password?: string;
}

/**
 * Performs authentic UI login against UIMS live web interface.
 */
export async function loginAsAdmin(page: Page, options?: LoginOptions): Promise<void> {
  const email = options?.email || 'admin@youngonevn.com';
  const password = options?.password || 'Youngone@2026';

  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Fill credentials
  const emailInput = page
    .locator('input#login_email')
    .or(page.locator('input[placeholder*="name@company.com"]'))
    .first();
  await expect(emailInput).toBeVisible({ timeout: 15000 });
  await emailInput.fill(email);

  const passwordInput = page
    .locator('input#login_password')
    .or(page.locator('input[type="password"]'))
    .first();
  await expect(passwordInput).toBeVisible({ timeout: 10000 });
  await passwordInput.fill(password);

  // Submit form
  const submitButton = page.locator('button[type="submit"]:has-text("Sign In")');
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  // Wait for redirect to dashboard or home
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
  await page.waitForLoadState('networkidle');
}
