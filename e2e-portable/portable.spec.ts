import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile, readdir } from 'node:fs/promises';

const file = resolve('portable/PRISM.html');

test('分发物只有一个HTML，代码样式全部内嵌', async () => {
  expect(await readdir('portable')).toEqual(['PRISM.html']);
  const html = await readFile(file, 'utf8');
  expect(html).not.toMatch(/<script[^>]+src\s*=/i);
  expect(html).not.toMatch(/<link\b/i);
  expect(html).toContain('<style');
  expect(html).toContain('<script');
});

for (const mobile of [false, true]) {
  test(`断网直接打开本地文件：${mobile ? '手机触控模拟' : '桌面'}`, async ({ browser }) => {
    const context = await browser.newContext({
      offline: true,
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await context.newPage();
    const errors: string[] = [],
      requests: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (request) => {
      if (/^https?:/.test(request.url())) requests.push(request.url());
    });
    await page.goto(pathToFileURL(file).href);
    await expect(page.locator('.local-tag')).toContainText('单文件');
    await expect(page.locator('#install')).toBeHidden();
    expect(await page.locator('.brand').getAttribute('href')).toBe(pathToFileURL(file).href);
    if (mobile) {
      await page.locator('#play').tap();
      await page.locator('[data-action="drop"]').tap();
    } else {
      await page.locator('#play').click();
      await page.keyboard.press('Space');
    }
    await expect(page.locator('#score')).not.toHaveText('0');
    await page.locator('#hold').click();
    await expect(page.locator('#hold')).toBeDisabled();
    await page.locator('#pause').click();
    await expect(page.locator('#resume')).toBeVisible();
    await page.locator('#resume').click();
    await page.screenshot({ path: `test-results/portable-${mobile ? 'mobile' : 'desktop'}.png` });
    await page.reload();
    await expect(page.locator('#play')).toBeVisible();
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
    await context.close();
  });
}
