import {expect,it} from 'vitest';
import {isRuntimeImagePath} from './index';

it('accepts only the two reviewed transparent replacements at the RenPy boundary',()=>{
 for(const file of ['heungbu-pleading','nolbu-working']){
  const path=`assets/characters/transparency-v2/${file}.webp`;
  expect(isRuntimeImagePath(path)).toBe(true);
  for(const invalid of [path+'?v=1','/'+path,'https://example.com/'+path,path.replace(file,'unknown'),path.replace(file,'../'+file),path.replace('.webp','.png')]){
   expect(isRuntimeImagePath(invalid),invalid).toBe(false);
  }
 }
});
