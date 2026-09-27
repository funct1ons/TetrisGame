/**
 * A tiny Tetris placement bot shared by the screenshot generator and the
 * quality probe. It mirrors `src/game` exactly: same shapes, same rotation,
 * same spawn position, same fit rules.
 */

export const WIDTH = 10;
export const HEIGHT = 22;
export const HIDDEN = 2;

export const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

/** Mirrors `COLORS` in src/rendering/CanvasRenderer.ts. */
export const COLORS = {
  I: '#55dce9',
  O: '#f5cf68',
  T: '#af8cf5',
  S: '#6cdda8',
  Z: '#f27e98',
  J: '#7399fa',
  L: '#f7ac70',
};

export const KIND_OF_COLOR = Object.fromEntries(
  Object.entries(COLORS).map(([kind, color]) => [color.toLowerCase(), kind]),
);

export const rotateCW = (matrix) => {
  const n = matrix.length;
  return matrix.map((row, y) => row.map((_, x) => matrix[n - 1 - x][y]));
};

export const cellsOf = (matrix, x, y) =>
  matrix.flatMap((row, dy) => row.flatMap((value, dx) => (value ? [[x + dx, y + dy]] : [])));

export const spawnXOf = (kind) => Math.floor((WIDTH - SHAPES[kind].length) / 2);

export const fits = (grid, cells) =>
  cells.every(([x, y]) => x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT && !grid[y][x]);

export const emptyGrid = () => Array.from({ length: HEIGHT }, () => new Array(WIDTH).fill(0));

export function applyClear(grid) {
  const rows = grid.flatMap((row, y) => (row.every(Boolean) ? [y] : []));
  if (!rows.length) return { grid, cleared: 0 };
  const kept = grid.filter((_, y) => !rows.includes(y));
  while (kept.length < HEIGHT) kept.unshift(new Array(WIDTH).fill(0));
  return { grid: kept, cleared: rows.length };
}

const heightsOf = (grid) => {
  const heights = new Array(WIDTH).fill(0);
  for (let x = 0; x < WIDTH; x++)
    for (let y = 0; y < HEIGHT; y++)
      if (grid[y][x]) {
        heights[x] = HEIGHT - y;
        break;
      }
  return heights;
};

const countHoles = (grid) => {
  let holes = 0;
  for (let x = 0; x < WIDTH; x++) {
    let seen = false;
    for (let y = 0; y < HEIGHT; y++) {
      if (grid[y][x]) seen = true;
      else if (seen) holes++;
    }
  }
  return holes;
};

/**
 * Lee's genetic weights. Fast and simple, but ties on low, flat boards are
 * resolved by iteration order, so it tends to pile up along one edge.
 */
function lee(grid) {
  const heights = heightsOf(grid);
  let lines = 0;
  for (let y = 0; y < HEIGHT; y++) if (grid[y].every(Boolean)) lines++;
  const aggregate = heights.reduce((total, height) => total + height, 0);
  let bumpiness = 0;
  for (let x = 0; x + 1 < WIDTH; x++) bumpiness += Math.abs(heights[x] - heights[x + 1]);
  return (
    -0.510066 * aggregate + 0.760666 * lines - 0.35663 * countHoles(grid) - 0.184483 * bumpiness
  );
}

/**
 * Dellacherie's features (the "El-Tetris" set). Column transitions punish
 * ragged stacks hard, which keeps the stack low and flat.
 */
function dellacherie(grid, landingHeight) {
  let rowsEliminated = 0;
  for (let y = 0; y < HEIGHT; y++) if (grid[y].every(Boolean)) rowsEliminated++;

  let rowTransitions = 0;
  for (let y = 0; y < HEIGHT; y++) {
    let previous = 1;
    for (let x = 0; x < WIDTH; x++) {
      const current = grid[y][x] ? 1 : 0;
      if (current !== previous) rowTransitions++;
      previous = current;
    }
    if (previous === 0) rowTransitions++;
  }

  let columnTransitions = 0;
  for (let x = 0; x < WIDTH; x++) {
    let previous = 1;
    for (let y = HEIGHT - 1; y >= 0; y--) {
      const current = grid[y][x] ? 1 : 0;
      if (current !== previous) columnTransitions++;
      previous = current;
    }
    if (previous === 1) columnTransitions++;
  }

  let wells = 0;
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      if (grid[y][x]) continue;
      const left = x === 0 || grid[y][x - 1];
      const right = x === WIDTH - 1 || grid[y][x + 1];
      if (left && right) wells++;
    }

  return (
    -4.5 * landingHeight +
    3.4 * rowsEliminated -
    3.2 * rowTransitions -
    9.3 * columnTransitions -
    7.9 * countHoles(grid) -
    3.4 * wells
  );
}

export const EVALUATORS = { lee, dellacherie };

/** Scores every rotation and column, returning the best reachable placement. */
export function choosePlan(kind, grid, name = 'dellacherie') {
  const evaluator = EVALUATORS[name];
  const spawnX = spawnXOf(kind);
  let matrix = SHAPES[kind];
  let best;
  for (let rotation = 0; rotation < 4; rotation++) {
    for (let x = -4; x < WIDTH; x++) {
      if (!fits(grid, cellsOf(matrix, x, 1))) continue;
      let reachable = true;
      for (let step = Math.min(spawnX, x); step <= Math.max(spawnX, x); step++)
        if (!fits(grid, cellsOf(matrix, step, 1))) reachable = false;
      if (!reachable) continue;
      let y = 1;
      while (fits(grid, cellsOf(matrix, x, y + 1))) y++;
      const cells = cellsOf(matrix, x, y);
      const next = grid.map((row) => row.slice());
      for (const [cx, cy] of cells) next[cy][cx] = 1;
      const top = Math.min(...cells.map(([, cy]) => cy));
      const score = evaluator(next, HEIGHT - top);
      if (!best || score > best.score) best = { score, rotation, x, landingY: y, matrix };
    }
    matrix = rotateCW(matrix);
  }
  return best;
}

/** Diagnostics used by scripts/probe.mjs and the screenshot generator. */
export function boardMetrics(grid) {
  const heights = heightsOf(grid);
  return {
    lines: grid.filter((row) => row.every(Boolean)).length,
    maxHeight: Math.max(...heights),
    holes: countHoles(grid),
    cells: grid.flat().reduce((total, cell) => total + cell, 0),
  };
}

export const renderGrid = (grid, from = HIDDEN + 8) =>
  grid
    .slice(from)
    .map(
      (row, index) =>
        `${String(from - HIDDEN + index).padStart(2)} ${row.map((cell) => (cell ? '#' : '.')).join('')}`,
    )
    .join('\n');
