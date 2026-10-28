import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['packages/compatibility/tests/libreoffice-roundtrip.integration.ts'],fileParallelism:false,hookTimeout:45000}});
