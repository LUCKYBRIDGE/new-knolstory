/** Display-only catalog operations; never rewrite or reorder saved projects. */
export function findLibraryBooks<T extends {project:{title:string;cover?:{author:string}}}>(works:readonly T[],query:string):T[]{
 const normalize=(value:string)=>value.normalize('NFC').replace(/\s+/g,' ').trim().toLocaleLowerCase('ko-KR');
 const needle=normalize(query);
 return works.filter(work=>normalize(`${work.project.title} ${work.project.cover?.author??''}`).includes(needle));
}
export function libraryPage<T>(works:readonly T[],requested:number,capacity:number){
 const size=Math.max(1,Math.floor(capacity)||1),pages=Math.max(1,Math.ceil(works.length/size));
 const page=Math.max(0,Math.min(pages-1,Math.floor(requested)||0));
 return {items:works.slice(page*size,(page+1)*size),page,pages};
}

export const LIBRARY_VIEW_KEY='knolstory-library-view-v1';
export function parseLibraryView(raw:string|null):{filter:string;query:string;pages:Record<string,number>}{
 const empty={filter:'all',query:'',pages:{}};
 try{
  const data=JSON.parse(raw??'null');
  if(data?.version!==1||!['all','original','example','own','imported'].includes(data.filter)||typeof data.query!=='string'||data.query.length>200)return empty;
  const pages:Record<string,number>=Object.fromEntries(Object.entries(data.pages??{}).filter(([key,page])=>['original','example','own','imported'].includes(key)&&typeof page==='number'&&Number.isSafeInteger(page)&&page>=0).map(([key,page])=>[key,Number(page)]));
  return {filter:data.filter,query:data.query,pages};
 }catch{return empty;}
}
