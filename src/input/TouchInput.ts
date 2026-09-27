import type { Action } from '../game/Game';
export class TouchInput {
  private repeats = new Map<number, { action: Action; elapsed: number; next: number }>();
  private gesture: {
    id: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    elapsed: number;
    moved: boolean;
    next: number;
  } | null = null;
  constructor(
    canvas: HTMLCanvasElement,
    private dispatch: (action: Action) => void,
  ) {
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-action]')) {
      button.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        const action = button.dataset.action as Action;
        dispatch(action);
        if (['left', 'right', 'down'].includes(action))
          this.repeats.set(e.pointerId, { action, elapsed: 0, next: action === 'down' ? 60 : 160 });
        button.classList.add('pressed');
      });
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
        button.addEventListener(event, (e) => {
          this.repeats.delete((e as PointerEvent).pointerId);
          button.classList.remove('pressed');
        });
      // Keyboard and accessibility-generated clicks have no pointer press.
      button.addEventListener('click', (e) => {
        if (e.detail === 0) dispatch(button.dataset.action as Action);
      });
    }
    canvas.addEventListener('pointerdown', (e) => {
      if (this.gesture) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      this.gesture = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        startX: e.clientX,
        startY: e.clientY,
        elapsed: 0,
        moved: false,
        next: 320,
      };
    });
    canvas.addEventListener('pointermove', (e) => {
      const g = this.gesture;
      if (!g || g.id !== e.pointerId) return;
      const step = Math.max(14, (canvas.clientWidth / 10) * 0.8);
      while (Math.abs(e.clientX - g.x) >= step) {
        const direction = Math.sign(e.clientX - g.x);
        dispatch(direction < 0 ? 'left' : 'right');
        g.x += direction * step;
        g.moved = true;
      }
      while (e.clientY - g.y >= step) {
        dispatch('down');
        g.y += step;
        g.moved = true;
      }
      if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > 10) g.moved = true;
    });
    canvas.addEventListener('pointerup', (e) => {
      const g = this.gesture;
      if (!g || g.id !== e.pointerId) return;
      if (!g.moved && g.elapsed < 300) dispatch('rotate');
      this.gesture = null;
    });
    for (const event of ['pointercancel', 'lostpointercapture'])
      canvas.addEventListener(event, () => {
        this.gesture = null;
      });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => this.reset());
  }
  reset(): void {
    this.repeats.clear();
    this.gesture = null;
    document.querySelectorAll('.pressed').forEach((el) => el.classList.remove('pressed'));
  }
  update(dt: number): void {
    for (const r of this.repeats.values()) {
      r.elapsed += dt;
      while (r.elapsed >= r.next) {
        this.dispatch(r.action);
        r.next += 55;
      }
    }
    const g = this.gesture;
    if (g) {
      g.elapsed += dt;
      if (!g.moved && g.elapsed >= g.next) {
        this.dispatch('down');
        g.next += 50;
      }
    }
  }
}
