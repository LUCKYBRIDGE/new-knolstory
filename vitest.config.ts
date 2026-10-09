import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['packages/**/*.test.ts', 'apps/web/**/*.test.ts', 'spikes/**/*.test.ts'], coverage: { provider: 'v8', include: ['packages/*/src/**/*.ts', 'apps/web/lib/**/*.ts'], exclude: ['**/*.test.ts'], thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 } } } });
