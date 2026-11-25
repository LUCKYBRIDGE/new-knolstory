import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {confirmAuthoringImport} from './authoring-file';
import {suppressFullscreenOffer} from './mobile-fullscreen-offer';
import {openConnections} from './story-connections-panel';

// 1장 1·2컷(갈림길: 강/숲) → 2장A 1~2컷 → 3장 1컷 · 2장B 1컷(용기 2점 이상이면 4장A, 아니면 3장)
// 3장 1컷: 여러 길이 만나는 갈림길(돕는다 → 4장A 끝 / 떠난다 → 4장B 끝 / 되돌아간다 · 용기 1점 이상일 때만 · 도착 미지정)
const source=JSON.parse(readFileSync('tests/fixtures/stories/seonnyeo.json','utf8'));
const baseChapter=source.chapters[0],baseLine=source.lines[0];
const cond=(value:number)=>({mode:'all',terms:[{scoreId:'courage',operator:'gte',value}]});
const chapter=(id:string,order:number,title:string,chapterNumber:number,branchLabel?:string)=>({...baseChapter,id,order,title,chapterNumber,...(branchLabel?{branchLabel}:{branchLabel:undefined})});
const line=(id:string,chapterId:string,order:number,text:string,extra:Record<string,unknown>={})=>({...baseLine,id,chapterId,order,text,flow:undefined,ending:undefined,...extra});
const ending=(name:string)=>({ending:{endsStory:true,name,description:''}});
const sample={...source,id:'connections-sample',title:'갈림길 예시',scores:[{id:'courage',name:'용기',description:'',initial:0}],
 chapters:[chapter('ch1',1,'계곡의 갈림길',1),chapter('ch2',2,'강을 따라',2,'A'),chapter('ch3',3,'숲속 오솔길',2,'B'),chapter('ch4',4,'다시 만난 바위',3),chapter('ch5',5,'함께 하늘로',4,'A'),chapter('ch6',6,'홀로 남은 길',4,'B')],
 lines:[
  line('c1','ch1',1,'깊은 산속 계곡, 나무꾼이 길 앞에 섰다.'),
  line('c2','ch1',2,'왼쪽에서는 물소리가, 오른쪽에서는 새소리가 들렸다.',{flow:{type:'choice',options:[{id:'o-river',label:'강 쪽으로 간다',targetLineId:'c3'},{id:'o-forest',label:'숲으로 들어간다',targetLineId:'c5',effects:[{scoreId:'courage',operation:'add',value:2}]}]}}),
  line('c3','ch2',1,'강물 위로 날개옷 한 자락이 떠내려왔다.'),
  line('c4','ch2',2,'나무꾼은 날개옷을 품에 안고 바위로 향했다.',{flow:{type:'goto',targetLineId:'c6'}}),
  line('c5','ch3',1,'숲 그늘에서 사슴이 길을 알려 주었다.',{flow:{type:'goto',targetLineId:'c6',routes:[{id:'r-brave',condition:cond(2),targetLineId:'c7'}]}}),
  line('c6','ch4',1,'두 길은 커다란 바위 앞에서 다시 만났다.',{flow:{type:'choice',options:[{id:'o-help',label:'선녀를 돕는다',targetLineId:'c7'},{id:'o-alone',label:'혼자 떠난다',targetLineId:'c8'},{id:'o-back',label:'되돌아간다',targetLineId:'',condition:cond(1)}]}}),
  line('c7','ch5',1,'선녀와 나무꾼은 함께 하늘로 올라갔다.',ending('하늘')),
  line('c8','ch6',1,'나무꾼은 홀로 산을 내려왔다.',ending('산')),
 ]};
const stored=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project.lines as {id:string;text:string;flow?:unknown}[]);
async function importWork(page:Page,project:unknown){
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨',{timeout:30_000});
 const menu=page.locator('[data-work-menu]');await menu.locator(':scope>summary').click();
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'connections.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-25T00:00:00.000Z',appVersion:'test',project}))});
 await confirmAuthoringImport(page);if(await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨',{timeout:30_000});
}
test.beforeEach(async({page})=>{await suppressFullscreenOffer(page);});

for(const size of [{width:1440,height:900},{width:768,height:1024},{width:390,height:844}])test(`이야기 연결 stays open while the author moves along the ways and writes · ${size.width}`,async({page},info)=>{
 test.skip(info.project.name!=='host');test.setTimeout(180_000);
 await page.setViewportSize(size);await importWork(page,sample);
 const position=page.getByLabel('현재 장과 컷 이동',{exact:true}),text=page.locator('[data-current-cut] textarea').first();
 await position.selectOption('c3');const before=await stored(page);
 const panel=await openConnections(page);
 // 앞 갈림길 → 지금 → 다음, read from the choice words alone.
 await expect(panel).toContainText('1장 2컷 갈림길');await expect(panel).toContainText('‘강 쪽으로 간다’ 고르면');await expect(panel).toContainText('지금 · 2장A 1컷');
 // Writing keeps its room: the text box stays usable beside or above the open panel, and nothing scrolls sideways.
 const box=(await text.boundingBox())!;expect(box.height).toBeGreaterThanOrEqual(80);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath(`connections-${size.width}.png`)});
 // Following the ways moves the writing; the panel stays open and reads from each new cut.
 await panel.getByRole('button',{name:/^다음 →/}).click();await expect(position).toHaveValue('c4');await expect(text).toBeFocused();
 await text.fill('나무꾼은 날개옷을 품에 안고 바위로 향했다. 발걸음이 빨라졌다.');
 await panel.getByRole('button',{name:/^다음 →/}).click();await expect(position).toHaveValue('c6');
 await expect(panel).toHaveAttribute('data-story-connections','open');
 await expect(panel).toContainText('2갈래가 만나는 곳');await expect(panel).toContainText('A. ‘선녀를 돕는다’ →');await expect(panel).toContainText('4장A 1컷');await expect(panel).toContainText('이야기 끝');
 // A choice with a condition and no target yet is shown as it is; no rule editor is on, so no repair button.
 await expect(panel).toContainText('C. ‘되돌아간다’ · 용기 1점 이상일 때만 · 도착 컷을 정해 주세요');await expect(panel.getByRole('button',{name:/연결 정하기$/})).toHaveCount(0);
 await panel.locator('summary').filter({hasText:'다른 길 더 보기'}).click();await expect(panel).toContainText('← 조건이 맞지 않으면');
 await page.screenshot({path:info.outputPath(`connections-join-${size.width}.png`)});
 // Back to where the author just was, with the edit kept.
 await panel.getByRole('button',{name:/^방금 보던 컷으로 돌아가기 · 2장A 2컷/}).click();await expect(position).toHaveValue('c4');await expect(text).toHaveValue('나무꾼은 날개옷을 품에 안고 바위로 향했다. 발걸음이 빨라졌다.');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 // Only the typed text changed: reading and moving never touch links, conditions or other cuts.
 const after=await stored(page);expect(after.map(cut=>cut.id==='c4'?{...cut,text:before.find(item=>item.id==='c4')!.text}:cut)).toEqual(before);
 // The open state belongs to the work's editor settings, so it survives a reload.
 await page.reload();await expect(page.locator('[data-story-connections]')).toHaveAttribute('data-story-connections','open');
});

test('흐름 지도 reads the structure first, keeps its place and shows which way a search hit is on',async({page},info)=>{
 test.skip(info.project.name!=='host');test.setTimeout(180_000);
 await page.setViewportSize({width:390,height:844});await importWork(page,sample);
 const position=page.getByLabel('현재 장과 컷 이동',{exact:true});await position.selectOption('c4');const before=await stored(page);
 const panel=await openConnections(page);await panel.getByRole('button',{name:'이야기 지도 열기',exact:true}).click();
 const map=page.getByRole('dialog',{name:'이야기 흐름 지도',exact:true});const structure=map.getByTestId('story-structure');await expect(structure).toBeVisible();
 // 1장 2컷 갈림길 → 강 쪽으로 · 2장A 1~2컷 → 3장 1컷에서 다시 만나요 / 숲으로 → 2장B 1컷의 조건 갈림길, readable without sideways scrolling.
 const fork=map.locator('[id="structure-c2"]');await expect(fork).toContainText('A. ‘강 쪽으로 간다’');await expect(fork).toContainText('2장A 1~2컷 · 2컷 · 현재 편집');await expect(fork).toContainText('● 3장 1컷에서 다시 만나요');await expect(fork).toContainText('B. ‘숲으로 들어간다’');
 await expect(map.locator('[id="structure-c5"]')).toContainText('용기 2점 이상일 때');await expect(map.locator('[id="structure-c6"]')).toContainText('도착 컷을 정해 주세요 · 이 컷에서 수정');
 expect(await map.evaluate(node=>{const body=node.querySelector('[class*=body]')!;return body.scrollWidth<=body.clientWidth;})).toBe(true);
 await map.getByRole('button',{name:'현재 컷으로',exact:true}).click();await expect(map.locator('[data-structure-cut="c4"]')).toBeInViewport();
 const place=await map.evaluate(node=>node.querySelector('[class*=body]')!.scrollTop);expect(place).toBeGreaterThan(0);
 await page.screenshot({path:info.outputPath('structure-390.png')});
 // Choosing a cut edits it; reopening returns to the same place on the map.
 await map.locator('[data-structure-cut="c3"]').click();await expect(map).toHaveCount(0);await expect(position).toHaveValue('c3');
 await panel.getByRole('button',{name:'이야기 지도 열기',exact:true}).click();await expect(map).toBeVisible();
 await expect.poll(()=>map.evaluate(node=>node.querySelector('[class*=body]')!.scrollTop)).toBe(place);
 // Searching keeps the structure and tells which way each hit is on.
 await map.getByLabel('흐름 검색').fill('날개옷');const found=map.getByRole('region',{name:'검색 결과'});
 await expect(found).toContainText('◆ 1장 2컷에서 A. ‘강 쪽으로 간다’ 길 · 1번째 컷');await expect(structure).toBeVisible();
 await page.keyboard.press('Escape');expect(await stored(page)).toEqual(before);
});

test('긴 작품: the map folds by chapter and finds the current cut and a search hit on its way',async({page},info)=>{
 test.skip(info.project.name!=='host');test.setTimeout(240_000);
 await page.setViewportSize({width:390,height:844});await importWork(page,{...source,id:'connections-long'});
 const position=page.getByLabel('현재 장과 컷 이동',{exact:true});await position.selectOption('C3-B-v74-3');
 const panel=await openConnections(page);await expect(panel).toContainText('갈림길');
 await panel.getByRole('button',{name:'이야기 지도 열기',exact:true}).click();const map=page.getByRole('dialog',{name:'이야기 흐름 지도',exact:true});
 const chapters=map.getByTestId('story-structure').locator(':scope>details');expect(await chapters.count()).toBeGreaterThan(5);
 await map.getByRole('button',{name:'현재 컷으로',exact:true}).click();const current=map.locator('[data-structure-cut="C3-B-v74-3"]');await expect(current).toBeInViewport();await expect(current).toHaveAttribute('aria-current','true');
 // A long way shows the cuts around the current one, not hundreds at once.
 expect(await map.locator('[data-structure-cut]:visible').count()).toBeLessThan(20);
 await map.getByLabel('흐름 검색').fill('겁이 나오');await expect(map.getByRole('region',{name:'검색 결과'})).toContainText('길 · ');
 await page.screenshot({path:info.outputPath('structure-long-390.png')});
});

// Ways that never meet again: 1장 갈림길 → 하늘(A: 하늘 궁전 → 시험 갈림길 → 통과/실패) / 땅(B: 산골 마을 갈림길 → 새 짝/홀로)
const lasting={...source,id:'connections-lasting',title:'갈라진 채 가는 이야기',scores:[],
 chapters:[chapter('l1',1,'갈림길',1),chapter('l2',2,'하늘로 간 선녀',2),chapter('l3',3,'땅에 남은 나무꾼',3),chapter('l4',4,'하늘 궁전',4),chapter('l5',5,'산골 마을',5),chapter('l6',6,'옥황상제의 시험',6),chapter('l7',7,'새 짝',7),chapter('l8',8,'홀로 늙다',8),chapter('l9',9,'시험 통과',9),chapter('l10',10,'시험 실패',10)],
 lines:[
  line('f1','l1',1,'선녀가 날개옷을 찾았다.',{flow:{type:'choice',options:[{id:'sky',label:'하늘로 돌아간다',targetLineId:'s1'},{id:'land',label:'땅에 남는다',targetLineId:'e1'}]}}),
  line('s1','l2',1,'선녀는 아이들과 하늘로 올랐다.',{flow:{type:'goto',targetLineId:'s2'}}),
  line('s2','l4',1,'하늘 궁전은 낯설었다.',{flow:{type:'goto',targetLineId:'s3'}}),
  line('s3','l6',1,'나무꾼이 하늘에 왔다. 시험이 시작됐다.',{flow:{type:'choice',options:[{id:'try',label:'시험을 치른다',targetLineId:'s4'},{id:'quit',label:'포기한다',targetLineId:'s5'}]}}),
  line('s4','l9',1,'나무꾼은 시험을 통과했다.',ending('통과')),
  line('s5','l10',1,'나무꾼은 다시 땅으로 떨어졌다.',ending('실패')),
  line('e1','l3',1,'선녀는 날개옷을 태웠다.',{flow:{type:'goto',targetLineId:'e2'}}),
  line('e2','l5',1,'마을 사람들이 선녀를 반겼다.',{flow:{type:'choice',options:[{id:'partner',label:'새 짝을 만난다',targetLineId:'e3'},{id:'alone',label:'홀로 지낸다',targetLineId:'e4'}]}}),
  line('e3','l7',1,'선녀는 새 짝과 살았다.',ending('새 짝')),
  line('e4','l8',1,'선녀는 홀로 늙었다.',ending('홀로')),
 ]};
const pickerGroups=(page:Page)=>page.getByLabel('현재 장과 컷 이동',{exact:true}).locator('optgroup').evaluateAll(nodes=>nodes.map(node=>(node as HTMLOptGroupElement).label));
test('갈라진 채 이어지는 줄거리: each storyline reads on its own in the list, the map and the panel, and 장 정리 names them by the choices',async({page},info)=>{
 test.skip(info.project.name!=='host');test.setTimeout(180_000);
 await page.setViewportSize({width:390,height:844});await importWork(page,lasting);
 // The chapter list follows one storyline to its endings before the other, whatever the stored order.
 expect(await pickerGroups(page)).toEqual(['1장 · 갈림길','2장 · 하늘로 간 선녀','4장 · 하늘 궁전','6장 · 옥황상제의 시험','9장 · 시험 통과','10장 · 시험 실패','3장 · 땅에 남은 나무꾼','5장 · 산골 마을','7장 · 새 짝','8장 · 홀로 늙다']);
 const position=page.getByLabel('현재 장과 컷 이동',{exact:true});await position.selectOption('s3');const before=await stored(page);
 const panel=await openConnections(page);await expect(panel).toContainText('갈래 A · 갈림길');await expect(panel).toContainText('‘하늘로 돌아간다’ 고르면');
 await position.selectOption('e2');await expect(panel).toContainText('갈래 B · 갈림길');
 // The map groups blocks by storyline, each with its own branch points and endings.
 await panel.getByRole('button',{name:'이야기 지도 열기',exact:true}).click();const map=page.getByRole('dialog',{name:'이야기 흐름 지도',exact:true});
 await expect(map.locator('[data-storyline=""]>summary')).toContainText('공통 줄기');
 await expect(map.locator('[data-storyline="A"]>summary')).toContainText('갈래 A');await expect(map.locator('[data-storyline="A"]>summary')).toContainText('끝 2');
 await expect(map.locator('[data-storyline="B"]>summary')).toContainText('갈래 B');await expect(map.locator('[data-storyline="B"]>summary')).toContainText('끝 2');
 await expect(map.locator('[data-storyline="B"]>summary')).toContainText('현재 편집');
 await page.screenshot({path:info.outputPath('lasting-structure-390.png')});
 // 장 정리 names each storyline by its choices and keeps every link.
 await map.getByRole('button',{name:'장 지도',exact:true}).click();await map.getByLabel('장 번호와 갈래 글자도 다시 매기기').check();await map.getByRole('button',{name:'읽는 순서로 장 정리',exact:true}).click();
 await expect(map.locator('[data-chapter-arrange="done"]')).toBeVisible();await page.keyboard.press('Escape');
 expect(await pickerGroups(page)).toEqual(['1장 · 갈림길','2장A · 하늘로 간 선녀','3장A · 하늘 궁전','4장A · 옥황상제의 시험','5장AA · 시험 통과','5장AB · 시험 실패','2장B · 땅에 남은 나무꾼','3장B · 산골 마을','4장BA · 새 짝','4장BB · 홀로 늙다']);
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const after=await stored(page);expect(after.map(cut=>[cut.id,cut.text,cut.flow])).toEqual(expect.arrayContaining(before.map(cut=>[cut.id,cut.text,cut.flow])));expect(after).toHaveLength(before.length);
});
