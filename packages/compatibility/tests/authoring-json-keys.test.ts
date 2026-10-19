import {it,expect} from 'vitest';
import {blankAuthoringArchive} from '../src/authoring-workbook';
import {decodeAuthoringArchive} from '../src/authoring-archive';
it('rejects duplicate JSON authoring keys instead of silently overwriting earlier content',async()=>{
 const archive=await blankAuthoringArchive('shortstory');
 const text=JSON.stringify(archive).replace('"title":"','"title":"잃어버릴 제목","title":"');
 await expect(decodeAuthoringArchive(text)).rejects.toThrow(/중복.*title/);
});
it('rejects escaped duplicate keys while accepting repeated keys in separate objects',async()=>{
 const archive=await blankAuthoringArchive('shortstory');
 const text=JSON.stringify(archive).replace('"title":"','"title":"이전 제목","\\u0074itle":"');
 await expect(decodeAuthoringArchive(text)).rejects.toThrow(/중복.*title/);
 expect(await decodeAuthoringArchive(JSON.stringify(archive))).toEqual(archive);
});
