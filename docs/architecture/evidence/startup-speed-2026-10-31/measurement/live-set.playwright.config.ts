import {defineConfig} from '@playwright/test';
import {resolve} from 'node:path';
// The live regression set run on story.knolquiz.com after each 2026-10-31 deployment: the 2026-10-30
// remote Pages checks, the audio-range checks, the editor checks and (since the startup-speed change)
// the stage loading progress. 20 tests. Run from the repository root:
//   pnpm exec playwright test --config docs/architecture/evidence/startup-speed-2026-10-31/measurement/live-set.playwright.config.ts
// KNOL_REMOTE_ORIGIN points it at another origin (for example a local static candidate server).
const root=resolve(import.meta.dirname,'../../../../..');
const e2e=resolve(root,'tests/e2e');
const origin=process.env.KNOL_REMOTE_ORIGIN??'https://story.knolquiz.com';
export default defineConfig({workers:1,timeout:180000,use:{baseURL:origin,browserName:'chromium',trace:'retain-on-failure'},outputDir:resolve(root,'.cache/edge-verify/story-results'),reporter:[['list']],projects:[
 {name:'remote',testDir:e2e,testMatch:['static-candidate.spec.ts','local-work-files.spec.ts','character-relative-size.spec.ts'],grep:/split static tiers|progressive BGM|downloaded work file|relative stature|three and four automatic actors/},
 {name:'audio',testDir:import.meta.dirname,testMatch:['range-wrapper.spec.ts'],grep:/author source range roundtrips|standalone previews/},
 {name:'editor',testDir:e2e,testMatch:['editor-preview-return.spec.ts','reader-light-contrast.spec.ts']},
 {name:'progress',testDir:e2e,testMatch:['stage-loading-progress.spec.ts']},
]});
