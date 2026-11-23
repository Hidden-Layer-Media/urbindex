import { test, expect } from '@playwright/test';

const PLACES = [
  { lat: '42.3314', lon: '-83.0458', display_name: 'Detroit, Wayne County, Michigan, United States', boundingbox: ['42.2551', '42.4502', '-83.2877', '-82.9105'] },
  { lat: '45.6', lon: '-86.9', display_name: 'Detroit <b>Harbor</b>, Wisconsin, United States', boundingbox: ['45.5', '45.7', '-87.0', '-86.8'] },
];

test.describe('map address search', () => {
  let requests;

  test.beforeEach(async ({ page }) => {
    requests = 0;
    await page.route('https://nominatim.openstreetmap.org/**', route => {
      requests += 1;
      const empty = new URL(route.request().url()).searchParams.get('q') === 'zzzz';
      return route.fulfill({ json: empty ? [] : PLACES, headers: { 'access-control-allow-origin': '*' } });
    });
    await page.goto('/');
    await page.waitForFunction(() => window.app?.map);
    await page.waitForSelector('#loading-screen.hidden', { timeout: 10000 }).catch(() => {});
  });

  test('searches on Enter only, frames the result, and escapes names', async ({ page }) => {
    const input = page.locator('#map-search-input');
    await input.pressSequentially('Detroit');
    expect(requests).toBe(0);
    await input.press('Enter');
    await expect(page.locator('.map-search-result')).toHaveCount(2);
    expect(requests).toBe(1);
    await expect(page.locator('.map-search-result b')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => app.map.getBounds().contains([42.3314, -83.0458]) && app.map.getZoom() > 8), { timeout: 5000 }).toBe(true);
  });

  test('jumps to typed coordinates without a network request', async ({ page }) => {
    await page.locator('#map-search-input').fill('48.8584, 2.2945');
    await page.locator('#map-search-input').press('Enter');
    await expect.poll(() => page.evaluate(() => app.map.getBounds().contains([48.8584, 2.2945])), { timeout: 5000 }).toBe(true);
    expect(requests).toBe(0);
  });

  test('shows a message when nothing matches', async ({ page }) => {
    await page.locator('#map-search-input').fill('zzzz');
    await page.locator('#map-search-input').press('Enter');
    await expect(page.locator('.map-search-message')).toContainText('No places found');
  });

  test('pick on map keeps typed form values and sets the pin', async ({ page }) => {
    await page.evaluate(() => { app.currentUser = { uid: 'test-user' }; app.showAddLocationModal(); });
    await page.locator('#location-name').fill('Old Mill');
    await page.locator('#pick-on-map-btn').click();
    await expect(page.locator('#map-pick-banner')).toBeVisible();
    await page.locator('#map').click({ position: { x: 300, y: 300 } });
    await expect(page.locator('#location-name')).toBeVisible();
    await expect(page.locator('#location-name')).toHaveValue('Old Mill');
    await expect(page.locator('#location-lat')).not.toHaveValue('');
  });
});
