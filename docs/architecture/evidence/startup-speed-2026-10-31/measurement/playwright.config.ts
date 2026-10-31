import {defineConfig} from '@playwright/test';
import {resolve} from 'node:path';
// Startup-speed measurements of 2026-10-31 (results and limits: ../checkpoint.json). Live site by default.
// Run from the repository root, one spec at a time, for example:
//   KNOL_PERF_SPEC=persistent.spec.ts KNOL_PERF_LABEL=run pnpm exec playwright test --config docs/architecture/evidence/startup-speed-2026-10-31/measurement/playwright.config.ts
// KNOL_REMOTE_ORIGIN picks another origin, KNOL_CACHE_BYTES sets Chromium's disk cache size.
// Results go to .cache/perf-check/results-<label>/ (Git-ignored). Times depend on the line: compare runs made at the same time.
const root=resolve(import.meta.dirname,'../../../../..');
export default defineConfig({testDir:import.meta.dirname,testMatch:[process.env.KNOL_PERF_SPEC??'persistent.spec.ts'],workers:1,timeout:900000,expect:{timeout:60000},use:{baseURL:process.env.KNOL_REMOTE_ORIGIN??'https://story.knolquiz.com',browserName:'chromium',viewport:{width:1280,height:800},launchOptions:{args:process.env.KNOL_CACHE_BYTES?[`--disk-cache-size=${process.env.KNOL_CACHE_BYTES}`]:[]}},projects:[{name:'live'}],outputDir:resolve(root,'.cache/perf-check/results-'+(process.env.KNOL_PERF_LABEL??'run')),reporter:[['list']]});
