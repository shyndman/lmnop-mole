import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  use: {
    headless: false, // Extensions require headed mode
  },
  projects: [
    {
      name: 'extension-tests',
      use: { 
        // Use Chromium for extension testing
        channel: 'chromium',
      },
    },
  ],
});