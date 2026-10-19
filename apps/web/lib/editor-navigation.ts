/** Local author navigation only: never a Flow route or a reader playback path. */
export const MAX_EDITING_VISITS=32;
export function normalizeEditingPath(value:unknown,cutIds:readonly string[],fallback:string):readonly string[]{
 const valid=new Set(cutIds);
 const visits=Array.isArray(value)?value.filter((id):id is string=>typeof id==='string'&&valid.has(id)).slice(-MAX_EDITING_VISITS):[];
 return visits.length?visits:valid.has(fallback)?[fallback]:cutIds.slice(0,1);
}
export function visitEditingCut(path:unknown,id:string,cutIds:readonly string[],fallback:string):readonly string[]{
 const visits=normalizeEditingPath(path,cutIds,fallback);
 return !cutIds.includes(id)||visits.at(-1)===id?visits:[...visits,id].slice(-MAX_EDITING_VISITS);
}
export function returnToEditingVisit(path:unknown,index:number,cutIds:readonly string[],fallback:string):readonly string[]{
 const visits=normalizeEditingPath(path,cutIds,fallback);
 return Number.isInteger(index)&&index>=0&&index<visits.length?visits.slice(0,index+1):visits;
}
