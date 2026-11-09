import {expect,type Page} from '@playwright/test';
/** The editor "설정" menu now owns the 편집화면 choice and the optional-feature switches. */
async function openSettings(page:Page){
 const menu=page.locator('[data-work-menu]').first();
 if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();
 return menu;
}
async function closeSettings(page:Page){
 const menu=page.locator('[data-work-menu]').first();
 if(await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();
}
/** Turns on optional editing features ("인물", "음향", "연출", "선택지", "점수", "분기조건"). */
export async function enableEditing(page:Page,...features:string[]){
 const menu=await openSettings(page);
 const settings=menu.locator('details').filter({has:page.locator(':scope>summary',{hasText:'편집 설정'})}).first();
 if(!await settings.evaluate(node=>(node as HTMLDetailsElement).open))await settings.locator(':scope>summary').click();
 for(const feature of features)await menu.getByRole('checkbox',{name:`${feature} 편집 사용`,exact:true}).check();
 await closeSettings(page);
}
/** Chooses a 편집화면 such as "글 편집", "음향 편집" or "연출 편집" (enabling its optional feature first). */
export async function openEditingScreen(page:Page,label:string){
 const id=({'기본편집':'basic','글 편집':'text','배경 편집':'background','인물 편집':'characters','음향 편집':'audio','연출 편집':'direction','음향·연출 함께 편집':'audio-direction'} as Record<string,string>)[label];
 if(id&&await page.locator(`[data-screen="${id}"]`).count())return;
 const feature=({'인물 편집':'인물','음향 편집':'음향','연출 편집':'연출','음향·연출 함께 편집':'음향'} as Record<string,string>)[label];
 if(feature)await enableEditing(page,...(label==='음향·연출 함께 편집'?['음향','연출']:[feature]));
 const menu=await openSettings(page);
 await menu.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption({label});
 await expect(page.locator('[data-screen]').first()).toBeVisible();
}
/** Opens the folded "현재 컷의 선택지·분기조건 편집" panel (switching on 선택지 편집 first). */
export async function openChoiceEditing(page:Page,...extra:string[]){
 await enableEditing(page,'선택지',...extra);
 const panel=page.locator('details').filter({has:page.locator(':scope>summary',{hasText:/^현재 컷의 선택지·분기조건 편집/})}).first();
 if(!await panel.evaluate(node=>(node as HTMLDetailsElement).open))await panel.locator(':scope>summary').click();
 return panel;
}
/** Opens only the selected cut's folded "N컷 음향 수정" / "N컷 연출 수정" panel; other cuts' panels are closed so labels stay unique. */
/** The selected cut's article; phone layouts show only that article, without the "이 컷 선택" button. */
function currentCutArticle(page:Page){
 const articles=page.locator('article[aria-label$="컷 편집"]');
 return articles.filter({has:page.getByRole('button',{name:'이 컷 선택',pressed:true})}).or(articles.filter({hasNot:page.getByRole('button',{name:'이 컷 선택'})}));
}
export async function openCutPanel(page:Page,kind:'음향'|'연출'){
 const summary=new RegExp(`^\\d+컷 ${kind} 수정$`);
 const all=page.locator('details').filter({has:page.locator(':scope>summary',{hasText:summary})});
 const current=currentCutArticle(page).locator('details').filter({has:page.locator(':scope>summary',{hasText:summary})}).first();
 await expect(current).toBeVisible();
 for(const panel of await all.all())if(await panel.evaluate((node,mine)=>(node as HTMLDetailsElement).open&&node!==mine,await current.elementHandle()))await panel.locator(':scope>summary').click();
 if(!await current.evaluate(node=>(node as HTMLDetailsElement).open))await current.locator(':scope>summary').click();
 return current;
}
/** Old single-row tool names mapped onto the current 편집화면/panel model. */
export async function openEditingTool(page:Page,name:string){
 if(name==='선택지 편집')return openChoiceEditing(page);
 const screen=({'글 편집':'글 편집','배경·인물 편집':'배경 편집','연출 편집':'연출 편집','소리 편집':'음향 편집','음향 편집':'음향 편집'} as Record<string,string>)[name];
 if(!screen)throw new Error(`No current editing screen for ${name}`);
 await openEditingScreen(page,screen);
 if(screen==='음향 편집')await openCutPanel(page,'음향');
 if(screen==='연출 편집')await openCutPanel(page,'연출');
}
/** Opens the folded "현재 컷 상세·메모·정리" panel that holds the detailed 대사 / 해설 field. */
export async function openCurrentCutDetail(page:Page){
 const panel=page.locator('details').filter({has:page.locator(':scope>summary',{hasText:/^현재 컷 상세·메모·정리$/})}).first();
 if(!await panel.evaluate(node=>(node as HTMLDetailsElement).open))await panel.locator(':scope>summary').click();
 return panel;
}
/** The multi-cut editing screens repeat "이 컷부터 재생" on every cut; this is the selected cut's one. */
export function currentCutPlay(page:Page){
 return currentCutArticle(page).getByRole('button',{name:'이 컷부터 재생',exact:true});
}
