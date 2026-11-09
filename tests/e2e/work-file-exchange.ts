import type {Page} from '@playwright/test';

/** Opens the editor settings menu and its folded 파일 교환·보관 도구 so export/import actions are reachable. */
export async function openWorkFileExchange(page:Page){
 const work=page.locator('[data-work-menu]');
 if(!await work.evaluate(node=>(node as HTMLDetailsElement).open))await work.locator(':scope>summary').click();
 const summary=page.getByText('파일 교환·보관 도구',{exact:true});
 if(!await summary.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await summary.click();
}
