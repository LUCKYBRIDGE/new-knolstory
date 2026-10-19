import {expect,type Page} from '@playwright/test';

export async function openEditorDetails(page:Page,label:string){
 const summary=page.getByText(label,{exact:true});
 if(!await summary.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await summary.click();
}
export async function startReading(page:Page){
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
 await expect(page.getByRole('button',{name:'지난기록',exact:true})).toBeVisible();
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
export async function saveReadSlot(page:Page,id:number){
 await readerTools(page);const settings=page.getByRole('button',{name:'설정',exact:true});if(await settings.isVisible())await settings.click();await page.getByRole('button',{name:'저장',exact:true}).click();
 await page.getByRole('button',{name:`${id}번 저장`,exact:true}).click();
 await expect(page.getByRole('dialog',{name:'저장',exact:true})).toContainText(`${id}번에 저장했습니다.`);
}
export async function loadReadSlot(page:Page,id:number){
 await readerTools(page);const settings=page.getByRole('button',{name:'설정',exact:true});if(await settings.isVisible())await settings.click();await page.getByRole('button',{name:'불러오기',exact:true}).click();
 await page.getByRole('button',{name:`${id}번 불러오기`,exact:true}).click();
 await page.getByRole('dialog',{name:'이 기록을 불러올까요?',exact:true}).getByRole('button',{name:'확인',exact:true}).click();
}
