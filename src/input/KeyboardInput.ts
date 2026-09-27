import type { Action } from '../game/Game';
const KEYS: Record<string, Action> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'down',
  ArrowUp: 'rotate',
  Space: 'drop',
  KeyP: 'pause',
  Escape: 'pause',
  KeyC: 'hold',
  ShiftLeft: 'hold',
  KeyZ: 'counterRotate',
  KeyX: 'rotate',
};
export class KeyboardInput {
  private held = new Map<string, { action: Action; time: number; next: number }>();
  constructor(private dispatch: (action: Action) => void) {
    window.addEventListener('keydown', (e) => {
      const action = KEYS[e.code];
      if (
        !action ||
        (e.target instanceof HTMLElement &&
          ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName))
      )
        return;
      e.preventDefault();
      if (e.repeat || this.held.has(e.code)) return;
      dispatch(action);
      this.held.set(e.code, { action, time: 0, next: action === 'down' ? 45 : 160 });
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    window.addEventListener('blur', () => this.reset());
  }
  reset(): void {
    this.held.clear();
  }
  update(dt: number): void {
    for (const key of this.held.values()) {
      if (!['left', 'right', 'down'].includes(key.action)) continue;
      key.time += dt;
      while (key.time >= key.next) {
        this.dispatch(key.action);
        key.next += key.action === 'down' ? 45 : 55;
      }
    }
  }
}
