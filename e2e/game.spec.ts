import { test, expect } from '@playwright/test';
for (const [width, height] of [
  [390, 844],
  [320, 568],
  [393, 727],
  [412, 915],
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
    // Overlay content must never be clipped by the board box, on any size.
    const fits = await page.evaluate(() => {
      const wrap = document.querySelector('.board-wrap')!.getBoundingClientRect();
      const overlay = document.querySelector('#overlay')!;
      const bottom = Math.max(
        ...[...overlay.children].map((child) => child.getBoundingClientRect().bottom),
      );
      return {
        overflow: bottom - wrap.bottom,
        scrolled: overlay.scrollHeight - overlay.clientHeight,
      };
    });
    expect(fits.overflow).toBeLessThanOrEqual(1);
    expect(fits.scrolled).toBeLessThanOrEqual(1);
    if (width <= 700 && height > width) {
      // Compact HUD, large playfield, controls fully reachable without scrolling.
      expect(board!.height / height).toBeGreaterThan(0.62);
      expect(board!.y).toBeLessThan(110);
      const controls = (await page.locator('.touch-controls').boundingBox())!;
      expect(controls.y + controls.height).toBeLessThanOrEqual(height);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
        height + 1,
      );
      // The install button only appears after beforeinstallprompt fires. Force it visible to prove
      // it never covers the icon buttons and that the status tag yields the space.
      const forced = await page.evaluate(() => {
        const install = document.querySelector<HTMLElement>('#install')!;
        install.hidden = false;
        const box = install.getBoundingClientRect();
        const hits = ['#settings', '#pause']
          .map((selector) => document.querySelector(selector)!.getBoundingClientRect())
          .filter(
            (o) => box.x < o.right && box.right > o.x && box.y < o.bottom && box.bottom > o.y,
          ).length;
        const yielded =
          getComputedStyle(document.querySelector('.local-tag')!).visibility === 'hidden';
        install.hidden = true;
        return { hits, yielded, onScreen: box.x > 0 && box.y >= 0 };
      });
      expect(forced).toEqual({ hits: 0, yielded: true, onScreen: true });
    }
    await page.screenshot({ path: `test-results/menu-${width}.png`, fullPage: true });
    await page.locator('#play').click();
    await expect(page.locator('#overlay')).toBeHidden();
    await page.keyboard.press('Space');
    await expect(page.locator('#score')).not.toHaveText('0');
    await page.screenshot({ path: `test-results/playing-${width}.png`, fullPage: true });
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
