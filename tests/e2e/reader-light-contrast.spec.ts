import {test,expect,type Page,type Locator} from '@playwright/test';
import {PNG} from 'pngjs';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport} from './authoring-file';
import {renderedTextContrast} from './rendered-contrast';

/** Reader tools drawn over the scene must stay legible on bright scenes, including the audio gate and white transition cards. */
type Box=Readonly<{x:number;y:number;width:number;height:number}>;
const channel=(value:number)=>{const v=value/255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;};
const luminance=(png:PNG,x:number,y:number)=>{const i=(png.width*y+x)*4;return .2126*channel(png.data[i]!)+.7152*channel(png.data[i+1]!)+.0722*channel(png.data[i+2]!);};
function samples(png:PNG,box:Box){const values:number[]=[];for(let y=Math.max(0,Math.floor(box.y));y<Math.min(png.height,Math.ceil(box.y+box.height));y++)for(let x=Math.max(0,Math.floor(box.x));x<Math.min(png.width,Math.ceil(box.x+box.width));x++)values.push(luminance(png,x,y));return values.sort((a,b)=>a-b);}
/** Darkest paint inside the control against its brightest backdrop pixel: a white glyph needs a dark edge to read on white. */
function edgeContrast(png:PNG,box:Box){const values=samples(png,box);return (values.at(-1)!+.05)/(values[0]!+.05);}
const median=(png:PNG,box:Box)=>{const values=samples(png,box);return values[Math.floor(values.length/2)]!;};
async function boxOf(locator:Locator){const box=await locator.boundingBox();expect(box,'element is laid out').not.toBeNull();return box!;}
async function playFromEditor(page:Page,project:ReturnType<typeof createBlankStoryProject>){
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));await page.route('**/api/**',route=>route.abort());
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨',{timeout:60000});
 const menu=page.locator('[data-work-menu]');await menu.locator(':scope>summary').click();
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:`${project.id}.knolstory`,mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-31T00:00:00.000Z',appVersion:'test',project}))});
 await confirmAuthoringImport(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).first().click();
 const status=page.getByTestId('story-runtime-status');
 await expect(status).toHaveAttribute('data-rendered-revision',/^[0-9]+$/,{timeout:120000});await expect(status).not.toHaveAttribute('data-textbox-rect','null');
 await page.waitForTimeout(800);
 return status;
}
test.beforeEach(async({page})=>{await page.setViewportSize({width:1440,height:900});});

test('audio gate keeps the dialogue panel dark and every tool over the scene legible on a bright stage',async({page},info)=>{
 const base=createBlankStoryProject({id:'light-gate',chapterId:'ch',lineId:'a',title:'밝은 장면 대비'});
 const project={...base,lines:base.lines.map(line=>({...line,text:'밝은 장면에서도 도구가 보여야 해요.',audio:{music:{action:'play' as const,assetId:'audio:music:forest',volume:.3,loop:true}}}))};
 const status=await playFromEditor(page,project);
 await expect(page.getByTestId('story-runtime-frame').contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true})).toBeVisible();
 const frame=await boxOf(page.getByTestId('story-runtime-frame')),scale=frame.width/1280;
 const textbox=JSON.parse((await status.getAttribute('data-textbox-rect'))!) as Box;
 const shot=PNG.sync.read(await page.screenshot({path:info.outputPath('gate.png')}));
 const panel={x:frame.x+textbox.x*scale+8,y:frame.y+textbox.y*scale+8,width:textbox.width*scale-16,height:textbox.height*scale-16};
 const back=await renderedTextContrast(page.getByRole('button',{name:'편집으로 돌아가기',exact:true}),info.outputPath('editor-return'));
 const measured={panelMedianLuminance:median(shot,panel),menuIcon:edgeContrast(shot,await boxOf(page.locator('[data-reader-menu-trigger]'))),chapterLabel:edgeContrast(shot,await boxOf(page.locator('[data-reader-context]'))),editorReturn:back.minimum};
 console.log('[contrast gate]',JSON.stringify(measured));
 expect.soft(measured.panelMedianLuminance,'dialogue panel is not washed out by the audio gate').toBeLessThan(.2);
 expect.soft(measured.menuIcon,'reader menu icon').toBeGreaterThanOrEqual(3);
 expect.soft(measured.chapterLabel,'chapter label').toBeGreaterThanOrEqual(3);
 expect.soft(measured.editorReturn,'editor return text').toBeGreaterThanOrEqual(4.5);
});

test('reader tools stay legible over a white transition card',async({page},info)=>{
 const base=createBlankStoryProject({id:'light-card',chapterId:'ch',lineId:'a',title:'하얀 전환 대비'});
 const project={...base,lines:base.lines.map(line=>({...line,text:'하얀 전환 위에서도 도구가 보여야 해요.',presentation:{transition:{type:'white-fade' as const,mode:'confirm' as const,durationMs:900,title:'하얀 장면'}}}))};
 await playFromEditor(page,project);
 const frame=await boxOf(page.getByTestId('story-runtime-frame'));
 const shot=PNG.sync.read(await page.screenshot({path:info.outputPath('white-card.png')}));
 const tools=page.getByRole('group',{name:'읽기 도구',exact:true});
 const measured={cardMedianLuminance:median(shot,{x:frame.x+frame.width*.3,y:frame.y+frame.height*.1,width:frame.width*.4,height:frame.height*.1}),history:edgeContrast(shot,await boxOf(tools.getByRole('button',{name:'지난기록',exact:true}))),quickSave:edgeContrast(shot,await boxOf(tools.getByRole('button',{name:'빠른 저장',exact:true}))),menuIcon:edgeContrast(shot,await boxOf(page.locator('[data-reader-menu-trigger]'))),chapterLabel:edgeContrast(shot,await boxOf(page.locator('[data-reader-context]')))};
 console.log('[contrast white card]',JSON.stringify(measured));
 expect.soft(measured.cardMedianLuminance,'white card is showing').toBeGreaterThan(.85);
 for(const key of ['history','quickSave','menuIcon','chapterLabel'] as const)expect.soft(measured[key],key).toBeGreaterThanOrEqual(3);
});
