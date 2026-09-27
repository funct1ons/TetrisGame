import { TYPES, type Kind } from './Tetromino';
export class Randomizer {
  private bag: Kind[] = [];
  constructor(private random: () => number = Math.random) {}
  next(): Kind {
    if (!this.bag.length) {
      this.bag = [...TYPES];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop()!;
  }
}
