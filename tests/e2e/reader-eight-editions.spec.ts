import {readFileSync} from 'node:fs';
import {test,expect,type Page} from '@playwright/test';
import {builtinEditions,enterLibrary,openBuiltinEdition,beginSelectedBook} from './library-entry';
import {readerLibrary} from './native-reader';

type TextEdit={projectId:string;lineId:string;after:string};
type Project={id:string;lines:Array<{id:string;text:string;flow?:{type:string};ending?:{endsStory?:boolean}}>};
const readEdits=(name:string)=>JSON.parse(readFileSync(new URL(`../../packages/compatibility/src/${name}.json`,import.meta.url),'utf8')) as TextEdit[];
const additional=['rabbit','heungbu','seonnyeo','onggojib'].flatMap(id=>readEdits(`reader-edit-${id}`));
const edits=[...readEdits('reader-text-rabbit-heungbu'),...readEdits('reader-text-seonnyeo-onggojib'),...additional];
const workspaceKey='knolstory-next-workspace-v1';

async function rendered(page:Page){
 const status=page.getByTestId('story-runtime-status');
 await expect.poll(async()=>{
  const revision=await status.getAttribute('data-rendered-revision');
  return revision!==null&&Number(revision)>=0&&revision===await status.getAttribute('data-scene-revision');
 },{timeout:120000}).toBe(true);
 return status;
}

async function unlockNative(page:Page){
 const status=await rendered(page);
 if(await status.getAttribute('data-audio-unlocked')!=='true'){
  await page.frameLocator('[data-testid="story-runtime-frame"]').locator('#overlayDiv').click({position:{x:30,y:30}});
  await expect(status).toHaveAttribute('data-audio-unlocked','true');
  await rendered(page);
 }
}

async function assertNativeText(page:Page,expected:string){
 await rendered(page);
 // Observe the actual scene message received inside Ren'Py's frame, then require
 // its corresponding rendered revision. This does not send or alter scenes.
 await expect.poll(()=>page.getByTestId('story-runtime-frame').evaluate(node=>{
  const frame=(node as HTMLIFrameElement).contentWindow as (Window&{__eightEditionText?:string})|null;
  return frame?.__eightEditionText??'';
 })).toBe(expected);
 const semantic=page.locator('details').filter({has:page.getByText('대사·해설 텍스트 보기',{exact:true})});
 await expect(semantic.locator('[aria-live="polite"] > p').last()).toHaveText(expected);
}

for(const [workId,edition] of builtinEditions){
 test(`${workId} ${edition}: corrected catalog manuscript renders and survives save, reload and reopen`,async({page},info)=>{
  test.setTimeout(300000);
  await page.setViewportSize({width:1280,height:720});
  await page.addInitScript(()=>{
   window.addEventListener('message',event=>{
    if(event.data?.type==='loadScene'&&typeof event.data.payload?.dialogue?.text==='string'){
     (window as Window&{__eightEditionText?:string}).__eightEditionText=event.data.payload.dialogue.text;
    }
   });
  });
  await page.goto('/');await enterLibrary(page);
  await openBuiltinEdition(page,workId,edition,'start');await beginSelectedBook(page);
  await unlockNative(page);
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  const project=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project as Project,workspaceKey);
  const editionEdits=edits.filter(edit=>edit.projectId===project.id);
  expect(editionEdits.length).toBeGreaterThan(0);
  for(const edit of editionEdits)expect(project.lines.find(line=>line.id===edit.lineId)?.text,edit.lineId).toBe(edit.after);

  // Enter a representative additional correction through the editor's saved
  // location and real preview button; do not inject a manuscript or fake a route.
  const representative=additional.filter(edit=>{
   const line=project.lines.find(item=>item.id===edit.lineId);
   return edit.projectId===project.id&&!!line&&line.flow?.type!=='choice'&&!line.ending?.endsStory;
  })
   .toSorted((a,b)=>a.after.length-b.after.length)[0]!;
  expect(representative).toBeTruthy();
  await readerLibrary(page);
  await page.evaluate(({key,lineId})=>{
   const stored=JSON.parse(localStorage.getItem(key)!);
   const context=stored.contexts[stored.storyId];
   const nextContext={...context,lineId,editingPath:[lineId],editorView:'cut',activeTool:'text'};
   localStorage.setItem(key,JSON.stringify({...stored,lineId,editingPath:[lineId],mode:'edit',view:'editor',editorView:'cut',activeTool:'text',contexts:{...stored.contexts,[stored.storyId]:nextContext}}));
  },{key:workspaceKey,lineId:representative.lineId});
  await page.goto('/?view=editor');
  await expect(page.getByRole('textbox',{name:'대사 / 해설',exact:true})).toHaveValue(representative.after);
  await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
  await unlockNative(page);await assertNativeText(page,representative.after);
  await page.getByRole('button',{name:'빠른 저장',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:/^빠른 저장 완료$/})).toBeVisible();
  const quick=await page.evaluate(id=>JSON.parse(localStorage.getItem('knolstory-player-v1')!).works[id].quick,project.id);
  expect(quick.playback.lineId).toBe(representative.lineId);
  expect(quick.summary.text).toBe(representative.after);
  expect(quick.thumbnail?.dataUrl).toMatch(/^data:image\/webp;base64,/);
  await page.reload();await unlockNative(page);await assertNativeText(page,representative.after);
  const status=await rendered(page),savedRevision=await status.getAttribute('data-scene-revision');
  const next=page.getByRole('button',{name:'다음으로',exact:true});
  await expect(next).toBeEnabled({timeout:120000});await next.press('Enter');
  await expect.poll(()=>status.getAttribute('data-scene-revision')).not.toBe(savedRevision);
  await rendered(page);
  await page.getByRole('button',{name:'빠른 불러오기',exact:true}).click();
  await page.getByRole('dialog',{name:'이 기록을 불러올까요?',exact:true}).getByRole('button',{name:'확인',exact:true}).click();
  await assertNativeText(page,representative.after);
  const loaded=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),workspaceKey);
  expect(loaded.playback.lineId).toBe(representative.lineId);
  expect(loaded.playback.path).toEqual(quick.playback.path);
  await readerLibrary(page);await openBuiltinEdition(page,workId,edition,'resume');await beginSelectedBook(page,true);
  await unlockNative(page);await assertNativeText(page,representative.after);
  const reopened=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),workspaceKey);
  expect(reopened.playback.lineId).toBe(representative.lineId);
  for(const edit of editionEdits)expect(reopened.document.project.lines.find((line:{id:string})=>line.id===edit.lineId)?.text).toBe(edit.after);
  await info.attach('edition-manuscript-verification',{body:JSON.stringify({workId,edition,projectId:project.id,checkedCorrections:editionEdits.length,representative,quickLineId:quick.playback.lineId,reopenedLineId:reopened.playback.lineId},null,2),contentType:'application/json'});
  await page.screenshot({path:info.outputPath(`${workId}-${edition}-corrected-native.png`)});
 });
}
