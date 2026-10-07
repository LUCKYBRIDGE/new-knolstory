import type { NextConfig } from 'next';
const config: NextConfig = { output: 'export', distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next', transpilePackages: ['@knolstory/runtime-core','@knolstory/runtime-contract'], devIndicators: false };
export default config;
