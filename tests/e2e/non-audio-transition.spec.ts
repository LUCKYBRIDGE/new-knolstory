import {expect,test,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {parseAuthoringFile,confirmAuthoringImport} from './authoring-file';
const source=parseAuthoringFile(readFileSync('tests/fixtures/stories/presentation-polish.json','utf8'));
async function management(page:Page){
 const menu=page.locator('[data-work-menu]');
 if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope > summary').click();
}
async function direction(page:Page,kind:'look'|'transition'){
 await management(page);
 const settings=page.getByText('편집 설정',{exact:true});
 if(!await settings.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await settings.click();
 await page.getByRole('checkbox',{name:'연출 편집 사용',exact:true}).check();
 await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption({label:'연출 편집'});
 const row=page.getByTestId('editing-cut-flashback'),details=row.getByText(/^[0-9]+컷 연출 수정$/).locator('..');
 if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator(':scope>summary').click();
 await page.getByLabel('조정할 연출',{exact:true}).selectOption(kind);
}
test('author controls confirm transition and look intensity without changing manuscript or placement',async({page},info)=>{
 page.setDefaultTimeout(15000);await page.goto('/?view=editor'); await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await management(page);await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'direction.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:5,savedAt:'2026-10-10T00:00:00.000Z',appVersion:'test',project:source}))});await confirmAuthoringImport(page);
 await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption('flashback');await direction(page,'look');
 await page.getByLabel('분위기 강도',{exact:true}).selectOption('strong');
 await page.getByLabel('조정할 연출',{exact:true}).selectOption('transition');
 await page.getByLabel('화면 전환',{exact:true}).selectOption('perspective-blackout');
 await page.getByRole('dialog',{name:'시점 전환',exact:true}).getByRole('button',{name:'사용',exact:true}).click();
 await page.getByLabel('전환 진행 방식',{exact:true}).selectOption('confirm');
 await page.getByText('전환에 표시할 글',{exact:true}).click();
 await page.getByLabel('전환 제목',{exact:true}).fill('나무꾼의 시점에서 선녀의 마음을 다시 바라보는 아주 긴 장면 제목');
 await page.getByLabel('전환 설명',{exact:true}).fill('먼 숲 너머를 바라보던 선녀가 자신의 선택을 돌아봅니다.');
 await page.getByLabel('전환 확인 버튼 문구',{exact:true}).fill('선녀의 시점으로 이어서 읽기');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.reload();
 await direction(page,'transition');await page.getByText('전환에 표시할 글',{exact:true}).click();
 await expect(page.getByLabel('전환 제목',{exact:true})).toHaveValue('나무꾼의 시점에서 선녀의 마음을 다시 바라보는 아주 긴 장면 제목');
 const frame=page.getByTestId('story-runtime-frame');
 await frame.evaluate(node=>node.setAttribute('data-transition-instance','original'));
 await page.getByTestId('editing-cut-flashback').getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 const status=page.getByTestId('story-runtime-status');
 await expect(status).toContainText('연결됨',{timeout:120000});
 await expect.poll(async()=>{
  const rendered=await status.getAttribute('data-rendered-revision');
  return rendered!==null&&Number(rendered)>=0&&rendered===await status.getAttribute('data-scene-revision');
 },{timeout:120000}).toBe(true);
 await expect(status).toContainText('전환 화면에서 계속을 눌러 주세요');
 // The native confirm screen stays pending when the reader clicks outside its button.
 const bounds=(await frame.boundingBox())!;
 await page.mouse.click(bounds.x+bounds.width*.85,bounds.y+bounds.height*.25);
 await expect(status).toContainText('전환 화면에서 계속을 눌러 주세요');
 await page.getByTestId('story-stage-viewport').screenshot({path:info.outputPath('confirm-native.png')});
 const height=Number(await status.getAttribute('data-scene-height'));
 // The native presenter positions the confirm action 56 logical pixels above the bottom.
 await page.mouse.click(bounds.x+bounds.width*.5,bounds.y+bounds.height*(height-56)/height);
 await expect(status).not.toContainText('전환 화면에서 계속을 눌러 주세요',{timeout:15000});
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();
 await expect(page.getByRole('button',{name:'이 컷 편집하기',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
 await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue('flashback');
 await expect(frame).toHaveAttribute('data-transition-instance','original');
 await management(page);const download=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const path=info.outputPath('confirm.knolstory');await(await download).saveAs(path);
 const project=parseAuthoringFile(readFileSync(path,'utf8')).project;
 const authored=project.lines.find((l:{id:string})=>l.id==='flashback');expect(authored.presentation).toMatchObject({look:{type:'flashback',intensity:'strong'},transition:{type:'perspective-blackout',mode:'confirm',actionLabel:'선녀의 시점으로 이어서 읽기'}});
 expect(project.lines.map((l:{text:string;stageComposition:unknown})=>[l.text,l.stageComposition])).toEqual(source.lines.map((l:{text:string;stageComposition:unknown})=>[l.text,l.stageComposition]));
 const originalPresentation=source.lines.find((line:{id:string})=>line.id==='flashback').presentation;
 expect({...project,id:source.id,updatedAt:source.updatedAt,lines:project.lines.map((line:{id:string;presentation?:unknown})=>line.id==='flashback'?{...line,presentation:originalPresentation}:line)}).toEqual(source);
 await page.getByLabel('작품 파일 가져오기').setInputFiles(path);await confirmAuthoringImport(page);await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption('flashback');await direction(page,'look');await expect(page.getByLabel('분위기 강도',{exact:true})).toHaveValue('strong');
});
