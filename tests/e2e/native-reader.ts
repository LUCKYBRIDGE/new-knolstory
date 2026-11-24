import {expect,type Page} from '@playwright/test';

export async function openEditorDetails(page:Page,label:string){
 const summary=page.getByText(label,{exact:true});
 if(!await summary.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await summary.click();
}
export async function startReading(page:Page){
 const settings=page.locator('[data-work-menu]');
 if(await settings.count()&&!await settings.evaluate(node=>(node as HTMLDetailsElement).open))await settings.locator(':scope>summary').click();
 await openEditorDetails(page,'보기 설정');
 await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();
}
export async function restartReading(page:Page){
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();
 await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();
 await page.getByRole('dialog',{name:'처음부터 읽을까요?',exact:true}).getByRole('button',{name:'처음부터 읽기',exact:true}).click();
}
export async function editReadCut(page:Page){
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();
 await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
}
export async function advanceReading(page:Page){
 const button=page.getByRole('button',{name:'다음으로',exact:true});
 await expect(button).toBeEnabled();await button.focus();await button.press('Enter');
}
export async function readerTools(page:Page){
 // A confirm transition card covers the stage and the quick bar steps aside until the reader presses on once (DOM 다음으로).
 const history=page.getByRole('button',{name:'지난기록',exact:true});
 if(!await history.waitFor({state:'visible',timeout:5000}).then(()=>true,()=>false)){
  const next=page.getByRole('button',{name:'다음으로',exact:true});await next.focus();await next.press('Enter');
 }
 await expect(history).toBeVisible({timeout:20_000});
}
export async function readerLibrary(page:Page){
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();
 await page.getByRole('button',{name:'서재로 돌아가기',exact:true}).click();
 await page.getByRole('dialog',{name:'서재로 돌아갈까요?',exact:true}).getByRole('button',{name:'보관하고 서재로',exact:true}).click();
}
export async function readerFullscreen(page:Page,exit=false){
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();
 await page.getByRole('button',{name:exit?'전체 화면 해제':'전체 화면',exact:true}).click();
}
/** Opens 저장 or 불러오기 the way a reader can right now: from the quick bar (its 설정 on phones), or — while a chapter
 * card covers the stage and the quick bar steps aside — from 읽기 메뉴. */
async function openSlotPanel(page:Page,label:'저장'|'불러오기'){
 const bar=page.locator('[data-reader-quick-bar]');
 await bar.waitFor({state:'visible',timeout:5000}).catch(()=>undefined);
 if(await bar.isVisible()){const settings=page.getByRole('button',{name:'설정',exact:true});if(await settings.isVisible())await settings.click();await page.getByRole('button',{name:label,exact:true}).click();return;}
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.locator('[data-reader-top-menu]').getByRole('button',{name:label,exact:true}).click();
}
export async function saveReadSlot(page:Page,id:number){
 await openSlotPanel(page,'저장');
 await page.getByRole('button',{name:`${id}번 저장`,exact:true}).click();
 await expect(page.getByRole('dialog',{name:'저장',exact:true})).toContainText(`${id}번에 저장했어요.`);
}
export async function loadReadSlot(page:Page,id:number){
 await openSlotPanel(page,'불러오기');
 await page.getByRole('button',{name:`${id}번 불러오기`,exact:true}).click();
 await page.getByRole('dialog',{name:'이 기록을 불러올까요?',exact:true}).getByRole('button',{name:'확인',exact:true}).click();
}
