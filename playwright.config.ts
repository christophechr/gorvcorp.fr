import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:4325',
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    // Keep Astro in the foreground so Playwright owns the server lifecycle.
    command: 'npm run preview -- --host 127.0.0.1 --port 4325 --ignore-lock',
    url: 'http://127.0.0.1:4325',
  },
});
