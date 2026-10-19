import {test,expect} from '@playwright/test';
const id='22222222-2222-4222-8222-222222222222',account='11111111-1111-4111-8111-111111111111';
for(const format of ['knolstory','shortstory'] as const)for(const width of [1440,390])test(`${format} online trash cancel, response loss retry and same-record restore preserve device manuscript ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});let deletedAt:number|null=null,stateVersion=1,lose=true;const sent:{key:string|undefined;body:unknown}[]=[];
 const meta=()=>({recordId:id,revision:4,format,clientProjectId:'online-project',title:'온라인 원고',contentSha256:'a'.repeat(64),createdAt:1,updatedAt:1,stateVersion,deletedAt});
 await page.route('**/api/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.pathname.endsWith('/auth/config'))return route.fulfill({json:{success:true,data:{signupProvider:'kakao',providers:{kakao:false,google:false}}}});
  if(url.pathname.endsWith('/me'))return route.fulfill({json:{success:true,data:{accountId:account,csrf:'csrf'}}});
  if(url.pathname==='/api/v1/documents')return route.fulfill({json:{success:true,data:{documents:(url.searchParams.get('state')==='trash')===(deletedAt!==null)?[meta()]:[],nextCursor:null}}});
  if(url.pathname.endsWith('/trash')){
   sent.push({key:request.headers()['idempotency-key'],body:request.postDataJSON()});expect(request.headers()['x-csrf-token']).toBe('csrf');expect(request.headers()['x-knolstory-account-id']).toBe(account);
   deletedAt=100;stateVersion=2;if(lose){lose=false;return route.abort('failed');}
   return route.fulfill({json:{success:true,data:{...meta(),replayed:true}}});
  }
  if(url.pathname.endsWith('/restore')){expect(request.postDataJSON()).toEqual({payloadVersion:1,expectedRevision:4,expectedStateVersion:2});deletedAt=null;stateVersion=3;return route.fulfill({json:{success:true,data:{...meta(),replayed:false}}});}
  return route.fulfill({status:404,json:{success:false,error:{code:'NOT_FOUND'}}});
 });
 if(format==='knolstory'){await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');}else{await page.goto('/shortstory');await page.getByLabel('이 쪽의 이야기',{exact:true}).fill('휴지통과 별도로 보존할 그림책 원고');}
 const authored=()=>page.evaluate(format=>{if(format==='shortstory')return JSON.parse(localStorage.getItem('knolstory-shortstory-library-v1')!);const s=JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!);return {project:s.document.project,works:s.works};},format);const before=await authored();
 await page.locator('[data-online-works]>summary').click();const panel=page.getByRole('region',{name:'온라인 작품',exact:true});await panel.getByRole('button',{name:'목록 새로고침',exact:true}).click();
 await panel.getByRole('button',{name:'온라인 원고 · 온라인 휴지통으로 이동',exact:true}).click();const confirmation=panel.getByRole('group',{name:'온라인 휴지통 이동 확인',exact:true});await confirmation.getByRole('button',{name:'취소',exact:true}).click();expect(sent).toEqual([]);
 await panel.getByRole('button',{name:'온라인 원고 · 온라인 휴지통으로 이동',exact:true}).click();await confirmation.getByRole('button',{name:'확인하고 온라인 휴지통으로 이동',exact:true}).click();await expect(panel.getByRole('alert')).toBeVisible();
 await confirmation.getByRole('button',{name:'확인하고 온라인 휴지통으로 이동',exact:true}).click();await expect(panel.getByRole('status').filter({hasText:'이전에 보낸 요청의 처리를 확인했어요'})).toBeVisible();
 expect(sent).toHaveLength(2);expect(sent[1]).toEqual(sent[0]);
 await panel.getByRole('button',{name:'온라인 휴지통',exact:true}).click();await panel.getByRole('button',{name:'온라인 원고 · 온라인 작품 복구',exact:true}).click();await expect(panel.getByRole('status').filter({hasText:'같은 온라인 작품과 이력'})).toBeVisible();
 await panel.getByRole('button',{name:'업로드한 작품',exact:true}).click();await expect(panel.getByRole('button',{name:'온라인 원고 · 기기에 사본으로 열기',exact:true})).toBeVisible();expect(await authored()).toEqual(before);expect(stateVersion).toBe(3);
 await page.screenshot({path:info.outputPath('restored-local-preserved.png')});
});
