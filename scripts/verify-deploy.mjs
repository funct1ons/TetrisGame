import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'https://funct1ons.github.io/TetrisGame/';
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
try {
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(
    () => document.querySelector('.local-tag')?.textContent?.includes('离线就绪'),
    null,
    { timeout: 15000 },
  );
  const status = await page.locator('.local-tag').innerText();
  const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
  await page.locator('#play').tap();
  await page.locator('[data-action="drop"]').tap();
  await page.waitForTimeout(400);
  const score = await page.locator('#score').innerText();
  const board = await page.locator('#board').boundingBox();

  // Prove the installed service worker really serves the game with the network gone.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await page.locator('#play').tap();
  await page.locator('[data-action="drop"]').tap();
  await page.waitForTimeout(400);
  const offlineScore = await page.locator('#score').innerText();
  await page.screenshot({ path: 'shots/deployed-offline.png' });

  console.log(
    JSON.stringify({ url, status, manifest, score, offlineScore, board, errors }, null, 1),
  );
} finally {
  await browser.close();
}
