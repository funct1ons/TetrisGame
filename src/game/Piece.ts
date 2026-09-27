import { SHAPES, rotateMatrix, type Kind, type Matrix } from './Tetromino';
export class Piece {
  x: number;
  y = 1;
  rotation = 0;
  matrix: Matrix;
  constructor(public kind: Kind) {
    this.matrix = SHAPES[kind].map((row) => [...row]);
    this.x = Math.floor((10 - this.matrix.length) / 2);
  }
  rotated(direction: 1 | -1): Piece {
    const next = this.copy();
    if (this.kind !== 'O') next.matrix = rotateMatrix(this.matrix, direction);
    next.rotation = (this.rotation + direction + 4) % 4;
    return next;
  }
  copy(): Piece {
    const next = new Piece(this.kind);
    Object.assign(next, this);
    return next;
  }
  cells(): [number, number][] {
    return this.matrix.flatMap((row, y) =>
      row.flatMap((value, x) => (value ? [[this.x + x, this.y + y] as [number, number]] : [])),
    );
  }
}
// SRS offsets: coordinates use positive Y downwards.
const JLSTZ: Record<string, [number, number][]> = {
  '0>1': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  '1>0': [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  '1>2': [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  '2>1': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  '2>3': [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  '3>2': [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  '3>0': [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  '0>3': [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
};
const I: Record<string, [number, number][]> = {
  '0>1': [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  '1>0': [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  '1>2': [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
  '2>1': [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  '2>3': [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  '3>2': [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  '3>0': [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  '0>3': [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
};
export function kicks(piece: Piece, next: Piece): [number, number][] {
  return (piece.kind === 'I' ? I : JLSTZ)[`${piece.rotation}>${next.rotation}`] ?? [[0, 0]];
}
