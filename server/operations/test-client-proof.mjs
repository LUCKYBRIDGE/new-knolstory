/** Deterministic local transport gate; no private media, containers or service credentials. */
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const sources=['production-ingress','trusted-ingress-socket','client-proof-gateway','client-proof-route-plan','client-proof-bundle','client-proof-launch','client-proof-preflight','client-proof-compose-plan'];
const tests=['production-ingress','trusted-ingress-socket','ingress-proof-relay','client-proof-gateway','client-proof-route-plan','client-proof-bundle','client-proof-launch','client-proof-preflight','client-proof-compose-plan'];
const args=['--test','--experimental-test-coverage','--test-coverage-lines=80','--test-coverage-branches=80','--test-coverage-functions=80',...sources.map(name=>'--test-coverage-include=server/operations/'+name+'.mjs'),...tests.map(name=>'server/operations/'+name+'.test.mjs')];
const result=spawnSync(process.execPath,args,{cwd:fileURLToPath(new URL('../../',import.meta.url)),stdio:'inherit'});
process.exitCode=result.status??1;
