import {advanceReading,editReadCut,restartReading} from './native-reader';
import {previousReadCut} from './reader-actions';
import {confirmAuthoringImport,expectIndependentImportedProject} from './authoring-file';
import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import type {StoryProject} from '@knolstory/story-domain';
async function ready(page:Page){const status=page.getByTestId('story-runtime-status');await expect(status).toContainText('연결됨',{timeout:90000});await expect.poll(()=>status.evaluate(node=>node.getAttribute('data-scene-revision')===node.getAttribute('data-rendered-revision')),{timeout:30000}).toBe(true);}
async function menu(page:Page){const work=page.locator('[data-work-menu]');if(!await work.evaluate(node=>(node as HTMLDetailsElement).open))await work.locator(':scope>summary').click();}
async function load(page:Page,file='score-story.knolstory'){await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await menu(page);await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles(`docs/architecture/evidence/score-narrative/${file}`);await confirmAuthoringImport(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');}
async function flow(page:Page){const extras=page.locator('[data-additional-tools]');if(!await extras.evaluate(node=>(node as HTMLDetailsElement).open))await extras.locator(':scope>summary').click();await page.getByRole('button',{name:'선택지 편집',exact:true}).click();}
async function choose(page:Page,name:string){const semantic=page.locator('details').filter({has:page.getByText('대사·해설 텍스트 보기',{exact:true})}),button=semantic.getByRole('button',{name,exact:true});await expect(button).toBeEnabled();await button.focus();await page.keyboard.press('Enter');await ready(page);}
async function next(page:Page){const button=page.getByRole('button',{name:'다음으로',exact:true});await expect(button).toBeEnabled();await button.focus();await page.keyboard.press('Enter');await ready(page);}
async function restart(page:Page){await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();await page.getByRole('dialog',{name:'처음부터 읽을까요?',exact:true}).getByRole('button',{name:'처음부터 읽기',exact:true}).click();await ready(page);}
async function exported(page:Page,path:string){await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await menu(page);const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();await(await pending).saveAs(path);return JSON.parse(readFileSync(path,'utf8'));}

test('score definitions, choice effects and conditional routes are editable and survive official workbook and file reopening',async({page},info)=>{
 test.skip(info.project.name!=='host');await load(page);
 await expect(page.getByLabel('진행 방식',{exact:true})).toBeHidden();
 const before:StoryProject=(await exported(page,info.outputPath('score-before.knolstory'))).document.project;
 await flow(page);await page.locator('[class*="choiceCard"]').first().locator('summary').first().click();
 const effect=page.getByLabel('선택지 1 결과 1 값',{exact:true});await effect.fill('3');await effect.blur();
 await page.getByLabel('선택지 1 결과 1 방법',{exact:true}).selectOption('set');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.reload();await flow(page);await page.locator('[class*="choiceCard"]').first().locator('summary').first().click();await expect(effect).toHaveValue('3');
 await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption('score-join');await page.getByText('점수 조건에 따른 진행',{exact:true}).click();
 await expect(page.getByRole('button',{name:'조건 1 위로',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'조건 2 아래로',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'조건 1 아래로',exact:true}).click();
 const moved=await exported(page,info.outputPath('score-routes-moved.knolstory'));
 const originalFlow=before.lines.find(line=>line.id==='score-join')!.flow;
 expect(originalFlow?.type).toBe('goto');
 const originalRoutes=originalFlow?.type==='goto'?originalFlow.routes:undefined;expect(originalRoutes).toHaveLength(2);
 expect(moved.document.project.lines.find((line:StoryProject['lines'][number])=>line.id==='score-join').flow).toEqual({...originalFlow,routes:[originalRoutes![1],originalRoutes![0]]});
 await page.getByRole('button',{name:'조건 2 위로',exact:true}).click();
 await page.getByLabel('진행 1 조건 1 값',{exact:true}).fill('5');await page.getByLabel('진행 1 조건 1 값',{exact:true}).blur();
 for(const viewport of [{width:1280,height:900},{width:820,height:1180},{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(viewport);await expect(page.getByLabel('진행 1 조건 1 값',{exact:true})).toHaveValue('5');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(`score-routes-${viewport.width}.png`),fullPage:true});}
 const path=info.outputPath('score-edited.knolstory'),archive=await exported(page,path);expect(archive.document.schemaVersion).toBe(8);
 const expected:StoryProject={...before,updatedAt:archive.document.project.updatedAt,lines:before.lines.map(line=>{
  const value=line.flow;
  if(line.id==='score-first'&&value?.type==='choice')return {...line,flow:{...value,options:value.options.map((option,index)=>index?option:{...option,effects:option.effects!.map((item,i)=>i?item:{...item,operation:'set' as const,value:3})})}};
  if(line.id==='score-join'&&value?.type==='goto')return {...line,flow:{...value,routes:value.routes!.map((route,index)=>index?route:{...route,condition:{...route.condition,terms:route.condition.terms.map((term,i)=>i?term:{...term,value:5})}})}};
  return line;
 })};
 expect(archive.document.project).toEqual(expected);
 await menu(page);await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles(path);await confirmAuthoringImport(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const restored=await exported(page,info.outputPath('score-restored.knolstory'));expectIndependentImportedProject(restored.document.project,expected);
 await page.reload();expectIndependentImportedProject((await exported(page,info.outputPath('score-reopened.knolstory'))).document.project,expected);
 await menu(page);const transfer=page.getByText('Excel · Google 시트',{exact:true});if(!await transfer.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await transfer.click();
 const sheetDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Excel 내보내기',exact:true}).click();const sheet=info.outputPath('score-edited.xlsx');await(await sheetDownload).saveAs(sheet);
 await menu(page);await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles(sheet);await confirmAuthoringImport(page);
 expectIndependentImportedProject((await exported(page,info.outputPath('score-workbook-restored.knolstory'))).document.project,expected);
});
test('score route destinations distinguish repeated cut text in different chapters',async({page},info)=>{
 test.skip(info.project.name!=='host');await load(page);
 const archive=await exported(page,info.outputPath('target-labels-before.knolstory')),source=archive.document.project as StoryProject;
 const later={...source.chapters[0],id:'score-later-chapter',order:2,chapterNumber:2,title:'같은 말이 나오는 다른 장'},first=source.lines[0];
 const project={...source,id:'score-target-labels',chapters:[...source.chapters,later],lines:[...source.lines.map(line=>line.id===first.id?{...line,text:'같은 대사'}:line),{...first,id:'score-later-cut',chapterId:later.id,order:1,text:'같은 대사',flow:undefined,ending:undefined}]};
 await menu(page);await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'target-labels.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...archive,document:{...archive.document,project}}))});await confirmAuthoringImport(page);
 await page.setViewportSize({width:390,height:844});await flow(page);await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption('score-join');await page.getByText('점수 조건에 따른 진행',{exact:true}).click();
 const target=page.getByLabel('진행 1 도착 컷',{exact:true});await expect(target.locator('option[value="score-first"]')).toContainText('1장');await expect(target.locator('option[value="score-first"]')).toContainText('1컷');
 await expect(target.locator('option[value="score-later-cut"]')).toContainText('2장갈래 · 같은 말이 나오는 다른 장 · 1컷');
 await target.selectOption('score-later-cut');await expect(target).toHaveValue('score-later-cut');
 const result=(await exported(page,info.outputPath('target-labels-after.knolstory'))).document.project as StoryProject;
 expect(result.chapters).toEqual(project.chapters);expect(result.lines.find(line=>line.id==='score-join')?.flow).toEqual({...project.lines.find(line=>line.id==='score-join')!.flow,type:'goto',routes:(project.lines.find(line=>line.id==='score-join')!.flow as Extract<StoryProject['lines'][number]['flow'],{type:'goto'}>).routes!.map((route,index)=>index?route:{...route,targetLineId:'score-later-cut'})});
});
for(const sample of [{width:1280,file:'score-story.knolstory',trust:'4'},{width:390,file:'score-story.knolstory',trust:'4'},{width:1280,file:'score-excel-edited.xlsx',trust:'5'},{width:1280,file:'score-google-edited.xlsx',trust:'5'}])test(`native score choices accumulate through a shared scene, restore and reselect ${sample.width} ${sample.file}`,async({page},info)=>{
 test.skip(info.project.name!=='stories-runtime');test.setTimeout(240000);await page.setViewportSize({width:sample.width,height:900});await load(page,sample.file);await ready(page);await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await ready(page);
 await choose(page,'이웃을 돕는다');await choose(page,'음식을 나눈다');await expect(page.getByTestId('playback-status')).toHaveText('읽는 중');await expect(page.getByLabel('신뢰 현재 점수')).toHaveText(sample.trust);
 await page.reload();await ready(page);await expect(page.getByLabel('신뢰 현재 점수')).toHaveText(sample.trust);await next(page);await expect(page.locator('details').filter({has:page.getByText('대사·해설 텍스트 보기',{exact:true})})).toContainText('이웃들이 도우러 왔습니다.');
 await next(page);await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');await expect(page.getByRole('region',{name:'이야기 엔딩'})).toContainText('함께하는 결말');
 await restart(page);await choose(page,'그냥 지나간다');const semantic=page.locator('details').filter({has:page.getByText('대사·해설 텍스트 보기',{exact:true})});await expect(semantic.getByRole('button',{name:'음식을 나눈다',exact:true})).toHaveCount(0);await choose(page,'음식을 혼자 보관한다');await next(page);await next(page);await expect(page.getByRole('region',{name:'이야기 엔딩'})).toContainText('혼자 찾는 결말');
 await previousReadCut(page);await previousReadCut(page);await previousReadCut(page);await ready(page);await expect(page.getByLabel('욕심 현재 점수')).toHaveText('0');
 await previousReadCut(page);await ready(page);await choose(page,'이웃을 돕는다');await choose(page,'음식을 혼자 보관한다');await next(page);await next(page);await expect(page.getByRole('region',{name:'이야기 엔딩'})).toContainText('다시 만나는 결말');
 await page.screenshot({path:info.outputPath(`score-native-${sample.width}-${sample.file}.png`),fullPage:true});
});
test('invalid score references are rejected without replacing the current work and a valid file can be opened afterward',async({page},info)=>{
 test.skip(info.project.name!=='host');await load(page);
 const original=await exported(page,info.outputPath('before-invalid.knolstory'));
 const archive=JSON.parse(readFileSync('docs/architecture/evidence/score-narrative/score-story.knolstory','utf8'));
 const broken={...archive,document:{...archive.document,project:{...archive.document.project,lines:archive.document.project.lines.map((line:StoryProject['lines'][number],index:number)=>index||line.flow?.type!=='choice'?line:{...line,flow:{...line.flow,options:line.flow.options.map((option,i)=>i?option:{...option,effects:option.effects!.map((effect,j)=>j?effect:{...effect,scoreId:'missing-score'})})}})}}};
 await menu(page);await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'broken-score.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(broken))});
 await expect(page.getByRole('alert').filter({hasText:'현재 작품은 유지됩니다'})).toBeVisible();await expect(page.getByRole('dialog',{name:'작품 가져오기 확인'})).toHaveCount(0);
 expect((await exported(page,info.outputPath('protected.knolstory'))).document.project).toEqual(original.document.project);
 await page.reload();expect((await exported(page,info.outputPath('protected-reopened.knolstory'))).document.project).toEqual(original.document.project);
 await load(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
});


test('score-only initial values route without choices and preserve the whole work through native return',async({page},info)=>{
 test.skip(info.project.name!=='stories-runtime');
 test.setTimeout(180000);
 const archive=JSON.parse(readFileSync('docs/architecture/evidence/score-narrative/score-story.knolstory','utf8'));
 const source=archive.document.project as StoryProject;
 const join=source.lines.find(line=>line.id==='score-join')!;
 if(join.flow?.type!=='goto')throw Error('Expected scored goto fixture.');
 const project:StoryProject={...source,id:'score-only-native-fixture',title:'선택지 없이 점수로 만나는 길',scores:source.scores!.map(score=>score.id==='trust'?{...score,initial:4}:score),lines:[{...join,order:1,flow:{...join.flow,routes:join.flow.routes!.filter(route=>route.id==='friends')}},...source.lines.filter(line=>['score-together','score-alone'].includes(line.id)).map((line,index)=>({...line,order:index+2}))]};
 expect(project.lines.some(line=>line.flow?.type==='choice')).toBe(false);
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await menu(page);
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'score-only.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...archive,document:{...archive.document,project}}))});await confirmAuthoringImport(page);
 const imported=(await exported(page,info.outputPath('score-only-before.knolstory'))).document.project as StoryProject;
 expect(imported).toEqual(project);
 await page.reload();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await ready(page);
 await expect(page.getByLabel('신뢰 현재 점수',{exact:true})).toHaveText('4');
 await advanceReading(page);await ready(page);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe('score-together');
 await advanceReading(page);await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');
 await expect(page.getByRole('region',{name:'이야기 엔딩',exact:true})).toContainText('함께하는 결말');
 await editReadCut(page);
 expect((await exported(page,info.outputPath('score-only-after-first-route.knolstory'))).document.project).toEqual(imported);
 await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption('score-join');await menu(page);await page.getByRole('button',{name:'이야기 점수',exact:true}).click();
 const settings=page.getByRole('region',{name:'이야기 점수 설정',exact:true}),initial=settings.getByLabel('점수 1 시작 값',{exact:true});await initial.fill('0');await initial.blur();await expect(page.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');await page.getByRole('button',{name:'현재 컷으로 돌아가기',exact:true}).click();
 const changed=(await exported(page,info.outputPath('score-only-edited.knolstory'))).document.project as StoryProject;
 expect(changed).toEqual({...imported,updatedAt:changed.updatedAt,scores:imported.scores!.map(score=>score.id==='trust'?{...score,initial:0}:score)});
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await ready(page);
 await expect(page.getByLabel('신뢰 현재 점수',{exact:true})).toHaveText('0');await advanceReading(page);await ready(page);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe('score-alone');await advanceReading(page);await expect(page.getByRole('region',{name:'이야기 엔딩',exact:true})).toContainText('혼자 찾는 결말');
 await restartReading(page);await ready(page);await editReadCut(page);
 await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue('score-join');
 expect((await exported(page,info.outputPath('score-only-after-native.knolstory'))).document.project).toEqual(changed);
 await page.reload();expect((await exported(page,info.outputPath('score-only-reopened.knolstory'))).document.project).toEqual(changed);
 await page.screenshot({path:info.outputPath('score-only-return.png'),fullPage:true});
});
