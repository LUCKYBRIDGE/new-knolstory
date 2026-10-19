import {chromium} from '@playwright/test';
import {resolve} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
const dir='docs/architecture/evidence/editor-redesign';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1480,height:1020}});
page.setDefaultTimeout(8000);
const results=[];
const click=name=>page.getByRole('button',{name,exact:typeof name==='string'}).click();
const state=id=>page.locator('#view img[src="reading/'+id+'.png"]').waitFor();
async function check(name,run){await page.goto('file://'+resolve(dir,'reader-preview.html'));await run();results.push({name,passed:true});}
try {
 await check('settings-close',async()=>{await click('읽기 메뉴');await click(/^읽기 설정/);await state('web-settings');await click('닫기 ×');await state('web-basic');});
 await check('fullscreen-escape',async()=>{await click('읽기 메뉴');await click(/^전체 화면/);await state('web-fullscreen');await page.keyboard.press('Escape');await state('web-basic');});
 await check('restart-confirm-first-cut',async()=>{await click('읽기 메뉴');await click(/^처음부터 읽기/);await state('web-restart-confirm');await click('처음부터 시작');await state('web-restart-done');});
 await check('library-confirm-continue',async()=>{await click('읽기 메뉴');await click(/^서재로 돌아가기/);await state('web-library-confirm');await click('보관하고 서재로');await state('web-library-done');await click('이어 읽기');await state('web-basic');});
 await check('phone-menu-settings-fold',async()=>{await click('휴대폰');await click('읽기 메뉴');await state('phone-top-menu');await click(/^읽기 설정/);await state('phone-settings');await click('닫기 ×');await click('읽기 도구 펼치기');await state('phone-expanded');await click('읽기 도구 접기');await state('phone-folded');});
 await check('menu-outside-close',async()=>{await click('읽기 메뉴');await page.locator('#view img').click({position:{x:300,y:200}});await state('web-basic');});
 await check('restart-cancel',async()=>{await click('읽기 메뉴');await click(/^처음부터 읽기/);await click('취소');await state('web-basic');});
 const manifest=JSON.parse(await readFile(resolve(dir,'reading-manifest.json'),'utf8'));
 const labels=['지난기록','저장','불러오기','자동','빠른 저장','빠른 불러오기'];
 const targets=manifest.checks.find(c=>c.id==='web-basic').buttons.filter(b=>labels.includes(b.label));
 if(targets.length!==6||targets.some(b=>b.height!==44))throw Error('Desktop quick hit targets must be 44px');
 const folded=manifest.checks.find(c=>c.id==='phone-folded').dock;const expanded=manifest.checks.find(c=>c.id==='phone-expanded').dock;const gap=expanded.rows[3].y-expanded.rows[0].bottom;if(folded.viewportHeight-folded.dialogueBottom!==8||expanded.viewportHeight-expanded.toolsBottom!==8||expanded.toolsTop-expanded.dialogueBottom!==4||gap!==2)throw Error('Phone bottom dock has excessive gaps');results.push({name:'phone-bottom-dock-spacing',passed:true,foldedBottomGap:8,expandedBottomGap:8,dialogueToolGap:4,rowGap:gap});
 results.push({name:'compact-bar-hit-regions',passed:true,visibleHeight:28,targets});
 await writeFile(resolve(dir,'reading-preview-check.json'),JSON.stringify({date:'2026-10-11',scope:'mockup navigation only; no real fullscreen, playback, storage or device verification',count:manifest.count,results},null,2));
 console.log(JSON.stringify(results.map(({name,passed})=>({name,passed}))));
} finally {await browser.close();}
