import { test, expect } from '@playwright/test';

test('large photos shrink to fit in Firestore and stay valid images', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.app?.map);
  const result = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 4000; canvas.height = 3000;
    const ctx = canvas.getContext('2d');
    const noise = ctx.createImageData(4000, 3000);
    for (let i = 0; i < noise.data.length; i++) noise.data[i] = i % 4 === 3 ? 255 : Math.random() * 255;
    ctx.putImageData(noise, 0, 0);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const file = new File([blob], 'big.png', { type: 'image/png' });
    const avatar = await app._compressImage(file, 320, 60000);
    const gallery = await app._compressImage(file, 900, 80000);
    const img = new Image();
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = avatar; });
    return { avatar: avatar.length, gallery: gallery.length, width: img.naturalWidth, prefix: avatar.slice(0, 23) };
  });
  expect(result.avatar).toBeLessThanOrEqual(60000);
  expect(result.gallery).toBeLessThanOrEqual(80000);
  expect(result.width).toBeLessThanOrEqual(320);
  expect(result.prefix).toBe('data:image/jpeg;base64,');
});
