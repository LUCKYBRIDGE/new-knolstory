import {defineConfig} from '@playwright/test';
const url=process.env.KNOLSTORY_RESTORE_URL??'http://127.0.0.1:3142';
const parsed=new URL(url);
if(parsed.origin!==url||parsed.protocol!=='http:'||parsed.hostname!=='127.0.0.1')throw Error('An isolated loopback restore preview is required.');
if(!/^[a-f0-9]{64}$/.test(process.env.KNOLSTORY_RESTORE_MANIFEST_SHA??''))throw Error('A verified restored manifest SHA256 is required.');
export default defineConfig({testDir:'../../tests/e2e',testMatch:'restored-release.spec.ts',timeout:180000,workers:1,outputDir:'../../test-results/restored-release',reporter:[['list']],use:{baseURL:url,browserName:'chromium',trace:'retain-on-failure'}});
