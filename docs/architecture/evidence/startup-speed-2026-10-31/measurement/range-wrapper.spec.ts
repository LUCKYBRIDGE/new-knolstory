// Runs the repository's audio-range specs against a deployed origin (live-set project 'audio'):
// skips the mobile fullscreen offer and accepts leave prompts, which the local host project handles itself.
import {test} from '@playwright/test';
import '../../../../../tests/e2e/audio-source-range.spec';
import '../../../../../tests/e2e/audio-audition.spec';
test.beforeEach(async({page})=>{await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));page.on('dialog',dialog=>dialog.type()==='beforeunload'?dialog.accept():dialog.dismiss());});
