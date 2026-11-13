/** Due dates are whole days in Korea time: a task is due at the very end of the chosen date. */
const KST=9*60*60*1000,DAY=24*60*60*1000;
export function dueAtFromDate(value:string):number|null{
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);if(!match)return null;
 const [y,m,d]=[Number(match[1]),Number(match[2]),Number(match[3])];
 const start=Date.UTC(y,m-1,d)-KST;if(Number.isNaN(start)||new Date(start+KST).getUTCDate()!==d)return null;
 return start+DAY-1;
}
export function dateFromDueAt(dueAt:number|null|undefined):string{
 if(dueAt===null||dueAt===undefined)return '';
 const day=new Date(dueAt+KST);return `${day.getUTCFullYear()}-${String(day.getUTCMonth()+1).padStart(2,'0')}-${String(day.getUTCDate()).padStart(2,'0')}`;
}
export type DueState=Readonly<{label:string;tone:'late'|'today'|'soon'|'later';days:number}>;
/** "D-3", "오늘 마감", "마감 지남" — counted in calendar days, Korea time. */
export function dueState(dueAt:number|null|undefined,now=Date.now()):DueState|null{
 if(dueAt===null||dueAt===undefined)return null;
 const dayOf=(time:number)=>Math.floor((time+KST)/DAY),days=dayOf(dueAt)-dayOf(now);
 if(now>dueAt)return {label:'마감 지남',tone:'late',days};
 if(days===0)return {label:'오늘 마감',tone:'today',days};
 return {label:`D-${days}`,tone:days<=3?'soon':'later',days};
}
export function dueDateLabel(dueAt:number){const day=new Date(dueAt+KST);return `${day.getUTCMonth()+1}월 ${day.getUTCDate()}일까지`;}
