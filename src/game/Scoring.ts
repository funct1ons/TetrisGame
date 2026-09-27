export class Scoring {
  score = 0;
  lines = 0;
  combo = -1;
  backToBack = false;
  get level(): number {
    return Math.floor(this.lines / 10) + 1;
  }
  get gravity(): number {
    return Math.max(65, 800 * Math.pow(0.79, this.level - 1));
  }
  clear(count: number): number {
    if (!count) {
      this.combo = -1;
      return 0;
    }
    this.combo++;
    const base = [0, 100, 300, 500, 800][count];
    const gain =
      (base * (count === 4 && this.backToBack ? 1.5 : 1) + Math.max(0, this.combo) * 50) *
      this.level;
    this.backToBack = count === 4;
    this.score += gain;
    this.lines += count;
    return gain;
  }
  drop(distance: number, hard: boolean): void {
    this.score += distance * (hard ? 2 : 1);
  }
}
