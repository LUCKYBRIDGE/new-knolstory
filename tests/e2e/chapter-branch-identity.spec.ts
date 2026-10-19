import {parseAuthoringFile,confirmAuthoringImport} from './authoring-file';
import { test, expect,type Page } from '@playwright/test';
import { createStoryBranches, createStoryDocument } from '../../packages/story-domain/src/index';
import { createBlankStoryProject, insertStoryCut } from '../../packages/runtime-core/src/authoring';
import { readFileSync } from 'node:fs';

async function writer(page:Page){const details=page.locator('[data-writing-tools]');if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator(':scope>summary').click();await page.getByRole('button',{name:'장 전체 글 고치기',exact:true}).click();}
async function cuts(page:Page){const details=page.locator('[data-additional-tools]');if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator(':scope>summary').click();await page.getByRole('button',{name:'컷 목록',exact:true}).click();}

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
 if(!await management.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await management.click();const baselineEvent=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const baseline=parseAuthoringFile(readFileSync((await(await baselineEvent).path())!,'utf8')).project;
 await writer(page);
 const panel=page.getByRole('region',{name:'장 전체 글 고치기',exact:true});
 await panel.getByText('장 설정 · 말하는 인물과 기본 자료',{exact:true}).click();
 await panel.getByLabel('장 번호',{exact:true}).fill('2');
 await panel.getByLabel('장 갈래 표시',{exact:true}).fill('');
 await expect(panel).toContainText('2장 · 갈림길');
 await page.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();
 await cuts(page);
 await expect(page.getByRole('complementary',{name:'장과 컷 목록'})).toContainText('3장A');
 await expect(page.getByRole('complementary',{name:'장과 컷 목록'})).toContainText('3장B');
 const branch=page.getByRole('complementary',{name:'장과 컷 목록'}).locator('details').filter({has:page.locator('[data-line-id="second-a"]')});if(!await branch.evaluate(node=>(node as HTMLDetailsElement).open))await branch.locator(':scope>summary').click();
 await page.locator('[data-line-id="second-a"]').click();
 await writer(page);
 await panel.getByText('장 설정 · 말하는 인물과 기본 자료',{exact:true}).click();
 await expect(panel.getByLabel('장 번호',{exact:true})).toHaveValue('3');
 await expect(panel.getByLabel('장 갈래 표시',{exact:true})).toHaveValue('A');
 await expect(panel.getByLabel('2컷 대사 / 해설')).toHaveValue('A 갈래에서만 읽는 두 번째 컷');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 if(!await management.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await management.click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
 const exported=parseAuthoringFile(readFileSync((await(await download).path())!,'utf8')).project;
 expect({...exported,updatedAt:baseline.updatedAt}).toEqual(baseline);
 expect(exported.chapters.slice(1).map((c:{chapterNumber:number;branchLabel?:string})=>[c.chapterNumber,c.branchLabel])).toEqual([[3,'A'],[3,'B'],[4,undefined]]);
 expect(exported.lines.find((l:{id:string})=>l.id===a.targetLineId).flow).toBeUndefined();
 expect(exported.lines.find((l:{id:string})=>l.id==='second-a').flow).toEqual(project.lines.find(l=>l.id==='second-a')?.flow);
 await page.reload();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await writer(page);
 await expect(panel).toContainText('3장A');
});
