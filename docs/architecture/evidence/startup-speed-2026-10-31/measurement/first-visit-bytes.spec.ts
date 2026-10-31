// Produced ../first-visit-bytes.json (local candidate .cache/pages-release-20261031e, KNOL_REMOTE_ORIGIN=http://127.0.0.1:3000).
// Diagnostic: every file a first visit fetches, by phase (library, story open, 6 s after the first scene)
// and by kind. Decoded sizes, so text files are larger than what the live site sends compressed.
import {test,expect,type Page,type Frame} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {builtinEditions,beginSelectedBook,enterLibrary,openBuiltinEdition} from '../../../../../tests/e2e/library-entry';

type Row={path:string;decoded:number;start:number};
const rows=async(target:Page|Frame):Promise<Row[]>=>target.evaluate(()=>performance.getEntriesByType('resource').map(entry=>{const r=entry as PerformanceResourceTiming;return {path:new URL(r.name).pathname,decoded:r.decodedBodySize,start:Math.round(performance.timeOrigin+r.startTime)};}));
const kind=(path:string)=>path.startsWith('/runtime/game/')?(/\.(webp|png|jpe?g|avif)$/i.test(path)?'runtime image (progressive)':'runtime audio/other (progressive)'):path.startsWith('/runtime/')?'runtime engine files':path.startsWith('/_next/')?'web app code':path.startsWith('/assets/audio/')?'host audio':/\.(webp|png|jpe?g|avif|svg)$/i.test(path)?'host images':/\.(woff2?|ttf|otf)$/i.test(path)?'host fonts':'other';

test('first visit bytes by phase and kind',async({page,baseURL},info)=>{
 test.setTimeout(300000);
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
 const t0=Date.now();
 await page.goto('/',{waitUntil:'commit'});
 await enterLibrary(page);
 await page.waitForTimeout(3000);
 const library=Date.now();
 const [work,edition]=builtinEditions[0]!;
 await openBuiltinEdition(page,work,edition);
 const clicked=Date.now();
 await beginSelectedBook(page);
 const status=page.getByTestId('story-runtime-status');
 await expect.poll(async()=>{const r=await status.getAttribute('data-rendered-revision');return r!==null&&Number(r)>=0&&r===await status.getAttribute('data-scene-revision');},{timeout:240000,intervals:[100]}).toBe(true);
 const rendered=Date.now();
 await page.waitForTimeout(6000);
 const frame=page.frames().find(item=>new URL(item.url()).pathname.startsWith('/runtime/'));
 const all=[...await rows(page),...(frame?await rows(frame):[])];
 const phase=(row:Row)=>row.start<library?'1 library':row.start<clicked?'2 book dialog':row.start<=rendered?'3 story open':'4 after first scene';
 const table:Record<string,Record<string,{files:number;bytes:number}>>={};
 for(const row of all){const p=phase(row),k=kind(row.path);(table[p]??={});(table[p][k]??={files:0,bytes:0});table[p][k].files++;table[p][k].bytes+=row.decoded;}
 const images=all.filter(row=>row.path.startsWith('/runtime/game/')&&/\.(webp|png|jpe?g)$/i.test(row.path)).map(row=>({path:row.path,bytes:row.decoded,phase:phase(row)}));
 const report={origin:baseURL,measuredAt:new Date().toISOString(),firstVisitMs:{library:library-t0,storyOpen:rendered-clicked},table,runtimeImages:images};
 writeFileSync(info.outputPath('first-visit-bytes.json'),JSON.stringify(report,null,1));
 console.log(JSON.stringify(report));
});
