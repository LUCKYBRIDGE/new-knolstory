import {parseAuthoringFile,confirmAuthoringImport} from './authoring-file';
import { test, expect,type Page } from '@playwright/test';
import { createStoryBranches, createStoryDocument } from '../../packages/story-domain/src/index';
import { createBlankStoryProject, insertStoryCut } from '../../packages/runtime-core/src/authoring';
import { readFileSync } from 'node:fs';
async function openExchange(page:Page){const exchange=page.locator('[data-file-exchange]');if(!await exchange.evaluate(node=>(node as HTMLDetailsElement).open))await exchange.locator(':scope>summary').click();}

async function chapterNumbers(page:Page){const menu=page.locator('[data-work-menu]');if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();const settings=page.locator('[data-chapter-settings]');if(!await settings.evaluate(node=>(node as HTMLDetailsElement).open))await settings.locator(':scope>summary').click();const detail=settings.locator('details').filter({has:page.locator('summary',{hasText:'장 번호·갈래 표시'})});if(!await detail.evaluate(node=>(node as HTMLDetailsElement).open))await detail.locator(':scope>summary').click();return {number:detail.getByRole('spinbutton',{name:'장 번호',exact:true}),branch:detail.getByRole('textbox',{name:'장 갈래 표시',exact:true})};}
// Cuts across chapters and branches are listed in the current-cut mover; branch letters stay in each option label.
async function cuts(page:Page){return page.getByLabel('현재 장과 컷 이동',{exact:true});}

test('chapter identity and extended branch cuts survive editor, file export and reload',async({page})=>{
 let count=0;
 let project=createBlankStoryProject({id:'identity-e2e',chapterId:'intro',lineId:'start',title:'장과 갈래 구분'});
 project={...project,chapters:[{...project.chapters[0],chapterNumber:2,title:'갈림길'}]};
 project=createStoryBranches(project,'start',2,()=>`branch-${++count}`);
 const source=project.lines.find(line=>line.id==='start')!;
 if(source.flow?.type!=='choice')throw Error('missing branches');
 const [a,b]=source.flow.options;
 project=insertStoryCut(project,a.targetLineId!,'second-a');
 project={...project,lines:project.lines.map(line=>({...line,text:line.id==='second-a'?'A 갈래에서만 읽는 두 번째 컷':line.id===b.targetLineId?'B 갈래의 첫 컷':line.id==='start'?'어느 길로 갈까요?':'다시 만나는 곳'}))};
 const document=createStoryDocument({project,savedAt:'2026-10-07T00:00:00.000Z',appVersion:'chapter-test'});
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const management=page.locator('[data-work-menu]>summary');if(!await management.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await management.click();
 await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'chapter.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(document))}); await confirmAuthoringImport(page);
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 if(!await management.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await management.click();const baselineEvent=page.waitForEvent('download');await openExchange(page).then(()=>page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click());const baseline=parseAuthoringFile(readFileSync((await(await baselineEvent).path())!,'utf8')).project;
 const first=await chapterNumbers(page);
 await first.number.fill('2');await first.number.blur();
 await first.branch.fill('');await first.branch.blur();
 await expect(page.getByLabel('현재 장과 컷 이동',{exact:true}).locator('option').first()).toContainText('2장 · 갈림길');
 const mover=await cuts(page);
 await expect(mover).toContainText('3장A');
 await expect(mover).toContainText('3장B');
 await mover.selectOption('second-a');
 const second=await chapterNumbers(page);
 await expect(second.number).toHaveValue('3');
 await expect(second.branch).toHaveValue('A');
 await page.keyboard.press('Escape');
 await expect(page.locator('[data-current-cut] textarea[data-cut-id]')).toHaveValue('A 갈래에서만 읽는 두 번째 컷');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 if(!await management.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await management.click();
 const download=page.waitForEvent('download');await openExchange(page).then(()=>page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click());
 const exported=parseAuthoringFile(readFileSync((await(await download).path())!,'utf8')).project;
 expect({...exported,updatedAt:baseline.updatedAt}).toEqual(baseline);
 expect(exported.chapters.slice(1).map((c:{chapterNumber:number;branchLabel?:string})=>[c.chapterNumber,c.branchLabel])).toEqual([[3,'A'],[3,'B'],[4,undefined]]);
 expect(exported.lines.find((l:{id:string})=>l.id===a.targetLineId).flow).toBeUndefined();
 expect(exported.lines.find((l:{id:string})=>l.id==='second-a').flow).toEqual(project.lines.find(l=>l.id==='second-a')?.flow);
 await page.reload();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toContainText('3장A');
});
