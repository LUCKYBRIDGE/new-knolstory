import {test,expect} from '@playwright/test';
for(const size of [{width:1280,height:900},{width:820,height:1180},{width:390,height:844}]){
 test(`approved editor retains text and one additional tool ${size.width}`,async({page})=>{
  await page.setViewportSize(size);await page.goto('/?view=editor');
  const text=page.getByLabel('대사 / 해설',{exact:true});
  await expect(text).toBeVisible();
  await expect(page.getByLabel('현재 장과 컷 이동')).toBeVisible();
  await expect(page.getByLabel('진행 방식')).toBeHidden();
  await page.locator('[data-additional-tools]>summary').click();await page.getByRole('button',{name:'선택지 편집',exact:true}).click();
  await expect(page.getByLabel('진행 방식')).toBeVisible();
  await expect(text).toBeVisible();
  await page.locator('[data-additional-tools]>summary').click();await page.getByRole('button',{name:'연출 편집',exact:true}).click();
  await expect(page.getByLabel('진행 방식')).toBeHidden();
  await expect(page.locator('[data-inspector-section="presentation"]:visible')).toHaveCount(1);
  await page.locator('[data-additional-tools]>summary').click();await page.getByRole('button',{name:'소리 편집',exact:true}).click();
  await expect(page.locator('[data-inspector-section="presentation"]:visible')).toHaveCount(0);
  await expect(page.locator('[data-inspector-section="sound"]:visible')).toHaveCount(1);
  await page.getByRole('button',{name:'글쓰기 화면으로 돌아가기',exact:true}).click();
  await expect(text).toBeVisible();
  await expect(page.locator('[data-inspector-section="sound"]:visible')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
test('manuscript navigation protects IME and failed storage',async({page})=>{
 await page.goto('/?view=editor');const text=page.getByLabel('대사 / 해설',{exact:true});await expect(text).toBeVisible();
 const position=page.getByLabel('현재 장과 컷 이동');const before=await position.inputValue();
 await text.dispatchEvent('compositionstart');await expect(position).toBeDisabled();await text.dispatchEvent('compositionend');
 const next=await position.locator('option').evaluateAll(options=>options.map(option=>(option as HTMLOptionElement).value).find(id=>id!== (document.querySelector('[aria-label="현재 장과 컷 이동"]') as HTMLSelectElement).value)!);
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('test quota','QuotaExceededError');};});
 await position.selectOption(next);await expect(position).toHaveValue(before);
 await expect(page.getByTestId('workspace-error')).toContainText('이동을 멈췄어요');
});

for(const hasChoices of [false,true])for(const hasScores of [false,true])test(`choice and project scores stay independent with choices=${hasChoices}, scores=${hasScores}`,async({page},info)=>{
 page.setDefaultTimeout(15000);
 const {readFileSync}=await import('node:fs');const {confirmAuthoringImport,parseAuthoringFile}=await import('./authoring-file');
 const source=JSON.parse(readFileSync('tests/fixtures/stories/seonnyeo.json','utf8'));
 const management=page.locator('[data-work-menu]>summary');
 const openManagement=async()=>{if(!await management.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await management.click();};
 const choices=async()=>{const tools=page.locator('[data-additional-tools]');if(!await tools.evaluate(node=>(node as HTMLDetailsElement).open))await tools.locator(':scope > summary').click();await page.getByRole('button',{name:'선택지 편집',exact:true}).click();};
 const rendered=async()=>{const status=page.getByTestId('story-runtime-status');await expect.poll(async()=>{const revision=await status.getAttribute('data-rendered-revision');return revision!==null&&Number(revision)>=0&&revision===await status.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);};
 await page.goto('/?view=editor');
  const target=source.lines[1].id;
  const project={...source,id:`approved-combo-${hasChoices}-${hasScores}`,scores:hasScores?[{id:'trust',name:'신뢰',description:'선택의 기억',initial:2}]:undefined,lines:source.lines.map((line:{id:string},index:number)=>index===0?{...line,ending:undefined,flow:hasChoices?{type:'choice',options:[{id:'one',label:'함께 간다',targetLineId:target},{id:'two',label:'잠시 기다린다',targetLineId:target}]}:undefined}:line)};
  await openManagement();
  await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'combination.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:6,savedAt:'2026-10-11T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);
  await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(project.lines[0].id);await choices();
  await expect(page.getByLabel('진행 방식',{exact:true})).toHaveValue(hasChoices?'choice':'linear');
  if(hasChoices){await expect(page.getByLabel('선택지 1 문구')).toHaveValue('함께 간다');await expect(page.getByLabel('선택지 1 결과 1 값')).toHaveCount(0);}else await expect(page.getByLabel('선택지 1 문구')).toHaveCount(0);
  if(hasChoices)await expect(page.locator('summary').filter({hasText:/^선택 결과·표시 조건/})).toHaveCount(hasScores?2:0);
  if(hasChoices||hasScores)await page.getByRole('button',{name:'이야기 점수 설정 열기',exact:true}).click();else{await expect(page.getByRole('button',{name:'이야기 점수 설정 열기',exact:true})).toHaveCount(0);await openManagement();await page.getByRole('button',{name:'이야기 점수',exact:true}).click();}
  const settings=page.getByRole('region',{name:'작품 설정',exact:true});await expect(settings).toBeVisible();
  if(hasScores)await expect(settings.getByLabel('점수 1 이름',{exact:true})).toHaveValue('신뢰');else await expect(settings.getByLabel('점수 1 이름',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'현재 컷으로 돌아가기',exact:true}).click();
  await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue(project.lines[0].id);
  await expect(page.getByLabel('진행 방식',{exact:true})).toHaveValue(hasChoices?'choice':'linear');
  if(hasChoices){for(const width of [1280,390]){await page.setViewportSize({width,height:900});await rendered();await page.screenshot({path:info.outputPath(`choice-score-${hasScores}-${width}.png`),fullPage:true});}}
  if(!hasChoices){await page.getByLabel('진행 방식',{exact:true}).selectOption('goto');await expect(page.locator('summary').filter({hasText:/^점수 조건에 따른 진행$/})).toHaveCount(hasScores?1:0);await page.getByLabel('진행 방식',{exact:true}).selectOption('linear');}
  await expect(page.getByLabel('대사 / 해설',{exact:true})).toHaveValue(project.lines[0].text);
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  await openManagement();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const path=(await(await pending).path())!;
  const saved=parseAuthoringFile(readFileSync(path,'utf8')).project;
  const expected=JSON.parse(JSON.stringify(project));
  expect({...saved,id:expected.id,updatedAt:expected.updatedAt}).toEqual(expected);
  expect(saved.scores??[]).toHaveLength(hasScores?1:0);
  if(hasChoices)expect(saved.lines[0].flow.options.every((option:{effects?:unknown;condition?:unknown})=>option.effects===undefined&&option.condition===undefined)).toBe(true);
  await page.getByLabel('작품 파일 가져오기').setInputFiles(path);await confirmAuthoringImport(page);await page.reload();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(project.lines[0].id);await choices();
  await expect(page.getByLabel('진행 방식',{exact:true})).toHaveValue(hasChoices?'choice':'linear');
  await expect(page.getByLabel('대사 / 해설',{exact:true})).toHaveValue(project.lines[0].text);
  const frame=page.getByTestId('story-runtime-frame');await frame.evaluate(node=>node.setAttribute('data-combination-instance','original'));
  await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await rendered();
  await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
  await expect(frame).toHaveAttribute('data-combination-instance','original');await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue(project.lines[0].id);await expect(page.getByLabel('대사 / 해설',{exact:true})).toHaveValue(project.lines[0].text);
});

test('measured keyboard occlusion reduces editor projection without changing logical scene or iframe',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{
  const viewport=new EventTarget();Object.assign(viewport,{height:844,width:390,offsetTop:0,scale:1});
  Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
 });
 await page.goto('/?view=editor');const text=page.getByLabel('대사 / 해설',{exact:true});await expect(text).toBeVisible();
 const status=page.getByTestId('story-runtime-status'),frame=await page.getByTestId('story-runtime-frame').elementHandle();
 await expect.poll(async()=>Number(await status.getAttribute('data-rendered-revision'))>=0&&(await status.getAttribute('data-rendered-revision'))===(await status.getAttribute('data-scene-revision')),{timeout:120000}).toBe(true);
 const logical=[await status.getAttribute('data-scene-width'),await status.getAttribute('data-scene-height')];
 await text.focus();await page.evaluate(()=>{Object.assign(window.visualViewport!,{height:420});window.visualViewport!.dispatchEvent(new Event('resize'));});
 await expect(page.locator('main[data-keyboard-occluded="true"]')).toBeVisible();
 await expect.poll(async()=>Math.round((await page.getByTestId('story-stage-viewport').boundingBox())!.height)).toBe(96);
 expect([await status.getAttribute('data-scene-width'),await status.getAttribute('data-scene-height')]).toEqual(logical);
 expect(await frame!.evaluate(node=>node===document.querySelector('[data-testid="story-runtime-frame"]'))).toBe(true);
 await text.fill('삼성 키보드 가림 환경에서도 현재 글을 수정합니다.');
 await page.evaluate(()=>{Object.assign(window.visualViewport!,{height:844});window.visualViewport!.dispatchEvent(new Event('resize'));});
 await expect(page.locator('main[data-keyboard-occluded="false"]')).toBeVisible();await expect(text).toHaveValue('삼성 키보드 가림 환경에서도 현재 글을 수정합니다.');
});

test('adding a score makes optional choice controls available and persists authored effects',async({page})=>{
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.locator('[data-additional-tools]>summary').click();await page.getByRole('button',{name:'선택지 편집',exact:true}).click();await page.getByLabel('진행 방식',{exact:true}).selectOption('choice');
 const options=page.locator('summary').filter({hasText:/^선택 결과·표시 조건/});await expect(options).toHaveCount(0);await page.getByRole('button',{name:'이야기 점수 설정 열기',exact:true}).click();await page.getByLabel('새 점수 이름',{exact:true}).fill('나눔');await page.getByRole('button',{name:'점수 만들기',exact:true}).click();await page.getByRole('button',{name:'현재 컷으로 돌아가기',exact:true}).click();await expect(options).toHaveCount(2);await options.first().click();const score=page.getByRole('region',{name:'선택지 1 점수 변화·표시 조건',exact:true});await score.getByRole('button',{name:'점수 변화 추가',exact:true}).click();await page.getByLabel('선택지 1 결과 1 값',{exact:true}).fill('3');await page.getByLabel('선택지 1 결과 1 값',{exact:true}).blur();await page.getByLabel('선택지 1 문구',{exact:true}).fill('친구와 나눈다');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const id=await page.getByLabel('현재 장과 컷 이동').inputValue();await page.locator('[data-work-menu]>summary').click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const file=await pending;const {readFileSync}=await import('node:fs');const {parseAuthoringFile}=await import('./authoring-file');const saved=parseAuthoringFile(readFileSync((await file.path())!,'utf8'));const line=saved.project.lines.find((cut:{id:string})=>cut.id===id);expect(line.flow.options[0]).toMatchObject({label:'친구와 나눈다',effects:[{operation:'add',value:3,scoreId:saved.project.scores[0].id}]});expect(line.flow.options[1].effects).toBeUndefined();await page.reload();await page.locator('[data-additional-tools]>summary').click();await page.getByRole('button',{name:'선택지 편집',exact:true}).click();await options.first().click();await expect(page.getByLabel('선택지 1 결과 1 값',{exact:true})).toHaveValue('3');await expect(page.getByLabel('대사 / 해설',{exact:true})).toBeVisible();
});

for(const size of [{width:1440,height:900},{width:768,height:1024},{width:390,height:844},{width:844,height:390}])test(`tool navigation protects Korean composition and has one text return ${size.width}`,async({page},info)=>{
 await page.setViewportSize(size);await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const text=page.getByLabel('대사 / 해설',{exact:true}),tools=page.getByRole('navigation',{name:'편집 도구',exact:true});
 await text.fill('한글을 조합하며 도구를 바꾸어도 원고를 잃지 않는다.');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 await tools.locator('[data-additional-tools]>summary').click();await text.dispatchEvent('compositionstart');
 await expect(tools.getByRole('button',{name:'배경·인물 편집',exact:true})).toBeDisabled();
 for(const name of ['글 편집','선택지 편집','연출 편집','컷 목록','소리 편집'])await expect(tools.getByRole('button',{name,exact:true,includeHidden:true})).toBeDisabled();
 await expect(text).toBeVisible();await expect(tools.getByRole('button',{name:'글 편집',exact:true})).toHaveAttribute('aria-pressed','true');await tools.locator('[data-additional-tools]>summary').press('Escape');await tools.locator('[data-additional-tools]>summary').click();await expect(tools.locator('[data-additional-tools]')).not.toHaveAttribute('open','');await text.dispatchEvent('compositionend');
 await tools.locator('[data-additional-tools]>summary').click();await tools.getByRole('button',{name:'컷 목록',exact:true}).click();await expect(tools.getByRole('button',{name:'글로 돌아가기',exact:true})).toHaveCount(0);
 await tools.getByRole('button',{name:'글 편집',exact:true}).click();await expect(text).toBeVisible();
 await tools.locator('[data-additional-tools]>summary').click();await tools.getByRole('button',{name:'소리 편집',exact:true}).click();
 await text.dispatchEvent('compositionstart');await expect(page.getByRole('button',{name:'글쓰기 화면으로 돌아가기',exact:true})).toBeDisabled();await text.dispatchEvent('compositionend');
 await page.getByRole('button',{name:'글쓰기 화면으로 돌아가기',exact:true}).click();await expect(text).toHaveValue('한글을 조합하며 도구를 바꾸어도 원고를 잃지 않는다.');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(before);
 await expect.poll(async()=>{const state=page.getByTestId('story-runtime-status');const rendered=await state.getAttribute('data-rendered-revision');return Number(rendered)>=0&&rendered===await state.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`tool-navigation-${size.width}.png`),fullPage:true});
 await page.reload();await expect(text).toHaveValue('한글을 조합하며 도구를 바꾸어도 원고를 잃지 않는다.');
});

test('tool navigation tracks composition in choice labels',async({page})=>{
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const tools=page.getByRole('navigation',{name:'편집 도구',exact:true});
 await tools.locator('[data-additional-tools]>summary').click();await tools.getByRole('button',{name:'선택지 편집',exact:true}).click();await page.getByLabel('진행 방식',{exact:true}).selectOption('choice');
 const label=page.getByLabel('선택지 1 문구',{exact:true});await label.fill('친구와 함께 돌아간다');await label.dispatchEvent('compositionstart');
 await expect(tools.getByRole('button',{name:'글 편집',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'글쓰기 화면으로 돌아가기',exact:true})).toBeDisabled();
 await expect(label).toBeVisible();await label.dispatchEvent('compositionend');await tools.getByRole('button',{name:'글 편집',exact:true}).click();
 await tools.locator('[data-additional-tools]>summary').click();await tools.getByRole('button',{name:'선택지 편집',exact:true}).click();await expect(label).toHaveValue('친구와 함께 돌아간다');
});

test('internal direction jump respects composition and opens placement when input finishes',async({page})=>{
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.locator('[data-additional-tools]>summary').click();await page.getByRole('button',{name:'연출 편집',exact:true}).click();
 const text=page.getByLabel('대사 / 해설',{exact:true}),kind=page.getByLabel('조정할 연출',{exact:true});await text.dispatchEvent('compositionstart');await kind.selectOption('motion');
 await expect(page.locator('[data-inspector-section="presentation"]:visible')).toHaveCount(1);await expect(page.locator('[data-inspector-section="assets"]:visible')).toHaveCount(0);await expect(page.getByTestId('workspace-error')).toContainText('한글 입력을 마친 뒤 편집 도구');
 await text.dispatchEvent('compositionend');await kind.selectOption('motion');await expect(page.locator('[data-inspector-section="assets"]:visible')).toHaveCount(1);await expect(page.locator('[data-placement-details]')).toHaveAttribute('open','');await expect(page.getByTestId('workspace-error')).toHaveCount(0);
});
