/** Compare JSON content without treating object insertion order as authored data.
 * Array order and JSON's omission/null semantics remain unchanged. */
function contentFingerprint(value:unknown):string {
 return JSON.stringify(value,(_key,item:unknown)=>{
  if(!item||typeof item!=='object'||Array.isArray(item))return item;
  const fields=item as Record<string,unknown>;
  return Object.fromEntries(Object.keys(fields).sort().map(key=>[key,fields[key]]));
 });
}

/** File verification, browser recovery and unapplied input are distinct states. */
export function createWorkLeaveTracker(){
 const created=new Set<string>();
 const works=new Map<string,{current:string;verified?:string;draft:boolean}>();
 let active:string|undefined,writing=false,resourceRevision=0,savingRevision=0;
 let save:(()=>Promise<string>)|undefined;
 return {
  observe<T extends {id:string}>(work:T){
   const content=contentFingerprint(work),previous=works.get(work.id);
   works.set(work.id,{current:content,verified:previous?previous.verified:created.has(work.id)?undefined:content,draft:previous?.current===content?previous.draft:false});active=work.id;
  },
  created(id:string){created.add(id);},
  input(){const previous=active?works.get(active):undefined;if(previous&&active)works.set(active,{...previous,draft:true});},
  saving(value:boolean){writing=value;if(value)savingRevision=resourceRevision;},
  externalEdit(){resourceRevision++;const previous=active?works.get(active):undefined;if(active&&previous)works.set(active,{...previous,verified:undefined});},
  saved(text:string){
   const archive=JSON.parse(text),project=archive.document?.project??archive.project;
   if(!project||typeof project.id!=='string')return;
   const previous=works.get(project.id),content=contentFingerprint(project);
   if(previous)works.set(project.id,{...previous,verified:savingRevision===resourceRevision?content:undefined,draft:previous.current===content?false:previous.draft});
  },
  registerSave(handler:()=>Promise<string>){save=handler;return()=>{if(save===handler)save=undefined;};},
  saveCurrent(){return save?.()??Promise.resolve('unavailable');},
  hasRisk(){return writing||[...works.values()].some(work=>work.draft||work.current!==work.verified);},
 };
}
export type WorkLeaveTracker=ReturnType<typeof createWorkLeaveTracker>;
