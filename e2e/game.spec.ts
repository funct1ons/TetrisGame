import { test, expect } from '@playwright/test';
for (const [width, height] of [
  [390, 844],
  [320, 568],
  [844, 390],
  [1440, 900],
]) {
  test(`布局及基本操作 ${width}x${height}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.locator('#play')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const board = await page.locator('#board').boundingBox();
    expect(board).not.toBeNull();
    expect(Math.abs(board!.height / board!.width - 2)).toBeLessThan(0.03);
    await page.screenshot({ path: `test-results/menu-${width}.png`, fullPage: true });
    await page.locator('#play').click();
    await expect(page.locator('#overlay')).toBeHidden();
    await page.keyboard.press('Space');
    await expect(page.locator('#score')).not.toHaveText('0');
    await page.locator('#hold').click();
    await expect(page.locator('#hold')).toBeDisabled();
    await page.locator('#pause').click();
    await expect(page.locator('#resume')).toBeVisible();
    await page.locator('#resume').click();
    await page.locator('#settings').click();
    await expect(page.locator('#settings-dialog')).toBeVisible();
    await page.locator('#theme-setting').selectOption('sunset');
    await page.locator('#settings-dialog .dialog-done').click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'sunset');
    expect(errors).toEqual([]);
  });
}
