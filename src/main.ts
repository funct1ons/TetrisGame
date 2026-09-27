import { Game, type Action } from './game/Game';
import { CanvasRenderer } from './rendering/CanvasRenderer';
import { KeyboardInput } from './input/KeyboardInput';
import { TouchInput } from './input/TouchInput';
import { UIManager } from './ui/UIManager';
import { Storage } from './ui/Storage';
import { AudioManager } from './audio/AudioManager';
import { registerPWA } from './pwa/register';
import './style.css';
import './mobile.css';
const game = new Game(),
  storage = new Storage(),
  audio = new AudioManager();
const unlockAudio = () => {
  audio.enabled = storage.settings.sound;
  audio.unlock();
};
window.addEventListener('pointerdown', unlockAudio, { passive: true });
window.addEventListener('keydown', unlockAudio);
const dispatch = (action: Action) => {
  if (document.querySelector('dialog[open]')) return;
  game.action(action);
  ui.update();
  if (game.state === 'paused') {
    keyboard.reset();
    touch.reset();
    storage.record(game.scoring.score);
  }
};
// Portrait phones hand a permanent slice of the screen to the browser toolbar, and because the
// game deliberately never scrolls the toolbar cannot auto-hide. Claim it back on the first tap
// (fullscreen needs a user gesture). Android and desktop honour this; iOS Safari has no element
// fullscreen, and its users get the home-screen route instead, so a failure here is silent.
const enterFullscreen = () => {
  if (document.fullscreenElement || !document.fullscreenEnabled) return;
  if (!matchMedia('(pointer: coarse)').matches) return;
  void document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
};
const ui = new UIManager(
  game,
  storage,
  () => {
    keyboard.reset();
    touch.reset();
    game.start();
    ui.update();
    enterFullscreen();
  },
  dispatch,
);
const renderer = new CanvasRenderer(ui.canvas);
const keyboard = new KeyboardInput(dispatch),
  touch = new TouchInput(ui.canvas, dispatch);
game.onEvent = (event) => {
  audio.enabled = storage.settings.sound;
  audio.play(event);
  renderer.event(event, game);
  if (storage.settings.haptics && (event === 'drop' || event === 'clear'))
    navigator.vibrate?.(event === 'clear' ? [15, 30, 15] : 12);
  if (event === 'clear') {
    const toast = document.getElementById('toast')!;
    toast.textContent = game.lastClear;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
  }
  if (event === 'over' || event === 'clear') storage.record(game.scoring.score);
};
const suspend = () => {
  if (game.state === 'playing' || game.state === 'clearing') dispatch('pause');
  keyboard.reset();
  touch.reset();
  storage.record(game.scoring.score);
};
window.addEventListener('blur', suspend);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) suspend();
});
let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(now - last, 50);
  last = now;
  keyboard.update(dt);
  touch.update(dt);
  game.update(dt);
  renderer.reducedMotion = storage.settings.reducedMotion;
  renderer.draw(game, dt);
  ui.update();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
registerPWA();
