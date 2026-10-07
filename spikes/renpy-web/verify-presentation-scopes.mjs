/** Native pixel checks: independent image, background, whole screen and repeated lifetime. */
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.KNOL_VERIFY_URL??'http://127.0.0.1:3000';
const output='test-results/presentation-scopes';await mkdir(output,{recursive:true});
await writeFile('apps/web/public/runtime/verify-scopes.html','<!doctype html><html><body style="margin:0"></body></html>');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.goto(`${base}/runtime/verify-scopes.html`);
 await page.evaluate(()=>{window.presenterEvents=[];addEventListener('message',e=>{if(e.origin===location.origin)window.presenterEvents.push(e.data)});document.body.innerHTML='<iframe src="/runtime/index.html" width="1280" height="720" style="border:0"></iframe>'});
 await page.waitForFunction(()=>window.presenterEvents.some(e=>e.type==='ready'),null,{timeout:90000});
 let revision=0;
 const scene={contractVersion:1,sceneId:'scope-native',revision:0,width:1280,height:720,mode:'play',background:{imagePath:'assets/legacy-18da4fc/BG04-cottage-day.webp'},actors:[{id:'actor',name:'흥부',rect:{x:160,y:90,width:420,height:620},imagePath:'assets/legacy-18da4fc/heungbu.character.heungbu-swallow-care.webp'}],dialogue:{speaker:'흥부',text:'대상과 반복 범위를 확인합니다.'},presentation:{version:2,effects:[]}};
 async function send(changes={}){const value={...scene,...changes,revision:++revision};await page.evaluate(v=>document.querySelector('iframe').contentWindow.postMessage({protocol:1,type:'loadScene',seq:v.revision,revision:v.revision,payload:v},location.origin),value);await page.waitForFunction(r=>window.presenterEvents.some(e=>e.type==='sceneRendered'&&e.revision===r),revision,{timeout:30000})}
 const capture=async name=>PNG.sync.read(await page.screenshot({path:`${output}/${name}.png`}));
 const diff=(a,b,rect)=>{let n=0;for(let y=rect.y;y<rect.y+rect.height;y++)for(let x=rect.x;x<rect.x+rect.width;x++){const i=(y*a.width+x)*4;if(Math.abs(a.data[i]-b.data[i])+Math.abs(a.data[i+1]-b.data[i+1])+Math.abs(a.data[i+2]-b.data[i+2])>35)n++}return n};
 const actorRect={x:160,y:90,width:420,height:400},outside={x:700,y:100,width:300,height:250},textbox={x:80,y:560,width:800,height:80};
 await send();await page.waitForTimeout(150);const baseline=await capture('baseline');
 const cue=target=>({type:'flash-red',intensity:'strong',delayMs:250,target,originEntry:`test-${target.kind}`,repeat:'once'});
 await send({sceneId:'actor-target',presentation:{version:2,effects:[cue({kind:'actor',actorId:'actor'})]}});await page.waitForTimeout(420);const actor=await capture('actor-target');
 assert.ok(diff(baseline,actor,actorRect)>1000,'actor image receives its own effect');assert.ok(diff(baseline,actor,outside)<100,'actor effect does not tint background');assert.ok(diff(baseline,actor,textbox)<100,'actor effect does not tint textbox');
 await send({sceneId:'background-target',presentation:{version:2,effects:[cue({kind:'background'})]}});await page.waitForTimeout(420);const background=await capture('background-target');assert.ok(diff(baseline,background,outside)>1000,'background receives its own effect');assert.ok(diff(baseline,background,textbox)<100,'background effect does not tint textbox');
 await send({sceneId:'screen-target',presentation:{version:2,effects:[cue({kind:'screen'})]}});await page.waitForTimeout(420);const screen=await capture('screen-target');assert.ok(diff(baseline,screen,textbox)>1000,'whole screen effect includes dialogue');
 const repeat={type:'flash-red',target:{kind:'background'},originEntry:'following:0:0',repeat:'loop',periodMs:1000,delayMs:100,intensity:'strong'};
 await send({sceneId:'loop-a',presentation:{version:2,effects:[repeat]}});await page.waitForTimeout(350);const first=await capture('loop-first');assert.ok(diff(baseline,first,outside)>1000);
 await send({sceneId:'loop-b',presentation:{version:2,effects:[repeat]}});await page.waitForTimeout(100);const continued=await capture('loop-continued');assert.ok(diff(baseline,continued,outside)>1000,'persistent cue clock survives new cut');
 let repeated=false;for(let i=0;i<10;i++){await page.waitForTimeout(120);if(diff(baseline,await capture('loop-second'),outside)>1000){repeated=true;break;}}assert.ok(repeated,'loop repeats');
 await send({sceneId:'restart-loop',audio:{version:1,sessionId:'new-session',music:{action:'stop',fadeOutMs:0},sounds:[]},presentation:{version:2,effects:[repeat]}});await page.waitForTimeout(40);assert.ok(diff(baseline,await capture('restart-waits'),outside)<100,'restore resets inherited cue clock');await page.waitForTimeout(350);assert.ok(diff(baseline,await capture('restart-runs'),outside)>1000);
 await send({sceneId:'cleared',presentation:{version:2,effects:[]}});await page.waitForTimeout(120);assert.ok(diff(baseline,await capture('cleared'),outside)<100,'cleared following effect disappears');
 await send({sceneId:'reduced',reducedMotion:true,presentation:{version:2,effects:[repeat]}});await page.waitForTimeout(350);assert.ok(diff(baseline,await capture('reduced'),outside)<100,'reduced motion suppresses repeated flashes');
 console.log('Native presentation scopes: actor/background/screen targeting, persistence, repetition, clear and reduced motion passed.');
}finally{await browser.close()}
