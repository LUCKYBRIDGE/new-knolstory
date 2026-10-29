import {defineConfig} from '@playwright/test';
import {resolve} from 'node:path';
/** Prepare .cache/static-candidate explicitly; this server has no online API. */
export default defineConfig({testDir:'./e2e',testMatch:['static-candidate.spec.ts','local-work-files.spec.ts'],grep:/split static tiers|progressive BGM|downloaded work file/,workers:1,timeout:120000,
 use:{baseURL:'http://127.0.0.1:3000',browserName:'chromium',trace:'retain-on-failure'},
 webServer:{cwd:resolve(import.meta.dirname,'..'),command:'python3 scripts/serve-static-candidate.py --port 3000',url:'http://127.0.0.1:3000',reuseExistingServer:false,timeout:60000},
 outputDir:'../test-results/static-delivery',projects:[{name:'split-static'}]});
