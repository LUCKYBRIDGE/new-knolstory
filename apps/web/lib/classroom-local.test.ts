import {it,expect} from 'vitest';
import {newShortStory} from '@knolstory/compatibility';
import {SHORTSTORY_LIBRARY_KEY,emptyShortStoryLibrary} from './shortstory-library';
import {listLocalWorks,localWorkSnapshot} from './classroom-local';

it('lists and snapshots active picture books without including deleted books',async()=>{
 const book={...newShortStory(),id:'book-1',title:'나의 그림책'};
 const library={...emptyShortStoryLibrary(),books:[book],deleted:[{...book,id:'old'}],activeId:book.id};
 const storage={getItem:(key:string)=>key===SHORTSTORY_LIBRARY_KEY?JSON.stringify(library):null};
 expect(listLocalWorks(storage)).toEqual([{key:'shortstory:book-1',title:'나의 그림책 · 숏스토리'}]);
 const snapshot=await localWorkSnapshot('shortstory:book-1',storage);
 expect(snapshot.content).toMatchObject({format:'shortstory',project:book});
 await expect(localWorkSnapshot('shortstory:old',storage)).rejects.toThrow();
});
