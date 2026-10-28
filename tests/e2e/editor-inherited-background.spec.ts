import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport} from './authoring-file';
const projectDefault='seonnyeo.background.BG01-valley-day',chapterDefault='seonnyeo.background.BG02-valley-storm';
const catalog=JSON.parse(readFileSync('packages/asset-registry/src/catalog.json','utf8')) as {id:string;src:string}[];
const source=(id:string)=>catalog.find(asset=>asset.id===id)!.src;
const base=createBlankStoryProject({id:'inherited-background',chapterId:'a',lineId:'inherit',title:'기본 배경 확인'}),cut=base.lines[0]!,chapter=base.chapters[0]!;
const fixture={...base,stageDefaults:{leftAssetId:'',rightAssetId:'',...base.stageDefaults,backgroundId:projectDefault},chapters:[{...chapter,backgroundId:chapterDefault},{...chapter,id:'b',order:2,chapterNumber:2,title:'작품 기본 배경'}],lines:[
 {...cut,text:'장의 배경을 이어받는 글',backgroundId:''},
 {...cut,id:'none',order:2,text:'배경을 표시하지 않는 글',backgroundId:'',backgroundMode:'none' as const},
 {...cut,id:'direct',order:3,text:'이 컷에 직접 지정한 배경',backgroundId:projectDefault},
 {...cut,id:'project-default',chapterId:'b',order:1,text:'작품의 배경을 이어받는 글',backgroundId:''},
]};
async function workspace(page:Page){return page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);}
async function menu(page:Page){const element=page.locator('[data-work-menu]');if(!await element.evaluate(node=>(node as HTMLDetailsElement).open))await element.locator(':scope>summary').click();}
async function mode(page:Page,label:string){await menu(page);await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption({label});}

test('inherited background thumbnails show resolved artwork without changing default, none or direct selections',async({page},info)=>{
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));page.setDefaultTimeout(15000);await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await menu(page);await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'inherit.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-20T00:00:00.000Z',appVersion:'test',project:fixture}))});await confirmAuthoringImport(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const before=await workspace(page);
 const basic=page.getByRole('button',{name:/^1컷 배경 이미지 찾기 ·/,exact:false});await expect(basic).toHaveAttribute('data-asset-value','');await expect(basic).toHaveAttribute('data-asset-inherited','true');await expect(basic.locator('img')).toHaveAttribute('src',source(chapterDefault));
 await mode(page,'배경 편집');const first=page.getByTestId('editing-cut-inherit').getByRole('button',{name:/^1컷 배경 이미지 찾기 ·/,exact:false});
 await expect(first.locator('img')).toHaveAttribute('src',source(chapterDefault));await expect(first).toHaveAttribute('data-asset-value','');
 const none=page.getByTestId('editing-cut-none').getByRole('button',{name:/^2컷 배경 이미지 찾기 ·/,exact:false});await expect(none).toContainText('이미지 없음');await expect(none.locator('img')).toHaveCount(0);await expect(none).toHaveAttribute('data-asset-value','__none');
 const direct=page.getByTestId('editing-cut-direct').getByRole('button',{name:/^3컷 배경 이미지 찾기 ·/,exact:false});await expect(direct.locator('img')).toHaveAttribute('src',source(projectDefault));await expect(direct).toHaveAttribute('data-asset-value',projectDefault);await expect(direct).not.toHaveAttribute('data-asset-inherited','true');
 await first.click();const dialog=page.getByRole('dialog',{name:'이미지 선택 · 1컷 배경',exact:true});await expect(dialog.getByRole('button',{name:'장의 기본 이미지',exact:true})).toHaveAttribute('aria-pressed','true');await dialog.getByRole('button',{name:'이미지 선택 닫기',exact:true}).click();await expect(first).toBeFocused();expect(await workspace(page)).toEqual(before);
 await page.getByLabel('편집할 장',{exact:true}).selectOption('b');const fallback=page.getByTestId('editing-cut-project-default').getByRole('button',{name:/^1컷 배경 이미지 찾기 ·/,exact:false});await expect(fallback.locator('img')).toHaveAttribute('src',source(projectDefault));await expect(fallback).toHaveAttribute('data-asset-value','');await expect.poll(()=>fallback.locator('img').evaluate(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0)).toBe(true);
 await page.getByRole('combobox',{name:'현재 장과 컷 이동',exact:true}).selectOption('project-default');
 for(const viewport of [{width:1280,height:800},{width:390,height:844}]){await page.setViewportSize(viewport);await page.screenshot({path:info.outputPath(`inherited-${viewport.width}.png`)});expect(await fallback.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);}
 expect(await workspace(page)).toEqual(before);await page.reload();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await mode(page,'배경 편집');await page.getByLabel('편집할 장',{exact:true}).selectOption('a');await expect(page.getByTestId('editing-cut-inherit').getByRole('button',{name:/^1컷 배경 이미지 찾기 ·/,exact:false}).locator('img')).toHaveAttribute('src',source(chapterDefault));expect(await workspace(page)).toEqual(before);
});
