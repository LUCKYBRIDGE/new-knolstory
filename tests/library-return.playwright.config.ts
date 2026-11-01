import {defineConfig} from '@playwright/test';
const origin=process.env.KNOL_REMOTE_ORIGIN;
export default defineConfig({testDir:'./e2e',testMatch:['library-return-recovery.spec.ts','reader-exit-recovery.spec.ts'],workers:1,timeout:45000,use:{baseURL:origin??'http://127.0.0.1:3000',browserName:'chromium',trace:'retain-on-failure'},outputDir:'../.cache/library-return-results',reporter:[['list']],...(!origin?{webServer:{command:'pnpm preview',url:'http://127.0.0.1:3000',reuseExistingServer:false}}:{})});
