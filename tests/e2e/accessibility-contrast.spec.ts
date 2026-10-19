import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {renderedTextContrast} from './rendered-contrast';
for(const width of [1440,390])test(`compact default cover and shelf status contrast on actual backgrounds ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.complete?Promise.resolve():new Promise<void>(resolve=>{image.addEventListener('load',()=>resolve(),{once:true});image.addEventListener('error',()=>resolve(),{once:true});})));});
 const texts=page.locator('[data-shelf-cover] [data-role="title"] h2, [data-shelf-cover] [data-role="title"] p'),reports=[];
 await expect(texts).toHaveCount(8);
 for(let index=0;index<await texts.count();index++)reports.push({kind:'default compact title or subtitle',...await renderedTextContrast(texts.nth(index),info.outputPath(`cover-${index}`))});
 reports.push({kind:'shelf status',...await renderedTextContrast(page.locator('[data-drawer-face] [role="status"]'),info.outputPath('status'))});
 const path=info.outputPath('rendered-contrast.json');await writeFile(path,JSON.stringify({width,reports},null,2)+'\n');await info.attach('rendered-contrast',{path,contentType:'application/json'});
 for(const report of reports)expect(report.minimum,`${report.kind}: ${report.info.text}`).toBeGreaterThanOrEqual(4.5);
});
test('contrast sampling includes glyphs matching their backdrop and rejects opacity groups',async({page},info)=>{
 await page.setContent('<div id="probe" style="width:400px;font:700 32px/1.5 monospace;color:rgb(120,120,120);background:linear-gradient(90deg,rgb(120,120,120) 50%,white 50%)">MMMMMMMMMMMMMMMM</div>');
 const probe=page.locator('#probe'),before=await probe.getAttribute('style');
 const result=await renderedTextContrast(probe,info.outputPath('independent-mask'));expect(result.minimum).toBe(1);expect(await probe.getAttribute('style')).toBe(before);
 await probe.evaluate(node=>{(node as HTMLElement).style.opacity='.5';});const translucent=await probe.getAttribute('style');await expect(renderedTextContrast(probe,info.outputPath('unsupported-opacity'))).rejects.toThrow('Unsupported CSS foreground');expect(await probe.getAttribute('style')).toBe(translucent);
 await writeFile(info.outputPath('mask-regression.json'),JSON.stringify(result,null,2)+'\n');
});
test('text contrast excludes currentColor borders outside actual text ranges',async({page},info)=>{
 await page.setContent('<button id="bordered" style="font:20px monospace;color:white;background:black;border:10px solid currentColor;padding:12px">Readable</button>');
 const result=await renderedTextContrast(page.locator('#bordered'),info.outputPath('border-mask'));expect(result.minimum).toBe(21);
});
