import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {PNG} from 'pngjs';
const raw=JSON.parse(readFileSync('tests/fixtures/stories/onggojib.json','utf8')),project=raw.project??raw;
for(const viewport of [{width:1280,height:800},{width:390,height:844}])for(const cut of ['review-main-003:start:0','review-main-003:part1-court-cruelty-labor-first__work-promised__wage-wet-wood__shoe-poverty:30'])test(`perspective card is centred at ${viewport.width}: ${cut}`,async({page},info)=>{
 test.setTimeout(180000);page.on('console',m=>{if(m.text().includes('Exception')||m.text().includes('Error'))console.log(m.text());});await page.setViewportSize(viewport);
 await page.addInitScript(({project,cut})=>{const key='knolstory-next-workspace-v1';if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({storyId:'onggojib',lineId:cut,view:'editor',mode:'edit',document:{documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-01T00:00:00.000Z',appVersion:'test',project}}));sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');},{project,cut});
 await page.route('**/api/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue(cut);await expect.poll(async()=>{const s=page.getByTestId('story-runtime-status');const rev=await s.getAttribute('data-rendered-revision');return rev!==null&&rev===(await s.getAttribute('data-scene-revision'))&&Number(rev)>=0;},{timeout:90000}).toBe(true);await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 const status=page.getByTestId('story-runtime-status');await expect.poll(async()=>{const rev=await status.getAttribute('data-rendered-revision');return rev!==null&&Number(rev)>=0&&rev===await status.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);
 const gate=page.getByTestId('story-runtime-frame').contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});if(await gate.count())await gate.press('Enter');
 // Sample the visible title after the sound gate, during its authored 1.8 second duration.
 await page.waitForTimeout(350);
 const frame=await page.getByTestId('story-runtime-frame').boundingBox();expect(frame).not.toBeNull();
 const png=PNG.sync.read(await page.screenshot({path:info.outputPath('perspective-card.png')}));const ys:number[]=[];
 for(let y=Math.ceil(frame!.y+frame!.height*.15);y<frame!.y+frame!.height*.78;y++)for(let x=Math.ceil(frame!.x+frame!.width*.18);x<frame!.x+frame!.width*.82;x++){
  const i=(y*png.width+x)*4;if(png.data[i]>170&&png.data[i+1]>170&&png.data[i+2]>160)ys.push(y);
 }
 expect(ys.length,'visible native title pixels').toBeGreaterThan(30);ys.sort((a,b)=>a-b);const centre=(ys[Math.floor(ys.length/2)]-frame!.y)/frame!.height;expect(centre).toBeGreaterThan(.44);expect(centre).toBeLessThan(.56);
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);const line=stored.lines.find((l:{id:string})=>l.id===cut);expect(line.presentation.transition.title).toBe(cut.includes('start')?'옹고집의 시점':'부인의 시점');expect(line.presentation.transition.cue).toBeUndefined();expect(line.presentation.transition.description).toBeUndefined();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback?.lineId),{timeout:15000}).not.toBe(cut);
});
