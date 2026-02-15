import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'child_process';

function getChromiumPath(): string | undefined {
  try {
    const which = execSync('which chromium 2>/dev/null || true')
      .toString()
      .trim();
    if (which) return which;
  } catch {
    // ignore
  }
  // Fallback: check ms-playwright cache for any installed chromium
  try {
    const found = execSync('find /root/.cache/ms-playwright -name "chrome" -type f 2>/dev/null | head -1')
      .toString()
      .trim();
    if (found) return found;
  } catch {
    // ignore
  }
  return undefined;
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        launchOptions: {
          executablePath: getChromiumPath(),
        },
      },
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
