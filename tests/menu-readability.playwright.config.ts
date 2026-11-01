import {defineConfig} from '@playwright/test';
const origin=process.env.KNOL_REMOTE_ORIGIN;
export default defineConfig({testDir:'./e2e',testMatch:'menu-readability.spec.ts',workers:1,timeout:60000,use:{baseURL:origin??'http://127.0.0.1:3000',browserName:'chromium',trace:'retain-on-failure'},outputDir:'../.cache/menu-readability-results',reporter:[['list']],...(!origin?{webServer:{command:'pnpm preview',url:'http://127.0.0.1:3000',reuseExistingServer:false}}:{})});
