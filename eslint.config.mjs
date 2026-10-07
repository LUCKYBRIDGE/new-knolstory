import next from 'eslint-config-next/core-web-vitals';
const config = [...next, {settings: {next: {rootDir: 'apps/web/'}}}, {ignores:['**/.cache/**','**/.next/**','**/.next-dev/**','**/out/**','**/dist/**','**/node_modules/**','**/public/runtime/**','coverage/**','test-results/**','playwright-report/**']}];

export default config;
