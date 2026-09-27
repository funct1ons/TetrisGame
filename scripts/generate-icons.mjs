import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await mkdir('public/icons', { recursive: true });
  for (const [name, size] of [
    ['icon-192', 192],
    ['icon-512', 512],
    ['maskable-512', 512],
  ]) {
    const data = await page.evaluate((size) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#101525';
      ctx.fillRect(0, 0, size, size);
      const unit = size * 0.19,
        gap = size * 0.022,
        left = (size - unit * 3 - gap * 2) / 2;
      for (const [x, y] of [
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ]) {
        const px = left + x * (unit + gap),
          py = size * 0.29 + y * (unit + gap);
        const gradient = ctx.createLinearGradient(px, py, px + unit, py + unit);
        gradient.addColorStop(0, '#c1f8e1');
        gradient.addColorStop(1, '#73c6b4');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(px, py, unit, unit, size * 0.036);
        ctx.fill();
      }
      return canvas.toDataURL('image/png').split(',')[1];
    }, size);
    await writeFile(`public/icons/${name}.png`, Buffer.from(data, 'base64'));
  }
} finally {
  await browser.close();
}
