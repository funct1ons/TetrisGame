import { defineConfig } from '@playwright/test';

// Intentionally no webServer: this suite only opens the distributable file:// URL.
export default defineConfig({
  testDir: './e2e-portable',
  use: { browserName: 'chromium' },
  reporter: 'list',
});
