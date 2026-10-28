/** Host acknowledgement, presentation completion and Core reading status are all required. */
export function canAutoForward(state:Readonly<{manualEffectPending?:boolean;enabled:boolean;visible:boolean;blocked:boolean;ready:boolean;status:string;presentationKey:string}>):boolean{
 return !state.manualEffectPending&&state.enabled&&state.visible&&!state.blocked&&state.ready&&state.status==='reading'&&state.presentationKey.length>0;
}
export function autoForwardDelay(seconds:number):number{
 return Number.isFinite(seconds)?Math.min(30,Math.max(1,seconds))*1000:3000;
}
