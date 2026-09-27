/**
 * Generates the screenshots used by README.md.
 *
 *   npm run screenshots
 *   npm run screenshots -- --url https://funct1ons.github.io/TetrisGame/
 *   PIECES=60 PACE=120 npm run screenshots
 *
 * A small placement bot (scripts/lib/bot.mjs) plays the board, so the captured
 * frame is a genuine mid-game state: real stack, real score, real line clears.
 * The bot reads the stack off the canvas and the piece sequence out of the DOM,
 * so the game itself needs no changes for this to work.
 *
 * `reducedMotion` is enabled for the capture session only: it drops transient
 * particles that would otherwise be misread as stack cells. A still image
 * cannot show animation anyway.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { HIDDEN, KIND_OF_COLOR, WIDTH, choosePlan, emptyGrid, spawnXOf } from './lib/bot.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

function serve(root) {
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url, 'http://localhost').pathname.replace(/^\/+/, ''),
    );
    const target = pathname === '' || pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const file = join(root, target);
    if (!file.startsWith(root)) {
      response.writeHead(403).end('forbidden');
      return;
    }
    try {
      const body = await readFile(file);
      response
        .writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
        .end(body);
    } catch {
      response.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () =>
      resolve({
        origin: `http://127.0.0.1:${server.address().port}/`,
        close: () => new Promise((done) => server.close(done)),
      }),
    );
  });
}

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

const readQueue = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('#next .mini-piece')].map((el) =>
      el.style.getPropertyValue('--piece-color').trim().toLowerCase(),
    ),
  );

const sampleBoard = (page) =>
  page.evaluate(() => {
    const canvas = document.querySelector('#board');
    const scale = canvas.width / canvas.clientWidth;
    const size = canvas.clientWidth / 10;
    const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const rows = [];
    for (let row = 0; row < 20; row++) {
      const cells = [];
      for (let x = 0; x < 10; x++) {
        const px = Math.min(canvas.width - 1, Math.round((x + 0.5) * size * scale));
        const py = Math.min(canvas.height - 1, Math.round((row + 0.5) * size * scale));
        cells.push(data[(py * canvas.width + px) * 4 + 3] > 60 ? 1 : 0);
      }
      rows.push(cells);
    }
    return rows;
  });

/** Reads the settled stack. The active piece always spawns inside the top rows. */
async function readBoard(page) {
  const first = await sampleBoard(page);
  await wait(60);
  const second = await sampleBoard(page);
  const grid = emptyGrid();
  for (let row = 0; row < 20; row++)
    for (let x = 0; x < WIDTH; x++) grid[row + HIDDEN][x] = first[row][x] && second[row][x];
  for (let y = HIDDEN; y < HIDDEN + 3; y++) grid[y].fill(0);
  return grid;
}

const waitPlaying = (page) =>
  page.waitForFunction(
    () => document.querySelector('#status-label')?.textContent === '保持专注，保持流动',
    null,
    { timeout: 20000 },
  );

const isOver = (page) =>
  page.evaluate(() => {
    const overlay = document.querySelector('#overlay');
    return !!overlay && !overlay.hasAttribute('hidden') && overlay.classList.contains('game-over');
  });

const readStats = (page) =>
  page.evaluate(() => ({
    score: Number(document.querySelector('#score')?.textContent?.replaceAll(',', '') ?? 0),
    lines: Number(document.querySelector('#lines')?.textContent ?? 0),
    level: Number(document.querySelector('#level')?.textContent ?? 0),
    timer: document.querySelector('#timer')?.textContent ?? '',
  }));

const press = async (page, key, times) => {
  for (let index = 0; index < times; index++) {
    await page.keyboard.press(key);
    await wait(18);
  }
};

const pieces = Number(process.env.PIECES ?? 45);
const pace = Number(process.env.PACE ?? 300);
const urlFlag = process.argv.indexOf('--url');
const remote = urlFlag === -1 ? undefined : process.argv[urlFlag + 1];

async function playGame(page, shot) {
  await page.locator('#play').click();
  await waitPlaying(page);

  // Stash the opening piece: it fills the hold slot for the screenshot and makes
  // every following piece knowable from the next-queue preview.
  const opening = await readQueue(page);
  await page.keyboard.press('c');
  await wait(160);

  let kind = KIND_OF_COLOR[opening[0]];
  let placed = 0;
  let stats;
  for (let index = 1; index < pieces; index++) {
    const queue = await readQueue(page);
    await waitPlaying(page);
    const grid = await readBoard(page);
    const plan = choosePlan(kind, grid, 'dellacherie');
    if (!plan) break;
    await press(page, 'ArrowUp', plan.rotation);
    const shift = plan.x - spawnXOf(kind);
    await press(page, shift < 0 ? 'ArrowLeft' : 'ArrowRight', Math.abs(shift));
    placed++;
    if (index === pieces - 1 && shot.finale) {
      // Leave the last piece hanging above its landing spot so the ghost shows.
      await press(page, 'ArrowDown', Math.max(0, plan.landingY - 5));
      await wait(220);
      break;
    }
    await page.keyboard.press('Space');
    await wait(pace);
    if (await isOver(page)) break;
    kind = KIND_OF_COLOR[queue[0]];
  }
  stats = await readStats(page);
  return { ...stats, placed };
}

const browser = await chromium.launch();
const local = remote ? undefined : await serve(join(process.cwd(), 'dist'));
const origin = remote ?? local.origin;
await mkdir('docs', { recursive: true });

try {
  const shots = [
    {
      file: 'docs/menu-phone.png',
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      mobile: true,
    },
    {
      file: 'docs/play-phone.png',
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      mobile: true,
      play: true,
      finale: true,
    },
    {
      file: 'docs/play-desktop.png',
      viewport: { width: 1180, height: 820 },
      deviceScaleFactor: 1,
      mobile: false,
      play: true,
      finale: true,
    },
  ];

  for (const shot of shots) {
    const context = await browser.newContext({
      viewport: shot.viewport,
      deviceScaleFactor: shot.deviceScaleFactor,
      isMobile: shot.mobile,
      hasTouch: shot.mobile,
    });
    await context.addInitScript(() => {
      localStorage.setItem(
        'prism-v1',
        JSON.stringify({
          best: 0,
          settings: { sound: false, haptics: false, theme: 'aurora', reducedMotion: true },
        }),
      );
    });
    const page = await context.newPage();
    await page.goto(origin);
    await page.waitForLoadState('load');
    await page.evaluate(() => navigator.serviceWorker?.ready.catch(() => {}));
    await wait(400);
    const result = shot.play ? await playGame(page, shot) : undefined;
    await page.screenshot({ path: shot.file });
    console.log(
      `${shot.file.padEnd(24)} ${shot.viewport.width}x${shot.viewport.height}@${shot.deviceScaleFactor}` +
        (result
          ? `  pieces=${result.placed} lines=${result.lines} level=${result.level} score=${result.score} time=${result.timer}`
          : ''),
    );
    await context.close();
  }
} finally {
  await browser.close();
  await local?.close();
}
