import {defineConfig} from '@playwright/test';import {diskGuardSetup,testOutputDir} from './disk-guard';
export default defineConfig({
 testDir:'./e2e',testMatch:'transparency-repair.spec.ts',workers:1,timeout:240000,
 use:{baseURL:'http://127.0.0.1:15461',browserName:'chromium',trace:'retain-on-failure',actionTimeout:15000},
 outputDir:testOutputDir(import.meta.dirname,'../test-results/transparency-repair'),globalSetup:diskGuardSetup,reporter:[['list']],
 webServer:{command:'python3 scripts/serve-test-build.py --port 15461',cwd:process.cwd(),url:'http://127.0.0.1:15461',reuseExistingServer:false,timeout:30000},
});
