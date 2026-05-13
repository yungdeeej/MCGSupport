import { test, expect } from '@playwright/test';

/**
 * Critical path: a visitor sees the homepage, navigates to login, submits an
 * email, and lands on the "check your email" confirmation. The actual magic
 * link flow needs a real inbox; this verifies the user-facing happy path.
 */
test('visitor can request a sign-in link', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /How can we help/i })).toBeVisible();
  await page.getByRole('link', { name: /sign in/i }).first().click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel(/school email/i).fill('test-noop@mcgcollege.com');
  await page.getByRole('button', { name: /send me a sign-in link/i }).click();
  await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10_000 });
});

test('public KB article is reachable without authentication', async ({ page }) => {
  await page.goto('/kb/reset-moodle-password');
  await expect(page.getByRole('heading', { name: /reset your moodle password/i })).toBeVisible();
});
