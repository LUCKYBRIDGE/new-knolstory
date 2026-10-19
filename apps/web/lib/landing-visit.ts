import type {WorkspaceView} from './workspace-storage';
/** A device preference, never content or a migration of legacy storage. */
export const LANDING_VISIT_KEY='knolstory-landing-visit-v1';
export function loadLandingVisit(storage:Pick<Storage,'getItem'>):boolean{
 try{const data=JSON.parse(storage.getItem(LANDING_VISIT_KEY)??'null');return data?.visited===true&&data.version===1;}catch{return false;}
}
export function markLandingVisited(storage:Pick<Storage,'setItem'>):boolean{
 try{storage.setItem(LANDING_VISIT_KEY,JSON.stringify({visited:true,version:1}));return true;}catch{return false;}
}
/** Fresh entry introduces books; reload and explicit routes restore their intended screen. */
export function resolveEntryView(input:{visited:boolean;hasWorkspace:boolean;reload:boolean;storedView?:WorkspaceView;directEditor?:boolean;directLibrary?:boolean}):WorkspaceView{
 if(input.directEditor)return 'editor';
 if(input.directLibrary)return 'library';
 return input.reload&&input.storedView?input.storedView:'home';
}
