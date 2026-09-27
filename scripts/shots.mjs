import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';

const sizes = [
  [390, 844],
  [412, 915],
  [360, 640],
  [320, 568],
];
const file = pathToFileURL(resolve('portable/PRISM.html')).href;
const browser = await chromium.launch();
await mkdir('shots', { recursive: true });
try {
  for (const [width, height] of sizes) {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(file);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `shots/menu-${width}x${height}.png` });
    await page.locator('#play').tap();
    for (let i = 0; i < 6; i++) {
      await page.locator('[data-action="drop"]').tap();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(200);
    await page.screenshot({ path: `shots/playing-${width}x${height}.png` });
    const board = await page.locator('#board').boundingBox();
    console.log(
      `${width}x${height} board=${board.width.toFixed(0)}x${board.height.toFixed(0)} ratio=${(board.height / board.width).toFixed(3)} fill=${((board.height / height) * 100).toFixed(0)}% top=${board.y.toFixed(0)} scroll=${await page.evaluate(() => document.documentElement.scrollHeight)}`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
