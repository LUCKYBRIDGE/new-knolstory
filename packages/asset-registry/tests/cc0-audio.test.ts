import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {AUDIO_CATALOG,searchAudioAssets,validateAudioMetadata} from '../src';
it('registers curated CC0 originals with Korean names, provider/author and matching source bytes',()=>{
 const record=JSON.parse(readFileSync('docs/architecture/evidence/cc0-audio/downloads.json','utf8'));
 const downloadIds=new Set(record.assets.map((r:{id:string})=>r.id));
 const entries=AUDIO_CATALOG.filter(a=>downloadIds.has(a.id));expect(entries).toHaveLength(21);
 for(const a of entries){expect(a.name).toMatch(/[가-힣]/);expect(a.origin?.license).toBe('CC0-1.0');expect(a.origin?.commercialUse).toBe('permitted');expect(a.origin?.author).toBeTruthy();expect(a.metadata?.originalName).toBeTruthy();expect(validateAudioMetadata(a.metadata)).toEqual(a.metadata);const bytes=readFileSync(`apps/web/public${a.src}`);expect(createHash('sha256').update(bytes).digest('hex')).toBe(record.assets.find((r:{id:string})=>r.id===a.id).sha256);expect(a.durationSeconds).toBeGreaterThan(0);}
 expect(searchAudioAssets(AUDIO_CATALOG,'sound','책','effect',{source:'Kenney',tags:['넘기기']}).map(a=>a.name)).toEqual(['책장넘기는소리1','책장넘기는소리2']);
 expect(searchAudioAssets(AUDIO_CATALOG,'music','','ambience',{source:'OpenGameArt',tags:['비']}).map(a=>a.name)).toEqual(['비소리1','비소리2','비소리3','비소리4']);
});
