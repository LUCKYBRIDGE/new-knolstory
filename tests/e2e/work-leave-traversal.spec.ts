import {test,expect,type Page} from '@playwright/test';

async function editedHistory(page:Page,picker=false){
 if(picker)await page.addInitScript(()=>{
  let contents='';
  Object.assign(window,{showSaveFilePicker:async()=>({name:'traversal.shortstory',getFile:async()=>({text:async()=>contents}),createWritable:async()=>({write:async(text:string)=>{contents=text;},close:async()=>{},abort:async()=>{}})})});
 });
 await page.route('**/api/**',route=>route.abort());
 await page.goto('/shortstory');
 const field=page.getByRole('textbox',{name:'이 쪽의 이야기',exact:true});await expect(field).toBeVisible();
 await page.evaluate(()=>{
  history.replaceState({...history.state,guardEntry:'start'},'','/shortstory?guard=start');
  history.pushState({...history.state,guardEntry:'target'},'','/shortstory?guard=target');
  history.pushState({...history.state,guardEntry:'edited'},'','/shortstory?guard=edited');
 });
 await field.fill('뒤로가기 확인 뒤에도 보존하는 원고');
 return {field,length:await page.evaluate(()=>history.length)};
}

for(const action of ['저장하지 않고 이동','저장하고 이동'] as const)test(`confirmed browser traversal preserves history and subsequent protection: ${action}`,async({page})=>{
 const {field,length}=await editedHistory(page,action==='저장하고 이동');
 const dialog=page.getByRole('dialog',{name:'작업을 마치고 이동할까요?',exact:true});
 await page.evaluate(()=>history.back());await expect(dialog).toBeVisible();
 await dialog.getByRole('button',{name:'계속 편집하기',exact:true}).click();
 await expect(page).toHaveURL(/guard=edited/);await expect(field).toHaveValue('뒤로가기 확인 뒤에도 보존하는 원고');
 expect(await page.evaluate(()=>history.length)).toBe(length);
 await page.evaluate(()=>history.back());await expect(dialog).toBeVisible();
 if(action==='저장하지 않고 이동')await page.evaluate(()=>{
  const navigation=(window as unknown as {navigation:{traverseTo:(key:string)=>{finished:Promise<unknown>}}}).navigation,original=navigation.traverseTo.bind(navigation);
  Object.defineProperty(navigation,'traverseTo',{configurable:true,value:(key:string)=>({finished:new Promise(resolve=>Object.assign(window,{releaseGuardTraversal:()=>{void original(key).finished.then(resolve);}}))})});
 });
 await dialog.getByRole('button',{name:action,exact:true}).click();
 if(action==='저장하지 않고 이동'){
  await expect(dialog.getByRole('button',{name:'계속 편집하기',exact:true})).toBeDisabled();await page.keyboard.press('Escape');await expect(dialog).toBeVisible();
  await page.evaluate(()=>{(window as unknown as {releaseGuardTraversal:()=>void}).releaseGuardTraversal();delete (window as unknown as {navigation:{traverseTo?:unknown}}).navigation.traverseTo;});
 }

 await expect(page).toHaveURL(/guard=target/);await expect(dialog).toHaveCount(0);
 expect(await page.evaluate(()=>({length:history.length,entry:history.state.guardEntry}))).toEqual({length,entry:'target'});
 // A second edit must be protected after the first traversal has finished.
 await field.fill('뒤로간 뒤 새로 고친 원고');
 expect(await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;})).toBe(true);
 await page.evaluate(()=>history.back());await expect(dialog).toBeVisible();
 await expect(page).toHaveURL(/guard=target/);
 await dialog.getByRole('button',{name:'저장하지 않고 이동',exact:true}).click();
 await expect(page).toHaveURL(/guard=start/);expect(await page.evaluate(()=>history.length)).toBe(length);
});
