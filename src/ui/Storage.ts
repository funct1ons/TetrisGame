export interface Settings {
  sound: boolean;
  haptics: boolean;
  theme: 'aurora' | 'sunset';
  reducedMotion: boolean;
}
export class Storage {
  best = 0;
  settings: Settings = {
    sound: true,
    haptics: true,
    theme: 'aurora',
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
  constructor() {
    try {
      const data = JSON.parse(localStorage.getItem('prism-v1') ?? '{}');
      if (Number.isFinite(data.best) && data.best >= 0) this.best = data.best;
      const s = data.settings;
      if (s && typeof s === 'object') {
        for (const key of ['sound', 'haptics', 'reducedMotion'] as const)
          if (typeof s[key] === 'boolean') this.settings[key] = s[key];
        if (s.theme === 'aurora' || s.theme === 'sunset') this.settings.theme = s.theme;
      }
    } catch {
      /* Private browsing or damaged storage: use safe defaults. */
    }
  }
  save(): void {
    try {
      localStorage.setItem(
        'prism-v1',
        JSON.stringify({ best: this.best, settings: this.settings }),
      );
    } catch {
      /* Gameplay works without storage. */
    }
  }
  record(score: number): void {
    if (score > this.best) {
      this.best = score;
      this.save();
    }
  }
}
