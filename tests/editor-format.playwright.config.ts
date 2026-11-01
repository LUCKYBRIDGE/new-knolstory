import {defineConfig} from '@playwright/test';
const origin=process.env.KNOL_REMOTE_ORIGIN;
export default defineConfig({testDir:'./e2e',testMatch:['editor-format-roundtrip.spec.ts','authoring-unapplied-export.spec.ts'],workers:1,timeout:120000,use:{baseURL:origin??'http://127.0.0.1:3000',browserName:'chromium',actionTimeout:15000,viewport:{width:1280,height:900},trace:'retain-on-failure'},outputDir:'../.cache/editor-format-results',reporter:[['list']],...(!origin?{webServer:{command:'pnpm preview',url:'http://127.0.0.1:3000',reuseExistingServer:false}}:{})});
