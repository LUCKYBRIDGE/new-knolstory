/** Read the catalogue policy in an API image without starting the API or reaching a database.
 * docker run is network-isolated/read-only and receives no credentials or mounts.
 * Usage from repository root: node server/operations/check-image-catalog.mjs IMAGE OUTPUT.json
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const [image,output]=process.argv.slice(2);
if(!/^knolstory-next-api:[a-z0-9][a-z0-9_.-]+$/.test(image??'')||!output)throw Error('Expected a scoped API image tag and output file.');
const catalog=JSON.parse(readFileSync(new URL('../../packages/asset-registry/src/catalog.json',import.meta.url),'utf8'));
const input=catalog.map(asset=>({id:asset.id,type:asset.type,layered:!!asset.metadata.layeredStoryAsset}));
const probe=String.raw`
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const bytes=readFileSync('/app/main.mjs'),raw=bytes.toString(),marker='void main().catch(() => {';
if(raw.split(marker).length!==2)throw Error('Review the API entrypoint before probing a changed bundle.');
// Disable only the reviewed application entrypoint in memory. The distributed file is unchanged.
let source=raw.slice(0,raw.indexOf(marker))+'\nexport {assertCatalogOnlyMedia};\n';
source=source.replace(/from "(pg|jose)"/g,(_match,name)=>'from '+JSON.stringify(import.meta.resolve(name)));
const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const assets=JSON.parse(readFileSync(0,'utf8'));
function accepts(asset){try{module.assertCatalogOnlyMedia({project:{lines:[asset.type==='background'?{backgroundId:asset.id}:{stageComposition:{leftActors:[{key:'L1',assetId:asset.id}],rightActors:[]}}]}});return true;}catch{return false;}}
const results=assets.map(asset=>({...asset,accepted:accepts(asset)})),unknownAccepted=accepts({id:'private:unregistered-api-catalog-probe',type:'character'});
console.log(JSON.stringify({bundleSha256:createHash('sha256').update(bytes).digest('hex'),results,unknownAccepted}));
`;
const report=JSON.parse(execFileSync('docker',['run','--rm','-i','--network','none','--read-only','--memory=512m','--entrypoint','node',image,'--input-type=module','-e',probe],{input:JSON.stringify(input),encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024}));
const imageId=execFileSync('docker',['image','inspect',image,'--format','{{.Id}}'],{encoding:'utf8'}).trim();
const result={image,imageId,checkedAt:new Date().toISOString(),scope:'exact bundled image allowlist only; no HTTP login/upload or database access',...report,success:!report.unknownAccepted&&report.results.every(row=>row.accepted)};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({image,registered:input.length,accepted:report.results.filter(row=>row.accepted).length,layeredAccepted:report.results.filter(row=>row.layered&&row.accepted).length,unknownAccepted:report.unknownAccepted,success:result.success}));
if(!result.success)process.exitCode=1;
