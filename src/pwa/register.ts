interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export function registerPWA(): void {
  const button = document.querySelector<HTMLButtonElement>('#install')!;
  const status = document.querySelector<HTMLElement>('.local-tag')!;
  if (import.meta.env.VITE_STANDALONE || location.protocol === 'file:') {
    const home = document.querySelector<HTMLAnchorElement>('.brand');
    if (home) home.href = location.href;
    status.innerHTML = '<i></i> 单文件 · 离线畅玩';
    button.hidden = true;
    return;
  }
  status.innerHTML = '<i></i> 单机 · 随时开玩';
  let prompt: InstallPrompt | undefined;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    prompt = e as InstallPrompt;
    button.hidden = false;
  });
  button.addEventListener('click', async () => {
    if (!prompt) return;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      /* Browser may withdraw the prompt. */
    }
    prompt = undefined;
    button.hidden = true;
  });
  window.addEventListener('appinstalled', () => {
    button.hidden = true;
    prompt = undefined;
  });
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}service-worker.js`)
        .then(async (registration) => {
          await navigator.serviceWorker.ready;
          status.innerHTML = '<i></i> 单机 · 离线就绪';
          const updateNotice = () => {
            status.textContent = '新版就绪 · 关闭全部页面后更新';
          };
          if (registration.waiting) updateNotice();
          registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            worker?.addEventListener('statechange', () => {
              if (worker.state === 'installed' && navigator.serviceWorker.controller)
                updateNotice();
            });
          });
        })
        .catch(() => {
          status.textContent = '在线模式 · 离线缓存未启用';
        });
    });
  }
}
