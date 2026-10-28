import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';
function fixture(name:string){
 const root=process.env.KNOLSTORY_OFFICE_RESULTS;if(!root)throw Error('Set KNOLSTORY_OFFICE_RESULTS to a successful test:office-roundtrip output directory.');
 const file=join(root,'saved',`${name}.xlsx`),result=JSON.parse(readFileSync(join(root,`${name}-result.json`),'utf8'));expect(result.status).toBe('passed');expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(result.outputSha256);
 return {file,expected:JSON.parse(readFileSync(join(root,`${name}-expected.json`),'utf8'))};
}
test('native-office saved current story imports, plays and exports without losing authored values',async({page},info)=>{
 const {file,expected}=fixture('story-current');await page.route('**/api/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const menu=page.locator('[data-work-menu]');await menu.locator(':scope>summary').click();await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles(file);await confirmAuthoringImport(page);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(expected.document.project);
 const rendered=()=>expect.poll(async()=>{const s=page.getByTestId('story-runtime-status');return Number(await s.getAttribute('data-rendered-revision'))>=0&&await s.getAttribute('data-rendered-revision')===await s.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);await rendered();
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await rendered();await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
 if(!await menu.evaluate(el=>(el as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const saved=info.outputPath('office-import.knolstory');await(await pending).saveAs(saved);expect(parseAuthoringFile(readFileSync(saved,'utf8')).project).toEqual(expected.document.project);
});
test('native-office saved picture book retains all pages and cover fields in browser export',async({page},info)=>{
 const {file,expected}=fixture('shortstory-full');await page.route('**/api/**',r=>r.abort());await page.goto('/shortstory');await page.getByLabel('숏스토리 파일 가져오기',{exact:true}).setInputFiles(file);await confirmAuthoringImport(page);await expect(page.getByLabel('이야기 제목',{exact:true})).toHaveValue(expected.project.title);
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const saved=info.outputPath('office-import.shortstory');await(await pending).saveAs(saved);expect(parseAuthoringFile(readFileSync(saved,'utf8')).project).toEqual(expected.project);await page.reload();await expect(page.getByLabel('이야기 제목',{exact:true})).toHaveValue(expected.project.title);
});
