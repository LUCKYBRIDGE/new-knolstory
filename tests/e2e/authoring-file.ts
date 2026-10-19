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
