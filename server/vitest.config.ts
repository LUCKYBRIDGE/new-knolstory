import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@knolstory/asset-registry': fileURLToPath(new URL('../packages/asset-registry/src/index.ts', import.meta.url)),
      '@knolstory/story-domain': fileURLToPath(new URL('../packages/story-domain/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['documents/**/*.test.ts', 'documents/**/*.integration.ts', 'config.test.ts', 'storage/**/*.integration.ts', 'auth/**/*.integration.ts', 'http/**/*.integration.ts', 'auth/**/*.test.ts', 'http/**/*.test.ts', 'storage/snapshot-projection.test.ts', 'storage/sql-client-lifecycle.test.ts'],
    coverage: {provider:'v8', include:['documents/**/*.ts','config.ts','auth/**/*.ts','http/**/*.ts','storage/save-existing.ts','storage/snapshot-projection.ts','storage/postgres-save-port.ts','migrations/runner.ts'], exclude:['**/*.test.ts','**/*.integration.ts'], reporter:['text','json-summary'], thresholds:{lines:80,statements:80,branches:80,functions:80}},
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
