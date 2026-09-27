import type { Game, Action } from '../game/Game';
import { SHAPES, type Kind } from '../game/Tetromino';
import { COLORS } from '../rendering/CanvasRenderer';
import type { Storage } from './Storage';
export class UIManager {
  canvas: HTMLCanvasElement;
  private last = '';
  constructor(
    private game: Game,
    private storage: Storage,
    start: () => void,
    dispatch: (action: Action) => void,
  ) {
    document.querySelector('#app')!.innerHTML = `
      <div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>
      <main class="shell">
        <header class="topbar"><a class="brand" href="./" aria-label="PRISM 首页"><span class="brand-mark">▦</span> PRISM<span class="brand-dot">.</span></a><div class="top-actions"><span class="local-tag"><i></i> 单机 · 离线就绪</span><button class="icon-button" id="settings" aria-label="打开设置">⚙</button><button class="icon-button" id="pause" aria-label="暂停游戏">Ⅱ</button></div></header>
        <section class="intro"><div><p class="eyebrow">FIND YOUR FLOW</p><h1>让每一块，<span>恰到好处。</span></h1></div><p class="intro-note">放下杂念，落下方块。<br>属于你的片刻心流。</p></section>
        <section class="play-layout">
          <aside class="left-rail"><div class="stat-card score-card"><span class="eyebrow">SCORE / 得分</span><strong id="score">0</strong><span class="best-label">个人最佳 <b id="best">0</b></span></div><div class="stat-card hold-card"><div class="card-title"><span class="eyebrow">HOLD / 暂存</span><kbd>C</kbd></div><button id="hold" aria-label="暂存方块"><span id="hold-piece" class="piece-preview empty">＋</span></button><small id="hold-hint">留一块，给下一步</small></div><div class="desktop-tip"><span>✦</span><p>不急，找到你的节奏。<br>每一次消除，都是新的空间。</p></div></aside>
          <div class="board-column"><div class="board-top"><span><i class="live-dot"></i> <span id="mode-label">CLASSIC</span></span><span id="timer">00:00</span></div><div class="board-wrap"><canvas id="board" aria-label="俄罗斯方块游戏棋盘，使用方向键或下方触控按钮操作"></canvas><div id="overlay" class="overlay"></div><div id="toast" class="toast" role="status"></div></div><div class="board-bottom"><span id="status-label">准备进入心流</span><span>10 × 20</span></div></div>
          <aside class="right-rail"><div class="stat-card next-card"><span class="eyebrow">NEXT / 接下来</span><div id="next"></div></div><div class="stat-card progress-card"><div><span class="eyebrow">LEVEL</span><strong id="level">01</strong></div><div class="progress-track"><i id="progress"></i></div><div class="line-stat"><span>消除行数</span><b id="lines">0</b></div></div><button class="quiet-button" id="help">操作指南 ↗</button></aside>
        </section>
        <nav class="touch-controls" aria-label="游戏控制"><button data-action="hold" class="secondary-control" aria-label="暂存">⇄<small>暂存</small></button><button data-action="left" aria-label="左移">←</button><button data-action="rotate" class="rotate-control" aria-label="顺时针旋转">↻<small>旋转</small></button><button data-action="right" aria-label="右移">→</button><button data-action="down" aria-label="软降">↓</button><button data-action="drop" class="drop-control">⇓ <span>直接落下</span><kbd>SPACE</kbd></button></nav>
        <footer><span>滑动移动 · 轻触旋转 · 长按下降</span><span class="desktop-keys">← → 移动 &nbsp; ↑ 旋转 &nbsp; SPACE 落下 &nbsp; P 暂停</span><button id="install" hidden>安装到主屏幕 ↗</button></footer>
      </main>
      <dialog id="settings-dialog"><form method="dialog"><div class="dialog-header"><h2>按你的节奏</h2><button class="icon-button" aria-label="关闭设置">✕</button></div><p class="muted">把这里调成你喜欢的样子。</p><label class="setting-row">游戏音效<input type="checkbox" id="sound-setting"></label><label class="setting-row">触觉反馈<input type="checkbox" id="haptics-setting"></label><label class="setting-row">减少动态效果<input type="checkbox" id="motion-setting"></label><label class="setting-row">色彩主题<select id="theme-setting"><option value="aurora">极光薄荷</option><option value="sunset">日落珊瑚</option></select></label><button class="primary-button dialog-done">完成</button></form></dialog>
      <dialog id="help-dialog"><form method="dialog"><div class="dialog-header"><h2>找到你的手感</h2><button class="icon-button" aria-label="关闭指南">✕</button></div><div class="help-content"><p><b>手机</b><br>左右滑动：移动方块<br>下滑 / 长按棋盘：缓慢下降<br>轻触棋盘：顺时针旋转<br>直接落下按钮：立即固定</p><p><b>键盘</b><br>← → 移动 · ↓ 软降<br>↑ / X 顺时针 · Z 逆时针<br>Space 硬降 · C / Shift 暂存 · P / Esc 暂停</p><p>每个方块只能暂存一次。虚线是落点预览。<br>落地后有 0.5 秒调整时间，最多重置 15 次。<br>连续消行有连击加分；每消除 10 行升一级。</p></div><button class="primary-button dialog-done">开始心流</button></form></dialog>`;
    this.canvas = document.querySelector('#board')!;
    const on = (id: string, fn: () => void) =>
      document.querySelector(id)!.addEventListener('click', fn);
    on('#pause', () => dispatch('pause'));
    on('#hold', () => dispatch('hold'));
    for (const name of ['settings', 'help'])
      on(`#${name}`, () => {
        if (game.state === 'playing' || game.state === 'clearing') dispatch('pause');
        (document.querySelector(`#${name}-dialog`) as HTMLDialogElement).showModal();
      });
    document.querySelector('#overlay')!.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest('button');
      if (!button) return;
      if (button.dataset.mode) {
        game.mode = button.dataset.mode as 'classic' | 'sprint';
        this.last = '';
        this.update();
      }
      if (button.id === 'play') {
        start();
        button.blur();
      }
      if (button.id === 'resume') dispatch('pause');
      if (button.id === 'home') {
        game.state = 'menu';
        this.last = '';
        this.update();
      }
    });
    const settings = storage.settings;
    for (const [id, key] of [
      ['sound', 'sound'],
      ['haptics', 'haptics'],
      ['motion', 'reducedMotion'],
    ] as const) {
      const input = document.querySelector<HTMLInputElement>(`#${id}-setting`)!;
      input.checked = settings[key];
      input.addEventListener('change', () => {
        settings[key] = input.checked;
        storage.save();
        this.applyTheme();
      });
    }
    const select = document.querySelector<HTMLSelectElement>('#theme-setting')!;
    select.value = settings.theme;
    select.addEventListener('change', () => {
      settings.theme = select.value as 'aurora' | 'sunset';
      storage.save();
      this.applyTheme();
    });
    this.applyTheme();
    this.update();
  }
  private applyTheme(): void {
    document.documentElement.dataset.theme = this.storage.settings.theme;
    document.documentElement.classList.toggle(
      'reduced-motion',
      this.storage.settings.reducedMotion,
    );
  }
  private preview(kind: Kind | null): string {
    if (!kind) return '<span class="empty">＋</span>';
    const rows = SHAPES[kind].filter((row) => row.some(Boolean));
    return `<span class="mini-piece" style="grid-template-columns:repeat(${rows[0].length},1fr);--piece-color:${COLORS[kind]}">${rows.flatMap((row) => row.map((cell) => `<i class="${cell ? 'filled' : ''}"></i>`)).join('')}</span>`;
  }
  update(): void {
    const g = this.game,
      s = g.scoring;
    const text = (id: string, value: string) => {
      const el = document.getElementById(id)!;
      if (el.textContent !== value) el.textContent = value;
    };
    text('score', s.score.toLocaleString());
    text('best', Math.max(this.storage.best, s.score).toLocaleString());
    text('level', String(s.level).padStart(2, '0'));
    text('lines', g.mode === 'sprint' ? `${s.lines} / 40` : String(s.lines));
    text(
      'timer',
      `${String(Math.floor(g.elapsed / 60000)).padStart(2, '0')}:${String(Math.floor(g.elapsed / 1000) % 60).padStart(2, '0')}`,
    );
    text('mode-label', g.mode === 'classic' ? 'CLASSIC · 无尽' : 'SPRINT · 40 行');
    text(
      'status-label',
      g.state === 'playing'
        ? '保持专注，保持流动'
        : g.state === 'paused'
          ? '休息一下，也很好'
          : g.state === 'over'
            ? '每一局都是新的开始'
            : '准备进入心流',
    );
    document.getElementById('progress')!.style.width = `${(s.lines % 10) * 10}%`;
    const signature = [g.state, g.mode, g.held, g.holdUsed, g.queue.join(''), g.won].join('|');
    if (signature === this.last) return;
    this.last = signature;
    document.getElementById('hold-piece')!.innerHTML = this.preview(g.held);
    (document.getElementById('hold') as HTMLButtonElement).disabled = g.holdUsed;
    text('hold-hint', g.holdUsed ? '落下后可再次暂存' : '留一块，给下一步');
    document.getElementById('next')!.innerHTML =
      g.queue
        .slice(0, 3)
        .map(
          (k, i) =>
            `<div class="next-piece ${i === 0 ? 'next-first' : ''}">${this.preview(k)}</div>`,
        )
        .join('') ||
      `<div class="next-piece">${this.preview('T')}</div><div class="next-piece">${this.preview('I')}</div><div class="next-piece">${this.preview('S')}</div>`;
    const overlay = document.getElementById('overlay')!;
    overlay.hidden = g.state === 'playing' || g.state === 'clearing';
    overlay.classList.toggle('game-over', g.state === 'over');
    if (g.state === 'menu')
      overlay.innerHTML = `<div class="hero-symbol"><i></i><i></i><i></i><i></i></div><span class="eyebrow">A LITTLE SPACE TO BREATHE</span><h2>TETRIS<span>方块心流</span></h2><p>一块，一行，一次全新的可能。</p><div class="mode-switch"><button data-mode="classic" class="${g.mode === 'classic' ? 'selected' : ''}">经典无尽</button><button data-mode="sprint" class="${g.mode === 'sprint' ? 'selected' : ''}">40 行冲刺</button></div><button id="play" class="primary-button">开始游戏 <span>↗</span></button><small>个人最佳 · ${this.storage.best.toLocaleString()}</small><p class="gesture-hint">左右滑动移动 · 轻触旋转 · 长按快速下降</p>`;
    if (g.state === 'paused')
      overlay.innerHTML =
        '<span class="pause-symbol">Ⅱ</span><span class="eyebrow">TAKE A BREATH</span><h2>片刻留白</h2><p>你的方块在这里等你。</p><button id="resume" class="primary-button">继续游戏 ↗</button><button id="home" class="text-button">结束本局，返回首页</button>';
    if (g.state === 'over')
      overlay.innerHTML = `<span class="eyebrow">${g.won ? 'SPRINT COMPLETE' : 'NICELY PLAYED'}</span><h2>${g.won ? '挑战完成！' : '下次，更进一步。'}</h2><p>本局得分</p><strong class="final-score">${s.score.toLocaleString()}</strong><p>${s.lines} 行 · Lv.${s.level} · ${Math.floor(g.elapsed / 1000)} 秒</p><button id="play" class="primary-button">再来一局 ↗</button><button id="home" class="text-button">返回首页</button>`;
  }
}
