import {expect,type Page} from '@playwright/test';

/** Read the public Next archive or a previous Next document fixture for content assertions. */
export function parseAuthoringFile(text:string){
 const archive=JSON.parse(text);
 return archive.format==='knolstory'&&archive.formatVersion===2
  ? {...archive,...archive.document}
  : archive;
}

/** Exercise the validated preview and explicit user confirmation before applying an import. */
export async function confirmAuthoringImport(page:Page){
 const preview=page.getByRole('dialog',{name:'작품 가져오기 확인',exact:true});
 await expect(preview).toBeVisible();
 await preview.getByRole('button',{name:'내 사본으로 가져오기',exact:true}).click();
 await expect(preview).toHaveCount(0);
}

/** Reimporting an existing work deliberately creates a new identity; every other field must match. */
export function expectIndependentImportedProject(actual:{id:string},source:{id:string}){
 expect(actual.id).not.toBe(source.id);
 expect(actual).toEqual({...source,id:actual.id});
}

/** The editor settings menu keeps the file download button inside the collapsed "파일 교환·보관 도구" group; open it (idempotent). */
export async function openFileExchange(page:Page){
 const group=page.locator('[data-work-menu] [data-file-exchange]');
 if(!await group.evaluate(node=>(node as HTMLDetailsElement).open))await group.locator(':scope>summary').click();
}

/** Switch the editing screen from the settings menu, first enabling the optional feature it needs (characters, audio, direction). */
export async function selectEditingScreen(page:Page,screen:'basic'|'text'|'background'|'characters'|'audio'|'direction'|'audio-direction'){
 const menu=page.locator('[data-work-menu]');
 if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();
 const select=page.getByRole('combobox',{name:'편집화면 선택',exact:true});
 const features=screen==='audio-direction'?['audio','direction']:[screen];
 for(const [id,name] of [['characters','인물 편집 사용'],['audio','음향 편집 사용'],['direction','연출 편집 사용']] as const){
  if(!features.includes(id))continue;
  const box=page.getByRole('checkbox',{name,exact:true});
  if(!await box.isVisible())await menu.getByText('편집 설정',{exact:true}).click();
  await box.check();
 }
 await select.selectOption(screen);
}

/** Open the current cut's "N컷 음향/연출 수정" detail on the audio or direction editing screen and return that cut row. */
export async function openCutEditor(page:Page,screen:'audio'|'direction'){
 await selectEditingScreen(page,screen);
 const id=await page.getByLabel('현재 장과 컷 이동',{exact:true}).inputValue();
 const row=page.getByTestId(`editing-cut-${id}`);
 const summary=row.locator('summary').filter({hasText:screen==='audio'?/컷 음향 수정$/:/컷 연출 수정$/});
 if(!await summary.evaluate(node=>(node.parentElement as HTMLDetailsElement).open))await summary.click();
 return row;
}

/** The editing-screen row of the cut selected in "현재 장과 컷 이동" (audio and direction screens list one row per cut). */
export async function currentCutRow(page:Page){
 return page.getByTestId(`editing-cut-${await page.getByLabel('현재 장과 컷 이동',{exact:true}).inputValue()}`);
}
