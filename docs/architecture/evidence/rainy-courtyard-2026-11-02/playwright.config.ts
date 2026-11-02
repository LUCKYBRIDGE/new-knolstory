import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'../../../../tests/e2e',testMatch:'catalog-weather-continuity.spec.ts',workers:1,use:{baseURL:process.env.KNOL_WEATHER_BASE_URL??'http://127.0.0.1:15409',browserName:'chromium',trace:'retain-on-failure'},outputDir:'../../../../test-results/rainy-courtyard'});
