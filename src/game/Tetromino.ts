export const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const;
export type Kind = (typeof TYPES)[number];
export type Matrix = number[][];
export const SHAPES: Record<Kind, Matrix> = {
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
export function rotateMatrix(matrix: Matrix, direction: 1 | -1): Matrix {
  const n = matrix.length;
  return matrix.map((row, y) =>
    row.map((_, x) => (direction === 1 ? matrix[n - 1 - x][y] : matrix[x][n - 1 - y])),
  );
}
