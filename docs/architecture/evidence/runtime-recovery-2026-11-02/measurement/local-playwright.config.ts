// Run from repository root; test server only, actual native runtime required.
import {defineConfig} from '@playwright/test';import {resolve} from 'node:path';
export default defineConfig({testDir:resolve('tests/e2e'),testMatch:'runtime-recovery.spec.ts',workers:1,use:{baseURL:'http://127.0.0.1:15403',browserName:'chromium',trace:'retain-on-failure'},webServer:{command:'python3 scripts/serve-test-build.py --port 15403',cwd:resolve('.'),url:'http://127.0.0.1:15403',reuseExistingServer:false},outputDir:resolve('test-results/runtime-recovery-isolated')});
