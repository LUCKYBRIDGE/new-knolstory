import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';
const source=JSON.parse(readFileSync('tests/fixtures/stories/presentation-polish.json','utf8'));
const project={...source,id:'long-manuscript-workbench',chapters:[source.chapters[0]],lines:Array.from({length:120},(_,index)=>({...source.lines[0],id:`long-cut-${index}`,chapterId:source.chapters[0].id,order:index+1,text:`${index+1}컷의 긴 원고.\n`+'앞뒤 맥락과 줄바꿈을 살피며 오래 쓰는 한국어 문장입니다. '.repeat(80),flow:{type:'goto',targetLineId:index===119?null:`long-cut-${index+1}`}}))};
async function menu(page:Page){const node=page.locator('[data-work-menu]');if(!await node.evaluate(n=>(n as HTMLDetailsElement).open))await node.locator(':scope>summary').click();}
async function screen(page:Page,name:string){await menu(page);await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption(name);}
async function exported(page:Page){await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await menu(page);const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();return parseAuthoringFile(await readFile((await (await pending).path())!,'utf8')).project;}

test('long manuscript keeps last-cut editing, cursor, file and internal scrolling across screen changes',async({page},info)=>{
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));await page.route('**/api/**',route=>route.abort());await page.setViewportSize({width:390,height:844});await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await menu(page);await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'long.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:7,savedAt:'2026-10-20T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);
 const before=await exported(page);await screen(page,'text');await page.getByRole('checkbox',{name:'배경 함께 보기',exact:true}).check();
 const field=page.getByTestId('editing-cut-long-cut-119').getByRole('textbox',{name:'120컷 글',exact:true});await field.scrollIntoViewIfNeeded();
 const next=before.lines[119].text+'\n끝부분에서 계속 고친 문장입니다.';await field.fill(next);await field.evaluate(node=>(node as HTMLTextAreaElement).setSelectionRange(7,12));
 await screen(page,'background');await screen(page,'text');await expect(field).toHaveValue(next);
 await expect.poll(()=>field.evaluate(node=>{const input=node as HTMLTextAreaElement;return [input.selectionStart,input.selectionEnd,document.activeElement===input];})).toEqual([7,12,true]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+2)).toBe(true);
 for(const viewport of [{width:844,height:460},{width:820,height:1180},{width:1280,height:720},{width:390,height:844}]){await page.setViewportSize(viewport);await field.scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+2)).toBe(true);}
 const after=await exported(page);expect(after).toEqual({...before,updatedAt:after.updatedAt,lines:before.lines.map((line:typeof before.lines[number],index:number)=>index===119?{...line,text:next}:line)});
 await page.reload();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await expect(field).toHaveValue(next);await field.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('long-manuscript-phone.png')});await info.attach('scenario',{body:JSON.stringify({cuts:120,characters:project.lines.reduce((sum,line)=>sum+line.text.length,0),scope:'local Chromium authoring, not native-device performance budget'}),contentType:'application/json'});
});

test('repeated resize and editor changes keep a single actual engine and intact manuscript',async({page},info)=>{
 await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const frame=page.getByTestId('story-runtime-frame');await frame.evaluate(node=>node.setAttribute('data-stability-engine','same'));
 const status=page.getByTestId('story-runtime-status');
 async function rendered(){await expect.poll(async()=>{const revision=await status.getAttribute('data-scene-revision'),actual=await status.getAttribute('data-rendered-revision');return actual!==null&&Number(actual)>=0&&actual===revision;},{timeout:90000}).toBe(true);}
 await rendered();const before=await exported(page),errors:string[]=[];
 page.on('console',message=>{if(/FS.syncfs operations in flight|ZeroDivisionError|NoneType.*update/.test(message.text())&&errors.length<10)errors.push(message.text());});page.on('pageerror',error=>errors.push(error.message));
 const viewports=[{width:390,height:844},{width:844,height:460},{width:820,height:1180},{width:1280,height:720}];
 for(let round=0;round<3;round++)for(const viewport of viewports){
  await screen(page,'text');await page.setViewportSize(viewport);await screen(page,'background');await screen(page,'basic');await rendered();
  await expect(frame).toHaveCount(1);await expect(frame).toHaveAttribute('data-stability-engine','same');
  expect(await frame.evaluate(node=>{const target=node as HTMLIFrameElement;return target.contentWindow!.innerWidth>0&&target.contentWindow!.innerHeight>0;})).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+2)).toBe(true);
 }
 expect(await exported(page)).toEqual(before);expect(errors).toEqual([]);await info.attach('bounded-resize-result',{body:JSON.stringify({cycles:12,screenChanges:36,errors,scope:'bounded actual-native desktop Chromium sequence, not hours-long or physical-device performance proof'}),contentType:'application/json'});
});
