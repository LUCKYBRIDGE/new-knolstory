'use client';
import {useSyncExternalStore} from 'react';
import {INSTALL_PROMPT_EVENT} from './app-install-capture';

/**
 * Adding 놀스토리 to the home screen (2026-11-23): the app then opens without the address bar, so
 * phones get the whole screen without the browser's own fullscreen exit notice. Browsers that can
 * install from a button (Chrome, Edge, Samsung Internet) hand over a `beforeinstallprompt` event,
 * which the root layout keeps from page start; iPhone and iPad only add from the Share sheet.
 */
type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
declare global{interface Window{__knolInstallPrompt?:InstallPrompt|null}}
export type AppInstallWay='prompt'|'share'|null;

export {INSTALL_PROMPT_EVENT} from './app-install-capture';

export function runningAsApp(){
 if(typeof window==='undefined')return false;
 return ['fullscreen','standalone','minimal-ui'].some(mode=>window.matchMedia?.(`(display-mode: ${mode})`).matches)||(navigator as Navigator&{standalone?:boolean}).standalone===true;
}
function appleTouch(){return /iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
function currentWay():AppInstallWay{
 if(runningAsApp())return null;
 if(window.__knolInstallPrompt)return 'prompt';
 return appleTouch()?'share':null;
}
function subscribe(change:()=>void){addEventListener(INSTALL_PROMPT_EVENT,change);return()=>removeEventListener(INSTALL_PROMPT_EVENT,change);}
export function useAppInstall(){return useSyncExternalStore(subscribe,currentWay,()=>null);}
/** Shows the browser's own install question; resolves true when the person added the app. */
export async function promptAppInstall(){
 const prompt=window.__knolInstallPrompt;if(!prompt)return false;
 window.__knolInstallPrompt=null;dispatchEvent(new Event(INSTALL_PROMPT_EVENT));
 await prompt.prompt();
 return (await prompt.userChoice).outcome==='accepted';
}
