import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', timeout: 120000, workers: 1,
  projects: [
    { name: 'host', testMatch: ['responsive-editor.spec.ts', 'runtime-unavailable.spec.ts', 'stories.spec.ts', 'authoring.spec.ts', 'flow-authoring.spec.ts', 'mobile-authoring.spec.ts', 'presentation-polish.spec.ts', 'composition-intent.spec.ts', 'legacy-authoring-workspace.spec.ts', 'responsive-audio-authoring.spec.ts','vn-workflow.spec.ts','shortstory.spec.ts','chapter-branch-identity.spec.ts','reading-surface.spec.ts','local-library.spec.ts','existing-story-enhancement.spec.ts','existing-score-runtime.spec.ts','media-provenance.spec.ts','entry-cover.spec.ts'] },
    { name: 'runtime', testMatch: 'renpy-runtime.spec.ts', use: { deviceScaleFactor: 1 } },
    { name: 'runtime-dpr-1.5', testMatch: 'renpy-runtime.spec.ts', use: { deviceScaleFactor: 1.5 } },
    { name: 'runtime-dpr-2', testMatch: 'renpy-runtime.spec.ts', use: { deviceScaleFactor: 2 } },
    { name: 'stories-runtime', testMatch: ['stories-runtime.spec.ts', 'authoring.spec.ts', 'flow-authoring.spec.ts', 'mobile-authoring.spec.ts', 'presentation-polish.spec.ts', 'composition-intent.spec.ts', 'legacy-authoring-workspace.spec.ts', 'responsive-audio-authoring.spec.ts','vn-workflow.spec.ts','creative-reading-journey.spec.ts','local-library.spec.ts','existing-story-enhancement.spec.ts','existing-score-runtime.spec.ts','media-provenance.spec.ts','entry-cover.spec.ts'], use: { deviceScaleFactor: 1 } },
  ],
  use: { baseURL: 'http://127.0.0.1:3000', browserName: 'chromium', channel: process.env.KNOL_BROWSER_CHANNEL || undefined, trace: 'retain-on-failure' },
  webServer: { command: process.env.KNOL_TEST_STATIC ? 'pnpm preview' : 'pnpm dev', url: 'http://127.0.0.1:3000', reuseExistingServer: !process.env.CI && !process.env.KNOL_TEST_STATIC, timeout: 120000 },
});
