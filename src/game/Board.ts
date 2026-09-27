import type { Kind } from './Tetromino';
import type { Piece } from './Piece';
export const WIDTH = 10,
  HEIGHT = 22,
  HIDDEN = 2;
export type Cell = Kind | null;
export class Board {
  grid: Cell[][] = Array.from({ length: HEIGHT }, () => Array<Cell>(WIDTH).fill(null));
  fits(piece: Piece): boolean {
    return piece
      .cells()
      .every(([x, y]) => x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT && this.grid[y][x] === null);
  }
  lock(piece: Piece): void {
    for (const [x, y] of piece.cells()) this.grid[y][x] = piece.kind;
  }
  fullRows(): number[] {
    return this.grid.flatMap((row, y) => (row.every(Boolean) ? [y] : []));
  }
  clear(rows: number[]): void {
    this.grid = this.grid.filter((_, y) => !rows.includes(y));
    while (this.grid.length < HEIGHT) this.grid.unshift(Array<Cell>(WIDTH).fill(null));
  }
  ghost(piece: Piece): Piece {
    const ghost = piece.copy();
    while (this.fits(ghost)) ghost.y++;
    ghost.y--;
    return ghost;
  }
}
