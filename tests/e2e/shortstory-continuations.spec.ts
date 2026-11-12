import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {confirmAuthoringImport} from './authoring-file';
import {openShortStoryDetails} from './shortstory-navigation';

const catalog=JSON.parse(readFileSync('packages/asset-registry/src/catalog.json','utf8')) as {id:string;displayName:string;src:string}[];
const series=[
 ['인형극', ['rabbit-puppet-stage','rabbit-puppet-plan','rabbit-puppet-rebuild','rabbit-puppet-show','rabbit-puppet-invite','rabbit-puppet-lesson','rabbit-puppet-children']],
 ['떡 만들기 대회', ['heungbu-ricecake-contest','heungbu-ricecake-restart','heungbu-ricecake-advice','heungbu-ricecake-sharing','heungbu-ricecake-shortage','heungbu-ricecake-combine','heungbu-ricecake-joint-stall']],
 ['떠내려가는 뗏목', ['seonnyeo-drifting-raft','seonnyeo-raft-rope','seonnyeo-raft-pull','seonnyeo-raft-unload','seonnyeo-raft-route','seonnyeo-raft-cart','seonnyeo-raft-delivery']],
 ['찢어진 북', ['onggojib-torn-drum','onggojib-drum-ideas','onggojib-drum-practice','onggojib-drum-festival','onggojib-drum-newcomer','onggojib-drum-coach','onggojib-drum-parade']],
] as const;

for(const width of [390,1440])for(const [title,slugs] of series)test(`ShortStory ${title} keeps ${slugs.length} illustrated pages through reload and file import ${width}`,async({page,browser})=>{
 const images=slugs.map(slug=>{
  const id=`shortstory.background.creative-${slug}-v1`;
  const asset=catalog.find(item=>item.id===id);
  expect(asset,id).toBeDefined();
  return asset!;
 });
 const texts=images.map((_,index)=>`${index+1}번째 장면에서 이어 쓰는 나의 ${title} 이야기.`);
 await page.setViewportSize({width,height:900});
 await page.goto('/shortstory?mode=library');
 await page.getByRole('button',{name:'새 그림책',exact:true}).click();
 await page.getByLabel('이야기 제목',{exact:true}).fill(`나의 ${title} ${images.length}장면`);
 const writing=page.getByRole('region',{name:'숏스토리 쓰기',exact:true});
 for(const [index,asset] of images.entries()){
  if(index>0)await writing.getByRole('button',{name:'현재 쪽 뒤에 빈 쪽 추가',exact:true}).click();
  await writing.getByRole('button',{name:'삽화 고르기',exact:true}).click();
  const picker=page.getByRole('dialog',{name:'삽화 고르기',exact:true});
  await picker.getByRole('button',{name:'자유 창작',exact:true}).click();
  await picker.getByRole('checkbox',{name:'새로운 사건만 보기'}).check();
  await picker.getByLabel('이어지는 사건').selectOption(images[0]!.id);
  await expect(picker.locator('[data-asset-id]')).toHaveCount(images.length);
  for(const [position,scene] of images.entries()){
   await expect(picker.locator('[data-asset-id]').nth(position)).toHaveAttribute('data-asset-id',scene.id);
  }
  await picker.getByRole('searchbox',{name:'삽화 검색'}).fill(asset.displayName);
  await picker.locator(`[data-asset-id="${asset.id}"]`).click();
  await writing.getByLabel('이 쪽 제목',{exact:true}).fill(`이어지는 장면 ${index+1}`);
  await writing.getByLabel('이 쪽의 이야기',{exact:true}).fill(texts[index]!);
 }
 await page.reload();
 await expect(writing.getByLabel('이 쪽의 이야기',{exact:true})).toHaveValue(texts.at(-1)!);
 await openShortStoryDetails(page,'파일 교환·보관');
 const downloading=page.waitForEvent('download');
 await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
 const path=await (await downloading).path();
 expect(path).toBeTruthy();
 const bytes=await readFile(path!);
 const exported=JSON.parse(bytes.toString()).project;
 expect(exported.pages.map((item:{order:number;backgroundId:string;text:string})=>({order:item.order,backgroundId:item.backgroundId,text:item.text})))
  .toEqual(images.map((asset,index)=>({order:index+1,backgroundId:asset.id,text:texts[index]})));
 const context=await browser.newContext({viewport:{width,height:900}});
 try{
  const imported=await context.newPage();
  await imported.goto(new URL('/shortstory?mode=library',page.url()).href);
  await imported.getByLabel('숏스토리 파일 가져오기',{exact:true}).setInputFiles({name:'continuation.shortstory',mimeType:'application/json',buffer:bytes});
  await confirmAuthoringImport(imported);
  await imported.getByRole('button',{name:'읽기',exact:true}).click();
  const reading=imported.getByRole('region',{name:'숏스토리 읽기',exact:true});
  for(const [index,asset] of images.entries()){
   await expect(reading).toContainText(texts[index]!);
   const picture=reading.getByRole('img',{name:`${index+1}쪽 삽화`,exact:true}).locator('img');
   await expect(picture).toHaveAttribute('src',asset.src);
   await expect.poll(()=>picture.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
   if(index<images.length-1)await reading.getByRole('button',{name:'다음 쪽',exact:true}).click();
  }
  expect(await imported.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{
  await context.close();
 }
});
