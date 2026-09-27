import { test, expect } from '@playwright/test';
test('生产PWA缓存后离线重载并可游玩', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect(page.locator('.local-tag')).toContainText('离线就绪');
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifest).toBeTruthy();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#play')).toBeVisible();
  await page.locator('#play').click();
  await page.keyboard.press('Space');
  await expect(page.locator('#score')).not.toHaveText('0');
  await page.screenshot({ path: 'test-results/offline-playing.png' });
});
test('触控手势、按钮与切后台暂停', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('/');
  await page.locator('#play').tap();
  const canvas = page.locator('#board');
  const bounds = (await canvas.boundingBox())!;
  await canvas.tap();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: bounds.x + 80, y: bounds.y + 80 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: bounds.x + 150, y: bounds.y + 130 }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('#score')).not.toHaveText('0');
  await page.locator('[data-action="drop"]').tap();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#resume')).toBeVisible();
  await context.close();
});
