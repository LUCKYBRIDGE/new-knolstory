import { decodeShortStory, parseShortStory, type ShortStoryProject } from '@knolstory/compatibility';
export const SHORTSTORY_LIBRARY_KEY='knolstory-shortstory-library-v1';
export const SHORTSTORY_LEGACY_KEY='knolstory-shortstory-workspace-v1';
export type ShortStoryLibrary={version:1;books:ShortStoryProject[];positions:Record<string,number>;deleted:ShortStoryProject[];activeId:string};
type Store=Pick<Storage,'getItem'|'setItem'>;
export const emptyShortStoryLibrary=():ShortStoryLibrary=>({version:1,books:[],positions:{},deleted:[],activeId:''});
export function parseShortStoryLibrary(raw:string):ShortStoryLibrary {
 const value=JSON.parse(raw);
 if(!value||value.version!==1||Object.keys(value).some(key=>!['version','books','positions','deleted','activeId'].includes(key))||!Array.isArray(value.books)||!Array.isArray(value.deleted)||typeof value.activeId!=='string'||!value.positions||typeof value.positions!=='object'||Array.isArray(value.positions))throw Error('그림책 보관함 형식을 확인해 주세요. 원본 저장은 그대로 보존해요.');
 const books=value.books.map(parseShortStory),deleted=value.deleted.map(parseShortStory),all=[...books,...deleted];
 const ids=all.map(book=>book.id);
 if(new Set(ids).size!==ids.length||ids.some(id=>id.startsWith('shortstory-original-'))||all.length>1000)throw Error('그림책 ID와 보관함 크기를 확인해 주세요.');
 const positions=Object.fromEntries(Object.entries(value.positions).map(([id,page])=>{if(!Number.isSafeInteger(page)||Number(page)<0)throw Error('읽기 위치를 확인해 주세요.');return [id,Number(page)];}));
 return {version:1,books,deleted,positions,activeId:value.activeId};
}
export function saveShortStoryLibrary(storage:Store,library:ShortStoryLibrary) {const raw=JSON.stringify(library);parseShortStoryLibrary(raw);storage.setItem(SHORTSTORY_LIBRARY_KEY,raw);}
/** Copy-and-backup migration confined to the Next namespace; legacy storygame/IDB stays untouched. */
export function loadShortStoryLibrary(storage:Store):ShortStoryLibrary {
 const raw=storage.getItem(SHORTSTORY_LIBRARY_KEY);if(raw!==null)return parseShortStoryLibrary(raw);
 const previous=storage.getItem(SHORTSTORY_LEGACY_KEY);if(previous===null)return emptyShortStoryLibrary();
 const project=decodeShortStory(previous),library=addShortStoryBook(emptyShortStoryLibrary(),project);
 if(storage.getItem(`${SHORTSTORY_LEGACY_KEY}-backup`)===null)storage.setItem(`${SHORTSTORY_LEGACY_KEY}-backup`,previous);
 saveShortStoryLibrary(storage,library);return library;
}
/** Duplicate IDs always create a fresh book; imports never replace an existing work. */
export function addShortStoryBook(library:ShortStoryLibrary,project:ShortStoryProject):ShortStoryLibrary {
 const duplicate=project.id.startsWith('shortstory-original-')||[...library.books,...library.deleted].some(book=>book.id===project.id);
 const next=parseShortStory({...project,id:duplicate?crypto.randomUUID():project.id});
 return {...library,books:[...library.books,next],activeId:next.id,positions:{...library.positions,[next.id]:0}};
}
export function copyShortStoryBook(library:ShortStoryLibrary,project:ShortStoryProject):ShortStoryLibrary {
 const provided=project.id.startsWith('shortstory-original-');
 let title=`${project.title} · 내 사본`;
 if(provided){
  const base=`[내작품] ${project.title}`;
  const occupied=new Set([...library.books,...library.deleted].map(book=>book.title.normalize('NFC')));
  title=base;
  for(let suffix=2;occupied.has(title.normalize('NFC'));suffix++)title=`${base} ${suffix}`;
 }
 const cover=provided?{backgroundId:'',characterId:'',authorNote:project.cover.authorNote}:project.cover;
 return addShortStoryBook(library,{...project,id:crypto.randomUUID(),title,cover,pages:project.pages.map(page=>({...page,id:crypto.randomUUID()})),updatedAt:new Date().toISOString()});
}
/** Three-way merge of every book, including unsaved imports and edits made before switching books.
 * A conflicting stored revision stays as a separate book; deletion never discards a concurrent edit. */
export function mergeShortStoryLibraries(mine:ShortStoryLibrary,stored:ShortStoryLibrary,base:ShortStoryLibrary|null,currentId:string):{library:ShortStoryLibrary;conflict:boolean}{
 const find=(library:ShortStoryLibrary|null,id:string)=>{
  const active=library?.books.find(book=>book.id===id);if(active)return {book:active,deleted:false};
  const removed=library?.deleted.find(book=>book.id===id);return removed?{book:removed,deleted:true}:undefined;
 };
 const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
 let library:ShortStoryLibrary={...stored,activeId:mine.activeId},conflict=false;
 for(const local of [...mine.books,...mine.deleted]){
  const mineEntry=find(mine,local.id)!,baseEntry=find(base,local.id),storedEntry=find(stored,local.id);
  if(same(mineEntry,baseEntry))continue;
  const collided=!!storedEntry&&!same(storedEntry,baseEntry)&&!same(storedEntry,mineEntry);
  const books=library.books.filter(book=>book.id!==local.id),deleted=library.deleted.filter(book=>book.id!==local.id);
  library={...library,books:mineEntry.deleted?books:[...books,local],deleted:mineEntry.deleted?[...deleted,local]:deleted,positions:{...library.positions,[local.id]:mine.positions[local.id]??0}};
  if(collided){
   conflict=true;const other=storedEntry.book;
   library={...addShortStoryBook(library,{...other,id:crypto.randomUUID(),title:`${other.title} · 다른 탭`,pages:other.pages.map(page=>({...page,id:crypto.randomUUID()}))}),activeId:mine.activeId};
  }
 }
 // Reading position belongs to this tab's current book even if its text did not change.
 if(mine.positions[currentId]!==undefined)library={...library,positions:{...library.positions,[currentId]:mine.positions[currentId]!}};
 return {library,conflict};
}
export function deleteShortStoryBook(library:ShortStoryLibrary,id:string):ShortStoryLibrary {
 const book=library.books.find(book=>book.id===id);if(!book)return library;
 return {...library,books:library.books.filter(book=>book.id!==id),deleted:[...library.deleted,book],activeId:library.activeId===id?'':library.activeId};
}
export function restoreShortStoryBook(library:ShortStoryLibrary,id:string):ShortStoryLibrary {
 const book=library.deleted.find(book=>book.id===id);if(!book)return library;
 return {...library,books:[...library.books,book],deleted:library.deleted.filter(book=>book.id!==id),activeId:id};
}
