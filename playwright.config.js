import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// Use system Chromium locally if present; CI uses Playwright's bundled browser.
const systemChromium = '/usr/bin/chromium';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    launchOptions: !process.env.CI && existsSync(systemChromium) ? { executablePath: systemChromium } : {},
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
});
