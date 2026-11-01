import {defineConfig} from '@playwright/test';
import {resolve} from 'node:path';
import prior from '../startup-speed-2026-10-31/measurement/live-set.playwright.config';
// Run from the repository root. Each browser context is isolated and API calls in
// authoring fixtures are intercepted. KNOL_REMOTE_ORIGIN can select a static candidate.
const root=resolve(import.meta.dirname,'../../../..');
export default defineConfig({...prior,outputDir:resolve(root,'.cache/takeover-live-results'),projects:[
 ...(prior.projects??[]),
 {name:'handover',testDir:resolve(root,'tests/e2e'),testMatch:['multi-tab-handover.spec.ts','perspective-cue.spec.ts','reader-touch-navigation.spec.ts','authoring-format-runtime.spec.ts'],grepInvert:/real (google|excel|korean-google|korean-excel) edited full-field/},
]});
