import { test, expect } from '@playwright/test';

test('an unanswered location request releases the button and leaves searches alone', async ({ page }) => {
  test.setTimeout(45000);
  await page.addInitScript(() => { navigator.geolocation.getCurrentPosition = () => {}; });
  await page.route('https://nominatim.openstreetmap.org/**', route => route.fulfill({
    json: [{ lat: '42.33', lon: '-83.04', display_name: 'Detroit', boundingbox: ['42.25', '42.45', '-83.28', '-82.91'] }],
    headers: { 'access-control-allow-origin': '*' },
  }));
  await page.goto('/');
  await page.waitForFunction(() => window.app?.map);
  await expect(page.locator('#recenter-btn')).toBeEnabled();
  await page.locator('#map-search-input').fill('Detroit');
  await page.locator('#map-search-input').press('Enter');
  await page.waitForTimeout(14000);
  expect(await page.evaluate(() => app.map.getBounds().contains([42.33, -83.04]))).toBe(true);
  await expect(page.locator('#location-indicator')).not.toHaveClass(/active/);

  await page.locator('#recenter-btn').click();
  await expect(page.locator('#recenter-btn')).toBeDisabled();
  await expect(page.locator('#recenter-btn')).toBeEnabled({ timeout: 14000 });
});

test('a stalled geocoder shows an error and allows another search', async ({ page }) => {
  test.setTimeout(30000);
  await page.route('https://nominatim.openstreetmap.org/**', () => {});
  await page.goto('/');
  await page.waitForFunction(() => window.app?.map);
  await page.locator('#map-search-input').fill('Detroit');
  await page.locator('#map-search-input').press('Enter');
  await expect(page.locator('.map-search-message')).toContainText('timed out', { timeout: 14000 });
  await expect(page.locator('#map-search-submit')).toBeEnabled();
});
