import {chromium} from '@playwright/test';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
const directory='docs/architecture/evidence/editor-redesign';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:2440,height:1200},deviceScaleFactor:1});
 await page.goto('file://'+resolve(directory,'mockups.html'));
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
 for(const name of ['web','tablet','phone','dialogue'])await page.locator('#'+name).screenshot({path:resolve(directory,name+'-v2.png')});
 await writeFile(resolve(directory,'inspection.json'),JSON.stringify(await page.evaluate(()=>({assets:[...document.querySelectorAll('img')].map(image=>({src:image.getAttribute('src'),loaded:image.complete&&image.naturalWidth>0})),boards:[...document.querySelectorAll('.board')].map(node=>({id:node.id,width:node.clientWidth,height:node.clientHeight})),font:document.fonts.check('16px StorySans')})),null,2));
}finally{await browser.close();}
