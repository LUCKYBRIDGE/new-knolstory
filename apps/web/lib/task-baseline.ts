/** What a task copy held when the student started it, so "how much did I write" counts only the
 * student's own cuts or pages (new ones, or ones whose words changed), not the base story they copied.
 * Kept on this device next to the task binding; a copy started elsewhere simply counts everything. */
type Item=readonly [id:string,text:string];
const key=(accountId:string,taskId:string)=>`knolstory-class-task-base:${accountId}:${taskId}`;
function hash(text:string){let value=0x811c9dc5;for(let i=0;i<text.length;i++){value^=text.charCodeAt(i);value=Math.imul(value,0x01000193);}return (value>>>0).toString(36);}
export function saveTaskBaseline(accountId:string,taskId:string,items:readonly Item[],storage:Pick<Storage,'setItem'>=localStorage){
 try{storage.setItem(key(accountId,taskId),JSON.stringify(Object.fromEntries(items.map(([id,text])=>[id,hash(text.trim())]))));}catch{/* Counting falls back to the whole work. */}
}
export function readTaskBaseline(accountId:string,taskId:string,storage:Pick<Storage,'getItem'>=localStorage):ReadonlyMap<string,string>|null{
 try{const raw=storage.getItem(key(accountId,taskId));if(!raw)return null;const value=JSON.parse(raw);return value&&typeof value==='object'?new Map(Object.entries(value as Record<string,string>)):null;}catch{return null;}
}
/** Cuts or pages with words that the student added or changed, and their characters. */
export function writtenAmount(items:readonly Item[],baseline:ReadonlyMap<string,string>|null):{amount:number;chars:number}{
 let amount=0,chars=0;
 for(const [id,raw] of items){const text=raw.trim();if(!text)continue;if(baseline&&baseline.get(id)===hash(text))continue;amount++;chars+=[...text].length;}
 return {amount,chars};
}
/** The (id, words) pairs of a KnolStory project or ShortStory book. */
export function workItems(work:{lines?:readonly {id:string;text?:string}[];pages?:readonly {id:string;text:string}[]}):Item[]{
 return (work.pages??work.lines??[]).map(item=>[item.id,item.text??''] as const);
}
