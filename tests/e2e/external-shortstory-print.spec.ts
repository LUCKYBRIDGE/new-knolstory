import {test,expect} from '@playwright/test';
for(const source of ['excel','google'])test(`actual ${source} edited ShortStory reopens and prints a complete A4 book`,async({page},info)=>{
 await page.goto('/shortstory');
 await page.getByLabel('숏스토리 파일 가져오기').setInputFiles(`docs/architecture/evidence/authoring-format/shortstory-${source}-edited.xlsx`);
 await page.getByRole('dialog',{name:'작품 가져오기 확인'}).getByRole('button',{name:'내 사본으로 가져오기'}).click();
 await page.reload();
 const count=await page.evaluate(()=>{const book=JSON.parse(localStorage.getItem('knolstory-shortstory-library-v1')!).books.at(-1);return book.pages.length+1+(book.cover.authorNote?1:0);});
 await page.emulateMedia({media:'print'});await expect(page.locator('[data-shortstory-print] article')).toHaveCount(count);
 const pdf=await page.pdf({format:'A4',preferCSSPageSize:true,printBackground:true,path:info.outputPath(`shortstory-${source}-a4.pdf`)});
 expect([...pdf.toString('latin1').matchAll(/\/Type \/Page\b/g)]).toHaveLength(count);
 const bounds=pdf.toString('latin1').match(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/)!;
 expect(Math.abs(Number(bounds[1])-595.28)).toBeLessThan(1);expect(Math.abs(Number(bounds[2])-841.89)).toBeLessThan(1);
});
