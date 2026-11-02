import {it,expect} from 'vitest';
import {representativeStories,classicStories} from '../src';
import {resolveAsset} from '../../asset-registry/src';
import {connectCatalogWeatherContinuity} from '../src/catalog-weather-continuity';
const rainyChapters=['1-v163','C1-v162','C1-A-v106','C1-B-v161'];
const day='seonnyeo.background.BG01-valley-day',storm='seonnyeo.background.BG02-valley-storm';
const secondStormChapters=['14-v52','14-v73','14-v84','14-v89','14-v122','14-v129','14-v142','14-v144'];
const eveningRoomChapters=['R1-v13','R1-v61','R1-v86','R1-v107'];
const moonChoices=['C4-v51-1','C4-v72-1','C4-v88-1','C4-v121-1','C4-v128-1','C4-v141-1'];
const moon='seonnyeo.background.BG03-valley-moon-gate',forest='seonnyeo.background.BG-forest-roots',room='seonnyeo.background.BG-room-night';
const expectedLater=new Map([
 ...secondStormChapters.map(chapter=>[chapter+'-1',storm] as const),
 ...secondStormChapters.flatMap(chapter=>Array.from({length:12},(_,i)=>[`${chapter}-${i+9}`,moon] as const)),
 ...moonChoices.map(id=>[id,moon] as const),
 ...eveningRoomChapters.flatMap(chapter=>Array.from({length:23},(_,i)=>[`${chapter}-${i+1}`,room] as const)),
]);
const source=()=>structuredClone(representativeStories.find(entry=>entry.id==='seonnyeo')!.project);
it('keeps both first-choice reactions in the ongoing storm across exactly31cuts',()=>{
 const original=source(),before=structuredClone(original),next=connectCatalogWeatherContinuity(original);
 const expected=before.lines.filter(line=>rainyChapters.includes(line.chapterId));
 expect(expected).toHaveLength(31);expect(expected.every(line=>line.backgroundId===day)).toBe(true);
 expect(next.lines.filter((line,i)=>line!==original.lines[i])).toHaveLength(233);
 for(const line of expected)expect(next.lines.find(item=>item.id===line.id)?.backgroundId,line.id).toBe(storm);
 expect(resolveAsset(storm)).toBeDefined();expect(resolveAsset(storm)?.metadata.containsCharacters).not.toBe(true);
 expect(original).toEqual(before);
});
it('changes only those background references and retains text,Flow,actors,audio,effects and later cottage scenes',()=>{
 const original=source(),next=connectCatalogWeatherContinuity(original);
 expect({...next,lines:next.lines.map((line,i)=>({...line,backgroundId:original.lines[i].backgroundId}))}).toEqual(original);
 for(const [i,line] of next.lines.entries())if(!rainyChapters.includes(line.chapterId)&&!expectedLater.has(line.id))expect(line).toBe(original.lines[i]);
 expect(connectCatalogWeatherContinuity(next)).toBe(next);
});
it('leaves other editions and independent personal works unchanged',()=>{
 for(const entry of [...representativeStories,...classicStories].filter(entry=>entry.id!=='seonnyeo'))expect(connectCatalogWeatherContinuity(entry.project)).toBe(entry.project);
 const personal={...source(),id:'personal-seonnyeo'};expect(connectCatalogWeatherContinuity(personal)).toBe(personal);
});
it('does not replace a deliberately different background even at a reviewed cut',()=>{
 const original=source(),target=original.lines.find(line=>rainyChapters.includes(line.chapterId))!;
 const edited={...original,lines:original.lines.map(line=>line.id===target.id?{...line,backgroundId:'seonnyeo.background.BG03-valley-moon-gate'}:line)};
 const next=connectCatalogWeatherContinuity(edited);expect(next.lines.find(line=>line.id===target.id)).toBe(edited.lines.find(line=>line.id===target.id));
});

it('separates second-storm night, following daylight, moonlit descent and evening indoors in all reviewed copies',()=>{
 const original=source(),next=connectCatalogWeatherContinuity(original);
 expect(expectedLater.size).toBe(202);
 for(const [id,backgroundId] of expectedLater){
  const before=original.lines.find(line=>line.id===id),after=next.lines.find(line=>line.id===id);
  expect(before,id).toBeDefined();expect(before!.backgroundId,id).toBe(id.startsWith('R1-')?'seonnyeo.background.BG09-room-day':forest);
  expect(after,id).toEqual({...before,backgroundId});
 }
 for(const chapter of secondStormChapters)for(let order=2;order<=8;order++){
  const id=`${chapter}-${order}`,before=original.lines.find(line=>line.id===id)!;
  expect(before.order).toBe(order);expect([forest,'seonnyeo.background.BG-roots-robe']).toContain(before.backgroundId);expect(next.lines.find(line=>line.id===id)).toBe(before);
 }
 for(const id of [storm,moon,room]){expect(resolveAsset(id)).toBeDefined();expect(resolveAsset(id)?.metadata.containsCharacters).not.toBe(true);}
});
it('guards reviewed later cuts against a different background or mismatched identity/order',()=>{
 const original=source(),id='14-v52-9',target=original.lines.find(line=>line.id===id)!;
 for(const patch of [{backgroundId:day},{order:8},{chapterId:'14-v73'}]){
  const changed={...target,...patch},edited={...original,lines:original.lines.map(line=>line.id===id?changed:line)};
  expect(connectCatalogWeatherContinuity(edited).lines.find(line=>line.id===id)).toBe(changed);
 }
});
