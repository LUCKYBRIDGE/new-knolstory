import {defineConfig} from '@playwright/test';
import {fileURLToPath} from 'node:url';
export default defineConfig({testDir:'../../tests/e2e',testMatch:'reader-reform.spec.ts',workers:1,timeout:180000,outputDir:'../../docs/architecture/evidence/reader-vn-three-five-2026-10-18/native-ui',use:{actionTimeout:15000,baseURL:'http://127.0.0.1:3150',browserName:'chromium',trace:'retain-on-failure'},webServer:{cwd:fileURLToPath(new URL('../../',import.meta.url)),command:'python3 scripts/serve-test-build.py --port 3150',url:'http://127.0.0.1:3150',reuseExistingServer:false,timeout:30000}});
