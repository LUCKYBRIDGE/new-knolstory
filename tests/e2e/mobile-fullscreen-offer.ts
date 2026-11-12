import type {Page} from '@playwright/test';

/** The one-time phone fullscreen offer is a separate flow; tests that exercise other phone UI mark it as already shown. */
export async function suppressFullscreenOffer(page:Page){
 await page.addInitScript(()=>{try{sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');}catch{/* The offer is then simply allowed to appear. */}});
}
