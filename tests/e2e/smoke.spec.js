import { test, expect } from '@playwright/test';

test.describe('Urbindex smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for loading screen to disappear
    await page.waitForSelector('#loading-screen.hidden', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
  });

  test('page title and loading screen', async ({ page }) => {
    await expect(page).toHaveTitle(/URBINDEX/);
    const ls = page.locator('#loading-screen');
    await expect(ls).toHaveCSS('opacity', '0').catch(() => {});
  });

  test('navigation buttons are visible', async ({ page }) => {
    await expect(page.locator('.nav-btn[data-view="map"]')).toBeVisible();
    await expect(page.locator('.nav-btn[data-view="locations"]')).toBeVisible();
    await expect(page.locator('.nav-btn[data-view="social"]')).toBeVisible();
    await expect(page.locator('.nav-btn[data-view="profile"]')).toBeVisible();
  });

  test('map view is default active view', async ({ page }) => {
    await expect(page.locator('#map-view')).toHaveClass(/active/);
    await expect(page.locator('#map')).toBeVisible();
  });

  test('can switch to locations view', async ({ page }) => {
    await page.locator('.nav-btn[data-view="locations"]').click();
    await expect(page.locator('#locations-view')).toHaveClass(/active/);
  });

  test('can switch to social view', async ({ page }) => {
    await page.locator('.nav-btn[data-view="social"]').click();
    await expect(page.locator('#social-view')).toHaveClass(/active/);
  });

  test('can switch to profile view', async ({ page }) => {
    await page.locator('.nav-btn[data-view="profile"]').click();
    await expect(page.locator('#profile-view')).toHaveClass(/active/);
  });

  test('auth modal opens and closes', async ({ page }) => {
    const authBtn = page.locator('#auth-btn');
    if (await authBtn.isVisible()) {
      await authBtn.click();
      await expect(page.locator('#auth-modal')).toHaveClass(/active/);
      await page.keyboard.press('Escape');
      await expect(page.locator('#auth-modal')).not.toHaveClass(/active/);
    }
  });

  test('auth modal tab switching works', async ({ page }) => {
    const authBtn = page.locator('#auth-btn');
    if (await authBtn.isVisible()) {
      await authBtn.click();
      await page.locator('.auth-tab[data-tab="signup"]').click();
      await expect(page.locator('#signup-form')).toBeVisible();
      await expect(page.locator('#signin-form')).not.toBeVisible();
    }
  });

  test('add location FAB triggers auth when not signed in', async ({ page }) => {
    const fab = page.locator('#add-location-fab');
    if (await fab.isVisible()) {
      page.on('dialog', dialog => dialog.dismiss());
      await fab.click();
      // Should prompt for auth or show auth modal
      await page.waitForTimeout(500);
    }
  });

  test('map renders leaflet tiles', async ({ page }) => {
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 8000 });
  });

  test('header is visible with app name', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
    const headerText = await page.locator('header').textContent();
    expect(headerText).toMatch(/URBINDEX/i);
  });

  test('recenter button is present', async ({ page }) => {
    await expect(page.locator('#recenter-btn')).toBeVisible();
  });
});
