import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['docs/architecture/evidence/isolated-restore-2026-11-03/measurement/validate-content.test.ts'],fileParallelism:false,reporters:['default']}});
