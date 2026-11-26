import {defineConfig} from '@playwright/test';import {diskGuardSetup,testOutputDir} from './disk-guard';
export default defineConfig({testDir:'./e2e',testMatch:'character-expressions.spec.ts',workers:1,timeout:600000,
 use:{baseURL:'http://127.0.0.1:15462',browserName:'chromium',trace:'retain-on-failure',actionTimeout:15000},
 outputDir:testOutputDir(import.meta.dirname,'../test-results/character-expressions'),globalSetup:diskGuardSetup,reporter:[['list']],
 webServer:{command:'python3 scripts/serve-test-build.py --port 15462',cwd:process.cwd(),url:'http://127.0.0.1:15462',reuseExistingServer:false,timeout:30000}});
