import type { NextConfig } from 'next';
import { randomBytes } from 'node:crypto';
// One identity per build: startup checks remembered in the browser (lib/workspace-checks.ts) never outlive the build that made them.
const buildId = process.env.KNOLSTORY_BUILD_ID || `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`;
const config: NextConfig = { output: 'export', distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next', transpilePackages: ['@knolstory/runtime-core','@knolstory/runtime-contract'], devIndicators: false, env: { KNOLSTORY_BUILD_ID: buildId } };
export default config;
