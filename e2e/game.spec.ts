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
      // The board takes over the space the right rail used to occupy, so it owns most of the
      // screen. Short phones give up proportionally more to the fixed topbar and controls.
      expect(board!.height / height).toBeGreaterThanOrEqual(height >= 700 ? 0.8 : 0.73);
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
        const hits = ['#settings', '#pause', '#help-top']
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
    if (width <= 700 && height > width) {
      // The HUD floats inside the playfield: it must stay within the board, keep the four
      // centre columns (where every piece spawns) clear, and never swallow board gestures.
      const hud = await page.evaluate(() => {
        const board = document.querySelector('#board')!.getBoundingClientRect();
        const cell = board.width / 10;
        const spawnLeft = board.x + cell * 3;
        const spawnRight = board.x + cell * 7;
        const rails = ['.left-rail', '.right-rail'].map((selector) =>
          document.querySelector(selector)!.getBoundingClientRect(),
        );
        return {
          inside: rails.every(
            (rail) =>
              rail.x >= board.x - 1 &&
              rail.right <= board.right + 1 &&
              rail.bottom <= board.bottom + 1,
          ),
          clearOfSpawn: rails.every(
            (rail) => rail.right <= spawnLeft + 1 || rail.x >= spawnRight - 1,
          ),
          boardTakesPointer:
            document.elementFromPoint(board.x + cell * 5, board.y + cell)?.id === 'board',
          helpVisible: getComputedStyle(document.querySelector('#help-top')!).display !== 'none',
        };
      });
      expect(hud).toEqual({
        inside: true,
        clearOfSpawn: true,
        boardTakesPointer: true,
        helpVisible: true,
      });
    }
    await page.keyboard.press('Space');
    await expect(page.locator('#score')).not.toHaveText('0');
    await page.screenshot({ path: `test-results/playing-${width}.png`, fullPage: true });
    // Phones move the hold card into the touch bar, so the control under test differs.
    const hold = width <= 700 && height > width ? '[data-action="hold"]' : '#hold';
    await page.locator(hold).click();
    await expect(page.locator(hold)).toBeDisabled();
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
