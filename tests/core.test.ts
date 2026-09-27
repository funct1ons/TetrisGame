import { describe, it, expect } from 'vitest';
import { Board } from '../src/game/Board';
import { Piece } from '../src/game/Piece';
import { Game } from '../src/game/Game';
describe('基础玩法', () => {
  it('四次旋转返回原矩阵', () => {
    const p = new Piece('T');
    let rotated = p;
    for (let i = 0; i < 4; i++) rotated = rotated.rotated(1);
    expect(rotated.matrix).toEqual(p.matrix);
  });
  it('检测边界和堆叠碰撞', () => {
    const b = new Board(),
      p = new Piece('O');
    expect(b.fits(p)).toBe(true);
    p.x = -1;
    expect(b.fits(p)).toBe(false);
    p.x = 4;
    b.lock(p);
    expect(b.fits(p)).toBe(false);
  });
  it('清除整行并补空行', () => {
    const b = new Board();
    b.grid[21].fill('I');
    b.grid[20][0] = 'T';
    expect(b.fullRows()).toEqual([21]);
    b.clear([21]);
    expect(b.grid[21][0]).toBe('T');
    expect(b.grid).toHaveLength(22);
  });
  it('落地等待500ms再固定', () => {
    const g = new Game();
    g.start();
    g.piece = g.board.ghost(g.piece);
    g.update(499);
    expect(g.board.grid.flat().filter(Boolean)).toHaveLength(0);
    g.update(1);
    expect(g.board.grid.flat().filter(Boolean)).toHaveLength(4);
  });
  it('硬降立即固定', () => {
    const g = new Game();
    g.start();
    g.action('drop');
    expect(g.board.grid.flat().filter(Boolean)).toHaveLength(4);
  });
});
