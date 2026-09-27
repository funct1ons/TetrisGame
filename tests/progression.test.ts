import { it, expect } from 'vitest';
import { Randomizer } from '../src/game/Randomizer';
import { Scoring } from '../src/game/Scoring';
import { Game } from '../src/game/Game';
it('每个7-bag包含七种不同方块', () => {
  const r = new Randomizer();
  for (let i = 0; i < 20; i++)
    expect(new Set(Array.from({ length: 7 }, () => r.next())).size).toBe(7);
});
it('基础分、连击、背靠背和空锁重置', () => {
  const s = new Scoring();
  expect(s.clear(4)).toBe(800);
  expect(s.clear(4)).toBe(1250);
  s.clear(0);
  expect(s.combo).toBe(-1);
  expect(s.clear(1)).toBe(100);
  expect(s.backToBack).toBe(false);
});
it('等级和掉落计分', () => {
  const s = new Scoring();
  s.lines = 10;
  expect(s.level).toBe(2);
  expect(s.gravity).toBeLessThan(800);
  expect(s.clear(2)).toBe(600);
  s.drop(5, true);
  s.drop(2, false);
  expect(s.score).toBe(612);
});
it('每次锁定前只能暂存一次，交换不消耗队列', () => {
  const g = new Game();
  g.start();
  const first = g.piece.kind;
  g.action('hold');
  expect(g.held).toBe(first);
  const second = g.piece;
  g.action('hold');
  expect(g.piece).toBe(second);
  g.action('drop');
  const queue = [...g.queue];
  g.action('hold');
  expect(g.piece.kind).toBe(first);
  expect(g.queue).toEqual(queue);
});
it('暂停不推进游戏时间', () => {
  const g = new Game();
  g.start();
  g.action('pause');
  g.update(1000);
  expect(g.elapsed).toBe(0);
  g.action('pause');
  expect(g.state).toBe('playing');
});
