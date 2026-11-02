import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'restored-image-delivery.spec.ts',workers:1,timeout:150000,use:{baseURL:'http://127.0.0.1:15428',viewport:{width:1280,height:900},browserName:'chromium',trace:'retain-on-failure',actionTimeout:15000},outputDir:'../test-results/restored-image-delivery',reporter:[['list']]});
