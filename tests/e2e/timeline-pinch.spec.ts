import {test,expect} from '@playwright/test';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport} from './authoring-file';
test.use({hasTouch:true});
const base=createBlankStoryProject({id:'combined',chapterId:'ch',lineId:'first',title:'함께 편집 확인'}),cut=base.lines[0]!;
const project={...base,chapters:base.chapters.map(ch=>({...ch,audio:{music:{action:'play' as const,assetId:'audio:music:forest',volume:.7}}})),lines:Array.from({length:12},(_,i)=>({...cut,id:i===0?'first':`cut${i+1}`,order:i+1,text:`${i+1}컷의 보존할 글`,...(i===0?{presentation:{effects:[{id:'effect',type:'shake' as const,scope:'following' as const,endLineId:'cut3',durationMs:600},{id:'second',type:'flash' as const,trigger:'on-click' as const,clickStep:2,durationMs:800}]}}:i===3?{audio:{music:{action:'stop' as const}}}:{})}))};


async function pinch(page:import('@playwright/test').Page,region:import('@playwright/test').Locator,target?:import('@playwright/test').Locator){
 await region.scrollIntoViewIfNeeded();await region.evaluate((el,left)=>{el.scrollLeft=left;},target?0:120);if(target)await target.scrollIntoViewIfNeeded();
 const box=(await region.boundingBox())!,item=target?await target.boundingBox():null,x=item?item.x+43:box.x+92+(box.width-92)/2,y=item?item.y+item.height/2:box.y+Math.min(70,box.height-12);
 const label=target?100:92;
 const session=await page.context().newCDPSession(page);
 const point=(id:number,dx:number)=>({id,x:x+dx,y});
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(1,-35)]});
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(1,-35),point(2,35)]});
 // Capture after touchdown has stopped the prior native scroll momentum.
 const contentBefore=await region.evaluate((el,offset)=>(el.scrollLeft+offset)/Number((el as HTMLElement).dataset.zoom),x-box.x-label);
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(1,-70),point(2,70)]});
 await expect.poll(()=>region.getAttribute('data-zoom')).toBe('200');
 await expect.poll(()=>region.evaluate((el,offset)=>(el.scrollLeft+offset)/Number((el as HTMLElement).dataset.zoom),x-box.x-label)).toBeCloseTo(contentBefore,2);
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[point(1,-70)]});
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(1,-100)]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
}
for(const viewport of [{width:390,height:844},{width:820,height:1180}])test(`two finger timeline zoom preserves authored content ${viewport.width}`,async({page})=>{
 await page.route('**/api/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const menu=page.locator('[data-work-menu]');await menu.locator(':scope>summary').click();await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'combined.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-21T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 if(!await menu.evaluate(el=>(el as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();await expect(page.getByRole('combobox',{name:'편집화면 선택',exact:true}).locator('option[value="audio-direction"]')).toHaveCount(0);await page.getByText('편집 설정',{exact:true}).click();await page.getByRole('checkbox',{name:'음향 편집 사용',exact:true}).check();await page.getByRole('checkbox',{name:'연출 편집 사용',exact:true}).check();await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption('audio-direction');


 await page.setViewportSize(viewport);
 const timeline=page.locator('[data-combined-timeline]'),area=page.getByRole('region',{name:'음향·연출 작업 영역',exact:true});
 const scrollBox=(await area.boundingBox())!,swipe=await page.context().newCDPSession(page);
 await area.evaluate(el=>{el.scrollLeft=0;});
 await swipe.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:7,x:scrollBox.x+250,y:scrollBox.y+65}]});
 for(let step=1;step<=5;step++)await swipe.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:7,x:scrollBox.x+250-step*15,y:scrollBox.y+65}]});
 await swipe.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect.poll(()=>area.evaluate(el=>el.scrollLeft)).toBeGreaterThan(20);await swipe.detach();
 await pinch(page,area);
 expect(await area.evaluate(el=>el.scrollLeft)).toBeGreaterThan(120);
 await timeline.getByRole('button',{name:'현재 컷 시간 보기',exact:true}).click();
 await page.getByLabel('음향·연출 작업 배율',{exact:true}).selectOption('100');
 const time=page.locator('[data-combined-time]'),seconds=time.getByRole('region',{name:'현재 컷 초 단위 작업 영역',exact:true});
 await time.getByRole('button',{name:/화면 흔들림 시간 선택/}).click();
 await time.getByText('시간 배치 설정',{exact:true}).click();await time.getByRole('checkbox',{name:'시간 막대 끌기 사용',exact:true}).check();await time.getByText('시간 배치 설정',{exact:true}).click();
 await pinch(page,seconds,time.getByRole('button',{name:/화면 흔들림 시간 선택/}));
 await expect(time.getByRole('button',{name:/화면 흔들림 시간 선택/})).toHaveAttribute('aria-pressed','true');
 await time.getByRole('button',{name:/화면 흔들림 시간 선택/}).click();
 const boundary=(await seconds.boundingBox())!,mixed=await page.context().newCDPSession(page);
 await mixed.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:18,y:18},{id:2,x:boundary.x+180,y:boundary.y+65}]});
 await mixed.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:18,y:18},{id:2,x:boundary.x+230,y:boundary.y+65}]});await mixed.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mixed.detach();await expect(seconds).toHaveAttribute('data-zoom','200');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(before);
 await timeline.getByText('보기 설정',{exact:true}).click();await timeline.getByRole('checkbox',{name:'두 손가락으로 확대·축소',exact:true}).uncheck();await timeline.getByText('보기 설정',{exact:true}).click();
 const box=(await seconds.boundingBox())!,session=await page.context().newCDPSession(page),y=box.y+Math.min(70,box.height-12),x=box.x+180;
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:x-30,y},{id:2,x:x+30,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:x-60,y},{id:2,x:x+60,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
 await expect(seconds).toHaveAttribute('data-zoom','200');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(before);
});
