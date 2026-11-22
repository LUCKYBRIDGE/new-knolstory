import {readFileSync} from 'node:fs';
import {expect,type Page} from '@playwright/test';
import {enterLibrary,openBuiltinEdition,beginSelectedBook} from './library-entry';

type Playback={lineId:string|null;path:string[];status:string;choiceHistory?:Array<{pathIndex:number;choiceId:string}>};
type Edition={workId:string;edition:'original'|'knolstory';projectId:string;routes:Array<{id:string;finalState:Playback}>};
const manifests=['manifest.json','manifest-rabbit.json','manifest-onggojib.json','manifest-seonnyeo-rainy-courtyard-selected.json'];
const editions=():Edition[]=>manifests.flatMap(file=>(JSON.parse(readFileSync(new URL(`../../docs/architecture/evidence/catalog-native-paths-2026-11-02/${file}`,import.meta.url),'utf8')) as {editions:Edition[]}).editions);

/** A verified complete route of a built-in edition, stopped on its last cut instead of past it. */
export function lastCutPlayback(workId:string,edition:'original'|'knolstory'):Playback{
 const found=editions().find(item=>item.workId===workId&&item.edition===edition);if(!found)throw Error(`no route for ${workId}/${edition}`);
 const final=found.routes[0].finalState;
 return {lineId:final.path.at(-1)!,path:final.path,status:'reading',...(final.choiceHistory?{choiceHistory:final.choiceHistory}:{})};
}

export async function readerReady(page:Page){
 const status=page.getByTestId('story-runtime-status');
 await expect(status).toContainText('연결됨',{timeout:90000});
 await expect.poll(()=>status.evaluate(node=>node.getAttribute('data-scene-revision')===node.getAttribute('data-rendered-revision')),{timeout:30000}).toBe(true);
}

/** Put the reader on the last cut of the active work's reading, the way a reader resuming near the end would be. */
export async function moveReadingTo(page:Page,playback:Playback){
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('knolstory-next-workspace-v1'))).toBe(true);
 await page.evaluate(playback=>{
  const key='knolstory-next-workspace-v1',state=JSON.parse(localStorage.getItem(key)!);
  state.playback=playback;state.lineId=playback.lineId;state.editingPath=[playback.lineId];
  if(state.contexts?.[state.storyId])state.contexts[state.storyId]={...state.contexts[state.storyId],playback,lineId:playback.lineId,hasRead:true};
  localStorage.setItem(key,JSON.stringify(state));
 },playback);
 await page.reload();
}

/** Open a built-in edition from its cover and stop on the last cut of a verified complete route. */
export async function openBuiltinAtLastCut(page:Page,workId:string,edition:'original'|'knolstory'){
 await page.goto('/');await enterLibrary(page);await openBuiltinEdition(page,workId,edition,'start');await beginSelectedBook(page);
 await readerReady(page);
 await moveReadingTo(page,lastCutPlayback(workId,edition));
}

export async function startSound(page:Page){
 const gate=page.getByTestId('story-runtime-frame').contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});
 if(await gate.count()){await gate.press('Enter');await expect(gate).toHaveCount(0);}
}
/** Read on with the real native Enter until the story ends; returns once the credits are on screen. */
export async function readToEnding(page:Page){
 const credits=page.locator('[data-story-credits]');
 // Each Enter turns a text page, an effect or a cut; the last one ends the story.
 for(let turn=0;turn<30&&!await credits.count();turn++){
  await page.getByTestId('story-runtime-frame').contentFrame().locator('#canvas').press('Enter');
  if(!await credits.waitFor({timeout:1500}).then(()=>true,()=>false))await readerReady(page);
 }
 await expect(credits).toBeVisible();
}
