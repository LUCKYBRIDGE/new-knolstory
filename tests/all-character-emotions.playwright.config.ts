import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'all-character-emotions.spec.ts',workers:1,timeout:600000,
 use:{baseURL:'http://127.0.0.1:15463',browserName:'chromium',trace:'retain-on-failure',actionTimeout:15000},
 outputDir:'../test-results/all-character-emotions',reporter:[['list']],
 webServer:{command:'python3 scripts/serve-test-build.py --port 15463',cwd:process.cwd(),url:'http://127.0.0.1:15463',reuseExistingServer:false,timeout:30000}});
