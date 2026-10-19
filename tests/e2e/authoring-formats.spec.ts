import {test,expect,type Page} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {createExcelWorkbook} from '../../packages/compatibility/src/excel';

async function management(page:Page){const toggle=page.locator('[data-work-menu]>summary');if(!await toggle.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await toggle.click();}
async function transfer(page:Page){await management(page);const toggle=page.getByText('Excel · Google 시트',{exact:true});if(!await toggle.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await toggle.click();}
async function download(page:Page,label:string){const pending=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();return (await(await pending).path())!;}
async function imported(page:Page,path:string){await management(page);await page.getByLabel('작품 파일 가져오기').setInputFiles(path);return page.getByRole('dialog',{name:'작품 가져오기 확인'});}

for(const viewport of [{width:1280,height:900},{width:820,height:1180},{width:390,height:844},{width:844,height:390}]){
 test(`official multi-tab Excel edits preview and save without replacing original ${viewport.width}x${viewport.height}`,async({page},info)=>{
  await page.setViewportSize(viewport);await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  await transfer(page);const originalFile=await download(page,'Excel 내보내기');
  const book=await createExcelWorkbook();await book.xlsx.load(readFileSync(originalFile));
  const project=book.getWorksheet('작품 정보')!,cuts=book.getWorksheet('컷')!;
  const projectKeys=project.getRow(2).values as string[],cutKeys=cuts.getRow(2).values as string[];
  const title=`표에서 작성한 긴 한국어 제목과 이모지 🌳 ${viewport.width}`;
  project.getCell(3,projectKeys.indexOf('title')).value=title;
  cuts.getCell(3,cutKeys.indexOf('text')).value='001 앞자리와 =문구를 보존합니다.\n한국어 두 번째 줄 🌳';
  const edited=info.outputPath('edited.xlsx');writeFileSync(edited,new Uint8Array(await book.xlsx.writeBuffer()));
  const dialog=await imported(page,edited);await expect(dialog).toBeVisible({timeout:20000});await expect(dialog).toContainText(title);
  const bounds=(await dialog.boundingBox())!;expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(viewport.width);expect(bounds.height).toBeLessThanOrEqual(viewport.height);
  await dialog.getByRole('button',{name:'가져오기 취소',exact:true}).click();await expect(page.getByRole('heading',{name:title,exact:true})).toHaveCount(0);
  const preview=await imported(page,edited);await preview.getByRole('button',{name:'내 사본으로 가져오기',exact:true}).click();
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  await expect(page.getByLabel('대사 / 해설',{exact:true})).toHaveValue('001 앞자리와 =문구를 보존합니다.\n한국어 두 번째 줄 🌳');
  await page.reload();await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  const brokenBook=await createExcelWorkbook();await brokenBook.xlsx.load(readFileSync(edited));brokenBook.getWorksheet('컷')!.getCell(2,1).value='unsupportedColumn';
  const broken=info.outputPath('broken.xlsx');writeFileSync(broken,new Uint8Array(await brokenBook.xlsx.writeBuffer()));
  await imported(page,broken);await expect(page.getByRole('dialog',{name:'작품 가져오기 확인'})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();await expect(page.getByText(/헤더|열 이름/)).toBeVisible();
  await page.reload();await expect(page.getByLabel('대사 / 해설',{exact:true})).toHaveValue('001 앞자리와 =문구를 보존합니다.\n한국어 두 번째 줄 🌳');
 });
}

test('blank official template creates new work through validated preview',async({page},info)=>{
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await transfer(page);
 const path=await download(page,'빈 공식 편집 양식');const book=await createExcelWorkbook();await book.xlsx.load(readFileSync(path));
 const sheet=book.getWorksheet('작품 정보')!,keys=sheet.getRow(2).values as string[];sheet.getCell(3,keys.indexOf('title')).value='빈 양식에서 시작한 내 작품';
 const edited=info.outputPath('blank-created.xlsx');writeFileSync(edited,new Uint8Array(await book.xlsx.writeBuffer()));
 const dialog=await imported(page,edited);await expect(dialog).toContainText('빈 양식에서 시작한 내 작품');await dialog.getByRole('button',{name:'내 사본으로 가져오기',exact:true}).click();
 await expect(page.getByRole('heading',{name:'빈 양식에서 시작한 내 작품',exact:true})).toBeVisible();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
});
