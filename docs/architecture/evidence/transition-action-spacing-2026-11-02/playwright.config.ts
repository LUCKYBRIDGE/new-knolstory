import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'../../../../tests/e2e',testMatch:['transition-action-spacing.spec.ts','perspective-cue.spec.ts'],workers:1,use:{baseURL:process.env.KNOL_TRANSITION_BASE_URL??'http://127.0.0.1:15407',browserName:'chromium',trace:'retain-on-failure'},outputDir:'../../../../test-results/transition-action-spacing'});
