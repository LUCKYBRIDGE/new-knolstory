import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {confirmAuthoringImport} from './authoring-file';
for(const format of ['knolstory','shortstory'] as const)test(`${format}: real downloaded work file reopens without server or previous browser storage`,async({page,browser},info)=>{
 await page.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:undefined}));
 await page.route('**/api/**',route=>route.abort());
 await page.goto(format==='knolstory'?'/?view=editor':'/shortstory');
 const field=format==='knolstory'?page.locator('[data-current-cut] textarea').first():page.getByRole('textbox',{name:'이 쪽의 이야기',exact:true});
 await field.fill('서버 없이 실제 파일로 이어 쓰는 원고.\n파일 안에 남아야 하는 문장입니다.');
 if(format==='knolstory')await page.locator('[data-work-menu]>summary').click();
 const group=page.getByRole('group',{name:'로컬 작품 파일',exact:true});
 const pending=page.waitForEvent('download');await group.getByRole('button',{name:'작품 파일 저장',exact:true}).click();const download=await pending;
 const path=(await download.path())!,raw=await readFile(path,'utf8'),archive=JSON.parse(raw);
 expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${format}$`));expect(archive.format).toBe(format);expect(archive.formatVersion).toBe(2);
 await expect(group.getByRole('status')).toContainText('다운로드를 요청');
 const context=await browser.newContext(),reopened=await context.newPage();await reopened.route('**/api/**',route=>route.abort());
 await reopened.goto(format==='knolstory'?'/?view=editor':'/shortstory');
 if(format==='knolstory')await reopened.locator('[data-work-menu]>summary').click();
 await reopened.getByLabel(format==='knolstory'?'작품 파일 가져오기':'숏스토리 파일 가져오기',{exact:true}).setInputFiles({name:`saved.${format}`,mimeType:'application/json',buffer:Buffer.from(raw)});
 await confirmAuthoringImport(reopened);await expect(format==='knolstory'?reopened.locator('[data-current-cut] textarea').first():reopened.getByRole('textbox',{name:'이 쪽의 이야기',exact:true})).toHaveValue('서버 없이 실제 파일로 이어 쓰는 원고.\n파일 안에 남아야 하는 문장입니다.');
 if(format==='knolstory')await expect(reopened.getByTestId('save-status')).toHaveText('임시 보관됨');
 const restored=await reopened.evaluate(format=>{const data=JSON.parse(localStorage.getItem(format==='knolstory'?'knolstory-next-workspace-v1':'knolstory-shortstory-library-v1')!);return format==='knolstory'?data.document.project:data.books.find((b:{id:string})=>b.id===data.activeId);},format);
 const original=format==='knolstory'?archive.document.project:archive.project;
 expect(restored).toEqual({...original,id:restored.id});
 await info.attach('saved-work-file',{body:raw,contentType:'application/json'});await reopened.screenshot({path:info.outputPath('reopened-file.png')});await context.close();
});

test('explicit file handle save verifies write, reuses selected file, protects external edits and allows save as',async({page},info)=>{
 await page.addInitScript(()=>{
  const files=new Map<string,string>(),stats={picks:0,writes:0},root=window as unknown as {fileTest:{files:Map<string,string>;stats:typeof stats};showSaveFilePicker:()=>Promise<unknown>};root.fileTest={files,stats};
  root.showSaveFilePicker=async()=>{
   const name=`selected-${++stats.picks}.knolstory`;files.set(name,'');
   return {name,getFile:async()=>({text:async()=>files.get(name)!}),createWritable:async()=>{let staged='';return {write:async(text:string)=>{staged=text;stats.writes++;},close:async()=>{files.set(name,staged);},abort:async()=>{}};}};
  };
 });
 await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');const field=page.locator('[data-current-cut] textarea').first();await field.fill('첫 실제파일 원고');await page.locator('[data-work-menu]>summary').click();const group=page.getByRole('group',{name:'로컬 작품 파일',exact:true});
 await group.getByRole('button',{name:'작품 파일 저장',exact:true}).click();await expect(group.getByRole('status')).toContainText('파일에 저장하고 내용을 확인');
 await field.fill('같은 파일에 이어 쓴 원고');await group.getByRole('button',{name:'작품 파일 저장',exact:true}).click();await expect(group.getByRole('status')).toContainText('파일에 저장하고 내용을 확인');
 const saved=await page.evaluate(()=>{const t=(window as unknown as {fileTest:{files:Map<string,string>;stats:{picks:number;writes:number}}}).fileTest;return {raw:t.files.get('selected-1.knolstory')!,stats:t.stats};});expect(saved.stats).toEqual({picks:1,writes:2});expect(JSON.parse(saved.raw).document.project.lines[0].text).toBe('같은 파일에 이어 쓴 원고');
 await page.evaluate(()=>(window as unknown as {fileTest:{files:Map<string,string>}}).fileTest.files.set('selected-1.knolstory','외부에서 편집한 파일'));
 await group.getByRole('button',{name:'작품 파일 저장',exact:true}).click();await expect(group.getByRole('alert')).toContainText('외부에서 변경');await expect(field).toHaveValue('같은 파일에 이어 쓴 원고');
 await group.getByRole('button',{name:'다른 파일로 저장',exact:true}).click();await expect(group.getByRole('status')).toContainText('selected-2.knolstory');
 await info.attach('file-handle-model-result',{body:JSON.stringify({scope:'Modeled browser file picker/stream; verifies product integration, not native OS picker',saved},null,2),contentType:'application/json'});
});

test('file association survives work settings and delayed picker stops after leaving the work',async({page})=>{
 await page.addInitScript(()=>{
  const root=window as unknown as {saveModel:{picks:number;writes:number;release?:()=>void};showSaveFilePicker:()=>Promise<unknown>};root.saveModel={picks:0,writes:0};
  root.showSaveFilePicker=async()=>{root.saveModel.picks++;let text='';const handle={name:'session.knolstory',getFile:async()=>({text:async()=>text}),createWritable:async()=>({write:async(value:string)=>{text=value;root.saveModel.writes++;},close:async()=>{},abort:async()=>{}})};if(root.saveModel.picks===2)await new Promise<void>(resolve=>{root.saveModel.release=resolve;});return handle;};
 });
 await page.goto('/?view=editor');const field=page.locator('[data-current-cut] textarea').first();await expect(field).toBeVisible();await page.locator('[data-work-menu]>summary').click();
 const group=page.getByRole('group',{name:'로컬 작품 파일',exact:true});await group.getByRole('button',{name:'작품 파일 저장',exact:true}).click();await expect(group.getByRole('status')).toContainText('파일에 저장하고');
 await page.getByRole('button',{name:'작품 정보·표지',exact:true}).click();await expect(page.getByTestId('preparation-save-status')).toBeVisible();await page.locator('[data-work-menu]>summary').click();await group.getByRole('button',{name:'작품 파일 저장',exact:true}).click();await expect(group.getByRole('status')).toContainText('파일에 저장하고');
 expect(await page.evaluate(()=>(window as unknown as {saveModel:{picks:number;writes:number}}).saveModel)).toEqual({picks:1,writes:2});
 await group.getByRole('button',{name:'다른 파일로 저장',exact:true}).click();await page.getByRole('button',{name:'서재로',exact:true}).click();await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();
 await page.evaluate(()=>(window as unknown as {saveModel:{release:()=>void}}).saveModel.release());
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {saveModel:{writes:number}}).saveModel.writes)).toBe(2);
});

test('leaving the work while a writable file stream opens aborts before any new write',async({page})=>{
 await page.addInitScript(()=>{
  const root=window as unknown as {streamGate:{opening:boolean;writes:number;closes:number;aborts:number;release?:()=>void};showSaveFilePicker:()=>Promise<unknown>};root.streamGate={opening:false,writes:0,closes:0,aborts:0};
  root.showSaveFilePicker=async()=>({name:'late-stream.knolstory',getFile:async()=>({text:async()=>''}),createWritable:async()=>{root.streamGate.opening=true;await new Promise<void>(resolve=>{root.streamGate.release=resolve;});return {write:async()=>{root.streamGate.writes++;},close:async()=>{root.streamGate.closes++;},abort:async()=>{root.streamGate.aborts++;}};}});
 });
 await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.locator('[data-work-menu]>summary').click();await page.locator('[data-local-file-actions]').getByRole('button',{name:'작품 파일 저장',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {streamGate:{opening:boolean}}).streamGate.opening)).toBe(true);
 await page.getByRole('button',{name:'서재로',exact:true}).click();await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();
 await page.evaluate(()=>(window as unknown as {streamGate:{release:()=>void}}).streamGate.release());
 await expect.poll(()=>page.evaluate(()=>{const {writes,closes,aborts}=(window as unknown as {streamGate:{writes:number;closes:number;aborts:number}}).streamGate;return {writes,closes,aborts};})).toEqual({writes:0,closes:0,aborts:1});
});

test('file permission and disk failures keep the draft, hide native details and allow a safe retry',async({page},info)=>{
 await page.addInitScript(()=>{
  const root=window as unknown as {fileFailure:{picks:number;writes:number;failWrite:boolean;files:Record<string,string>};showSaveFilePicker:()=>Promise<unknown>};
  root.fileFailure={picks:0,writes:0,failWrite:false,files:{}};
  root.showSaveFilePicker=async()=>{
   const model=root.fileFailure;model.picks++;
   if(model.picks===1)throw new DOMException('Permission denied /private/author-name/story','NotAllowedError');
   const name=`retry-${model.picks}.knolstory`;model.files[name]='';
   return {name,getFile:async()=>({text:async()=>model.files[name]}),createWritable:async()=>{let staged='';return {
    write:async(text:string)=>{if(model.failWrite){model.failWrite=false;throw new Error('EIO disk full /private/author-name/story');}staged=text;model.writes++;},
    close:async()=>{model.files[name]=staged;},abort:async()=>{},
   };}};
  };
 });
 await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');
 const field=page.locator('[data-current-cut] textarea').first(),draft='권한 오류가 나도 보존할 원고입니다.\n다시 저장해도 문장은 그대로입니다.';
 await field.fill(draft);await page.locator('[data-work-menu]>summary').click();
 const group=page.getByRole('group',{name:'로컬 작품 파일',exact:true}),save=group.getByRole('button',{name:'작품 파일 저장',exact:true});
 await save.click();await expect(group.getByRole('alert')).toContainText('파일을 사용할 권한');await expect(group.getByRole('alert')).not.toContainText(/Permission|private|author-name/);await expect(field).toHaveValue(draft);
 await save.click();await expect(group.getByRole('status')).toContainText('retry-2.knolstory');
 const revised=`${draft}\n저장 후 덧붙인 한글도 보존합니다.`;await field.fill(revised);
 await page.evaluate(()=>(window as unknown as {fileFailure:{failWrite:boolean}}).fileFailure.failWrite=true);
 await save.click();await expect(group.getByRole('alert')).toContainText('다시 시도');await expect(group.getByRole('alert')).not.toContainText(/EIO|disk full|private|author-name/);await expect(field).toHaveValue(revised);
 await save.click();await expect(group.getByRole('status')).toContainText('retry-2.knolstory');
 const saved=await page.evaluate(()=>(window as unknown as {fileFailure:{picks:number;writes:number;files:Record<string,string>}}).fileFailure);
 expect(saved.picks).toBe(2);expect(saved.writes).toBe(2);expect(JSON.parse(saved.files['retry-2.knolstory']).document.project.lines[0].text).toBe(revised);
 await page.screenshot({path:info.outputPath('retry-keeps-file.png')});
 await info.attach('scope',{body:'Modeled browser picker and stream failures; actual native OS permission dialogs and disk failures are not verified.',contentType:'text/plain'});
});
