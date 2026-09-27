import { HIDDEN } from '../game/Board';
import type { Game } from '../game/Game';
import type { Kind } from '../game/Tetromino';
export const COLORS: Record<Kind, string> = {
  I: '#55dce9',
  O: '#f5cf68',
  T: '#af8cf5',
  S: '#6cdda8',
  Z: '#f27e98',
  J: '#7399fa',
  L: '#f7ac70',
};
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}
export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private pieceId = -1;
  private displayY = 0;
  private impact = 0;
  private overTime = 0;
  reducedMotion = false;
  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }
  event(event: string, game: Game): void {
    if (event === 'drop') this.impact = 1;
    if (event === 'over') this.overTime = 0;
    if (event === 'clear' && !this.reducedMotion) {
      for (const y of game.clearing)
        for (let x = 0; x < 10; x++)
          for (let n = 0; n < 4; n++) {
            this.particles.push({
              x: x + 0.5,
              y: y - HIDDEN + 0.5,
              vx: (Math.random() - 0.5) * 6,
              vy: -Math.random() * 5 - 1,
              life: 0.7 + Math.random() * 0.4,
              color: COLORS[game.board.grid[y][x]!],
            });
          }
      this.particles = this.particles.slice(-240);
    }
  }
  draw(game: Game, dt = 16): void {
    const { ctx, canvas } = this;
    const w = canvas.clientWidth,
      h = canvas.clientHeight,
      dpr = Math.min(devicePixelRatio || 1, 3);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const size = w / 10,
      active = game.state !== 'paused';
    if (active) this.impact = Math.max(0, this.impact - dt / 190);
    if (!this.reducedMotion) ctx.translate(0, Math.sin(this.impact * Math.PI) * 2.5);
    ctx.strokeStyle = '#ffffff07';
    ctx.lineWidth = 0.6;
    for (let x = 1; x < 10; x++) {
      ctx.beginPath();
      ctx.moveTo(x * size, 0);
      ctx.lineTo(x * size, h);
      ctx.stroke();
    }
    for (let y = 1; y < 20; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * size);
      ctx.lineTo(w, y * size);
      ctx.stroke();
    }
    const block = (x: number, y: number, kind: Kind, ghost = false, alpha = 1) => {
      if (y < HIDDEN) return;
      const bx = x * size + 1.5,
        by = (y - HIDDEN) * size + 1.5,
        width = size - 3;
      ctx.globalAlpha = alpha;
      const color = COLORS[kind];
      if (ghost) {
        ctx.fillStyle = `${color}0a`;
        ctx.strokeStyle = `${color}65`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx + 1, by + 1, width - 2, width - 2, 3);
        ctx.fill();
        ctx.stroke();
      } else {
        const gradient = ctx.createLinearGradient(bx, by, bx + width * 0.6, by + width);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, `${color}b0`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(bx, by, width, width, Math.max(2, size * 0.13));
        ctx.fill();
        ctx.fillStyle = '#ffffff28';
        ctx.beginPath();
        ctx.roundRect(bx + 2, by + 1, width - 4, 2, 1);
        ctx.fill();
        ctx.fillStyle = '#ffffff08';
        ctx.fillRect(bx + 4, by + 5, Math.max(1, width - 8), Math.max(1, width - 10));
      }
      ctx.globalAlpha = 1;
    };
    if (game.state === 'over') this.overTime += dt;
    else this.overTime = 0;
    game.board.grid.forEach((row, y) =>
      row.forEach((kind, x) => {
        if (!kind) return;
        const clearing = game.clearing.includes(y);
        const alpha = clearing && !this.reducedMotion ? Math.max(0, 1 - game.clearTime / 280) : 1;
        block(
          x,
          y,
          kind,
          false,
          game.state === 'over' && y > 22 - this.overTime / 35 ? 0.25 : alpha,
        );
      }),
    );
    if (game.state === 'playing' || (game.state === 'paused' && !game.clearing.length)) {
      if (game.pieceId !== this.pieceId) {
        this.displayY = game.piece.y;
        this.pieceId = game.pieceId;
      }
      if (active) this.displayY += (game.piece.y - this.displayY) * Math.min(1, dt / 45);
      if (this.reducedMotion || this.displayY > game.piece.y || game.piece.y - this.displayY > 2)
        this.displayY = game.piece.y;
      for (const [x, y] of game.board.ghost(game.piece).cells()) block(x, y, game.piece.kind, true);
      for (const [x, y] of game.piece.cells())
        block(x, y + this.displayY - game.piece.y, game.piece.kind);
      if (game.grounded()) {
        ctx.fillStyle = `rgba(255,255,255,${0.1 + (game.lockTime / 500) * 0.2})`;
        for (const [x, y] of game.piece.cells())
          if (y >= HIDDEN) {
            ctx.beginPath();
            ctx.roundRect(x * size + 2, (y - HIDDEN) * size + 2, size - 4, size - 4, 3);
            ctx.fill();
          }
      }
    }
    for (const y of game.clearing) {
      const progress = game.clearTime / 280;
      ctx.fillStyle = `rgba(225,255,247,${this.reducedMotion ? 0.2 : (1 - progress) * 0.7})`;
      const inset = this.reducedMotion ? 0 : (progress * w) / 2;
      ctx.fillRect(inset, (y - HIDDEN) * size, w - inset * 2, size);
    }
    if (game.state === 'menu') this.particles = [];
    for (const p of this.particles) {
      if (active) {
        p.life -= dt / 1000;
        p.x += (p.vx * dt) / 1000;
        p.y += (p.vy * dt) / 1000;
        p.vy += dt / 140;
      }
      if (this.reducedMotion) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x * size, p.y * size, 3, 3);
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    ctx.globalAlpha = 1;
  }
}
