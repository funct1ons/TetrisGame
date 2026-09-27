import { Board, HIDDEN } from './Board';
import { Piece, kicks } from './Piece';
import type { Kind } from './Tetromino';
import { Randomizer } from './Randomizer';
import { Scoring } from './Scoring';
export type State = 'menu' | 'playing' | 'paused' | 'clearing' | 'over';
export type Action =
  'left' | 'right' | 'down' | 'rotate' | 'counterRotate' | 'drop' | 'pause' | 'hold';
export class Game {
  board = new Board();
  piece = new Piece('T');
  pieceId = 0;
  state: State = 'menu';
  clearing: number[] = [];
  clearTime = 0;
  gravityTime = 0;
  lockTime = 0;
  lockResets = 0;
  onEvent: (event: string) => void = () => {};
  randomizer = new Randomizer();
  scoring = new Scoring();
  queue: Kind[] = [];
  held: Kind | null = null;
  holdUsed = false;
  elapsed = 0;
  mode: 'classic' | 'sprint' = 'classic';
  won = false;
  lastClear = '';
  start(): void {
    this.board = new Board();
    this.state = 'playing';
    this.clearing = [];
    this.scoring = new Scoring();
    this.randomizer = new Randomizer();
    this.queue = Array.from({ length: 5 }, () => this.randomizer.next());
    this.held = null;
    this.holdUsed = false;
    this.elapsed = 0;
    this.won = false;
    this.lastClear = '';
    this.spawn();
  }
  spawn(kind?: Kind): void {
    this.pieceId++;
    this.piece = new Piece(kind ?? this.queue.shift() ?? this.randomizer.next());
    while (this.queue.length < 5) this.queue.push(this.randomizer.next());
    this.gravityTime = this.lockTime = this.lockResets = 0;
    if (!this.board.fits(this.piece)) this.end();
  }
  end(): void {
    this.state = 'over';
    this.onEvent('over');
  }
  grounded(): boolean {
    const p = this.piece.copy();
    p.y++;
    return !this.board.fits(p);
  }
  move(dx: number, dy: number): boolean {
    const p = this.piece.copy();
    p.x += dx;
    p.y += dy;
    if (!this.board.fits(p)) return false;
    if (dx && this.grounded() && this.lockResets < 15) {
      this.lockTime = 0;
      this.lockResets++;
    }
    this.piece = p;
    return true;
  }
  rotate(direction: 1 | -1): void {
    const rotated = this.piece.rotated(direction);
    for (const [dx, dy] of kicks(this.piece, rotated)) {
      const candidate = rotated.copy();
      candidate.x += dx;
      candidate.y += dy;
      if (!this.board.fits(candidate)) continue;
      if (this.grounded() && this.lockResets < 15) {
        this.lockTime = 0;
        this.lockResets++;
      }
      this.piece = candidate;
      this.onEvent('rotate');
      return;
    }
  }
  action(action: Action): void {
    if (action === 'pause') {
      if (this.state === 'playing' || this.state === 'clearing') {
        this.pausedFrom = this.state;
        this.state = 'paused';
      } else if (this.state === 'paused') this.state = this.pausedFrom;
      return;
    }
    if (this.state !== 'playing') return;
    if (action === 'left' || action === 'right') {
      if (this.move(action === 'left' ? -1 : 1, 0)) this.onEvent('move');
    }
    if (action === 'down' && this.move(0, 1)) this.scoring.drop(1, false);
    if (action === 'hold' && !this.holdUsed) {
      const kind = this.piece.kind;
      this.spawn(this.held ?? undefined);
      this.held = kind;
      this.holdUsed = true;
      this.onEvent('hold');
    }
    if (action === 'rotate' || action === 'counterRotate')
      this.rotate(action === 'rotate' ? 1 : -1);
    if (action === 'drop') {
      const ghost = this.board.ghost(this.piece);
      this.scoring.drop(ghost.y - this.piece.y, true);
      this.piece = ghost;
      this.onEvent('drop');
      this.lock();
    }
  }
  private pausedFrom: 'playing' | 'clearing' = 'playing';
  lock(): void {
    this.board.lock(this.piece);
    this.clearing = this.board.fullRows();
    this.holdUsed = false;
    const gain = this.scoring.clear(this.clearing.length);
    if (this.clearing.length) {
      this.lastClear = `${['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS!'][this.clearing.length]}  +${gain}${this.scoring.combo > 0 ? ` · COMBO ${this.scoring.combo}` : ''}`;
      this.state = 'clearing';
      this.clearTime = 0;
      this.onEvent('clear');
    } else if (this.piece.cells().every(([, y]) => y < HIDDEN)) this.end();
    else this.spawn();
  }
  update(dt: number): void {
    if (this.state === 'playing' || this.state === 'clearing') this.elapsed += dt;
    if (this.state === 'clearing') {
      this.clearTime += dt;
      if (this.clearTime >= 280) {
        this.board.clear(this.clearing);
        this.clearing = [];
        this.state = 'playing';
        if (this.mode === 'sprint' && this.scoring.lines >= 40) {
          this.won = true;
          this.end();
        } else this.spawn();
      }
      return;
    }
    if (this.state !== 'playing') return;
    this.gravityTime += dt;
    while (this.gravityTime >= this.scoring.gravity) {
      this.gravityTime -= this.scoring.gravity;
      this.move(0, 1);
    }
    if (this.grounded()) {
      this.lockTime += dt;
      if (this.lockTime >= 500) this.lock();
    } else this.lockTime = 0;
  }
}
