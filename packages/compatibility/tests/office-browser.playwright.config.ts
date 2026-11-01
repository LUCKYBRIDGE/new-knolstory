import {defineConfig} from '@playwright/test';
const origin=process.env.KNOL_REMOTE_ORIGIN;
export default defineConfig({testDir:'../../../tests/e2e',testMatch:'external-workbook-import.spec.ts',workers:1,timeout:150000,outputDir:`../../../.cache/office-browser-${Date.now()}`,use:{baseURL:origin??'http://127.0.0.1:15401',browserName:'chromium',actionTimeout:12000,trace:'retain-on-failure'},...(!origin?{webServer:{cwd:'../../..',command:'python3 scripts/serve-test-build.py --port 15401',url:'http://127.0.0.1:15401',reuseExistingServer:false,stdout:'ignore',stderr:'ignore'}}:{})});
