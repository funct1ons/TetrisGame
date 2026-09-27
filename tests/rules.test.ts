import { it, expect } from 'vitest';
import { Board } from '../src/game/Board';
import { Game } from '../src/game/Game';
import { Piece } from '../src/game/Piece';
import { TYPES } from '../src/game/Tetromino';
it('所有方块顺逆旋转互逆且始终有4格', () => {
  for (const kind of TYPES) {
    const p = new Piece(kind);
    expect(p.rotated(1).rotated(-1).matrix).toEqual(p.matrix);
    expect(p.rotated(1).cells()).toHaveLength(4);
  }
});
it('I 方块墙踢可从左墙旋转', () => {
  const g = new Game();
  g.start();
  g.piece = new Piece('I').rotated(1);
  g.piece.x = -2;
  g.piece.y = 5;
  expect(g.board.fits(g.piece)).toBe(true);
  g.rotate(-1);
  expect(g.piece.rotation).toBe(0);
  expect(g.board.fits(g.piece)).toBe(true);
});
it('T 方块地板踢不穿过地面', () => {
  const g = new Game();
  g.start();
  g.piece = new Piece('T');
  g.piece.y = 20;
  g.rotate(1);
  expect(g.piece.rotation).toBe(1);
  expect(g.board.fits(g.piece)).toBe(true);
});
it('被完全围住时旋转不修改原方块', () => {
  const g = new Game();
  g.start();
  g.piece = new Piece('T');
  g.piece.y = 8;
  g.board.grid.forEach((row) => row.fill('O'));
  for (const [x, y] of g.piece.cells()) g.board.grid[y][x] = null;
  const original = g.piece;
  g.rotate(1);
  expect(g.piece).toBe(original);
});
it('同时清除四行保留上方行顺序', () => {
  const b = new Board();
  for (let i = 18; i < 22; i++) b.grid[i].fill('I');
  b.grid[17][3] = 'T';
  b.clear(b.fullRows());
  expect(b.grid[21][3]).toBe('T');
  expect(
    b.grid
      .slice(0, 4)
      .flat()
      .every((c) => c === null),
  ).toBe(true);
});
it('锁定延迟最多重置15次', () => {
  const g = new Game();
  g.start();
  g.piece = new Piece('O');
  g.piece.y = 20;
  for (let i = 0; i < 15; i++) {
    g.update(20);
    g.action(i % 2 ? 'right' : 'left');
  }
  expect(g.lockResets).toBe(15);
  g.update(200);
  g.action('right');
  expect(g.lockTime).toBe(200);
  g.update(300);
  expect(g.board.grid.flat().filter(Boolean)).toHaveLength(4);
});
it('出生阻塞时游戏结束', () => {
  const g = new Game();
  g.start();
  g.board.grid[1].fill('T');
  g.board.grid[2].fill('T');
  g.spawn('O');
  expect(g.state).toBe('over');
});
it('消行动画暂停后恢复且冲刺40行胜利', () => {
  const g = new Game();
  g.start();
  g.mode = 'sprint';
  g.scoring.lines = 39;
  g.board.grid[21].fill('J');
  g.board.grid[21][4] = null;
  g.board.grid[21][5] = null;
  g.piece = new Piece('O');
  g.piece.y = 20;
  g.lock();
  expect(g.state).toBe('clearing');
  g.action('pause');
  g.update(500);
  expect(g.clearTime).toBe(0);
  g.action('pause');
  g.update(280);
  expect(g.won).toBe(true);
  expect(g.state).toBe('over');
});
it('重开清空分数、时间、暂存及棋盘', () => {
  const g = new Game();
  g.start();
  g.action('hold');
  g.action('drop');
  g.update(100);
  g.start();
  expect(g.scoring.score).toBe(0);
  expect(g.elapsed).toBe(0);
  expect(g.held).toBeNull();
  expect(g.board.grid.flat().filter(Boolean)).toHaveLength(0);
});
