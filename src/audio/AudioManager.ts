export class AudioManager {
  private context?: AudioContext;
  enabled = true;
  unlock(): void {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch {
      /* Audio is optional. */
    }
  }
  play(event: string): void {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const notes: Record<string, number[]> = {
      move: [180],
      rotate: [390, 520],
      hold: [330, 440],
      drop: [130, 70],
      clear: [523, 659, 784, 1047],
      over: [392, 330, 262, 196],
    };
    const frequencies = notes[event];
    if (!frequencies) return;
    const ctx = this.context;
    frequencies.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain();
      const start = ctx.currentTime + index * (event === 'over' ? 0.13 : 0.045);
      const duration = event === 'move' ? 0.04 : 0.16;
      oscillator.type = event === 'drop' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(event === 'move' ? 0.025 : 0.07, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }
}
