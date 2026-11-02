import {defineConfig} from '@playwright/test';

/** Reuse the verified static release; isolated contexts never use personal works. */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['new-creation-complete.spec.ts','creation-network-recovery.spec.ts'],
  workers: 1,
  timeout: 300000,
  use: {
    baseURL: process.env.KNOL_CREATION_ORIGIN ?? 'http://127.0.0.1:15427',
    browserName: 'chromium',
    viewport: {width: 1280, height: 900},
    actionTimeout: 15000,
    trace: 'retain-on-failure',
  },
  outputDir: '../test-results/new-creation-complete',
  reporter: [['list']],
});
