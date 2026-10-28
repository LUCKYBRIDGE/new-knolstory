import {it,expect} from 'vitest';
import {splitSoundCue} from './sound-split';
const cue={id:'s',assetId:'audio:sound:chime',volume:.4,sourceStartMs:200,sourceEndMs:1100,delayMs:300,branchCondition:{sourceLineId:'choice-source',choiceId:'exact-choice'}};
it('splits source ranges immutably while keeping identity, exact condition, order and cut schedule',()=>{
 const sounds=[{id:'before',assetId:'x'},cue,{id:'after',assetId:'y'}],before=structuredClone(sounds),result=splitSoundCue(sounds,'s',700,'right',1200);
 expect(result).toEqual([sounds[0],{...cue,sourceEndMs:700},{...cue,id:'right',sourceStartMs:700,delayMs:800},sounds[2]]);expect(sounds).toEqual(before);
});
it('preserves absent source bounds and first delay, allowing exact maximum right delay',()=>{
 const sound={id:'s',assetId:'x'};const result=splitSoundCue([sound],'s',10000,'r',12000);
 expect(result[0]).toEqual({...sound,sourceEndMs:10000});expect(result[1]).toEqual({...sound,id:'r',sourceStartMs:10000,delayMs:10000});expect(result[1]).not.toHaveProperty('sourceEndMs');
 expect(splitSoundCue([{...sound,sourceStartMs:200,sourceEndMs:500}],'s',300,'r')[1]).toMatchObject({sourceStartMs:300,sourceEndMs:500,delayMs:100});
});
it('rejects boundaries, unknown end, stale target, malformed input, capacity and identity conflicts',()=>{
 for(const time of [200,1100,NaN,Infinity,500.5,-1])expect(()=>splitSoundCue([cue],'s',time,'r',1200)).toThrow();
 for(const id of ['','s',' '.repeat(5),'a'.repeat(201)])expect(()=>splitSoundCue([cue],'s',700,id,1200)).toThrow();
 expect(()=>splitSoundCue([cue],'missing',700,'r',1200)).toThrow();expect(()=>splitSoundCue([{id:'s',assetId:'x'}],'s',700,'r')).toThrow(/사용 끝/);
 expect(()=>splitSoundCue([cue],'s',700,'r',900)).toThrow(/사용 구간/);
 expect(()=>splitSoundCue([{...cue,delayMs:9900}],'s',700,'r',1200)).toThrow(/10초/);
 expect(()=>splitSoundCue([cue,...[1,2,3].map(id=>({id:`s${id}`,assetId:'x'}))],'s',700,'r',1200)).toThrow(/4개/);
 expect(()=>splitSoundCue([{...cue,volume:2}],'s',700,'r',1200)).toThrow();
});
it('preserves both segments through work archive, workbook, xlsx, JSONB and Core scheduling',async()=>{
 const {getRepresentativeStory}=await import('../../../packages/compatibility/src');
 const {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot}=await import('../../../packages/compatibility/src/authoring-archive');
 const {exportAuthoringWorkbook,importAuthoringWorkbook}=await import('../../../packages/compatibility/src/authoring-workbook');
 const {exportAuthoringExcel,importAuthoringExcel}=await import('../../../packages/compatibility/src/authoring-workbook/excel');
 const {compileStoryAudio}=await import('../../../packages/runtime-core/src/audio');
 const original=getRepresentativeStory('rabbit'),sounds=splitSoundCue([{id:'original',assetId:'audio:sound:chime',delayMs:200,sourceStartMs:200,sourceEndMs:1100}],'original',800,'right',1200);
 const document={...original,project:{...original.project,lines:original.project.lines.map((line,index)=>index?line:{...line,audio:{sounds}})}};
 const archive=await createAuthoringArchive({format:'knolstory',document}),before=JSON.stringify(document);
 expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);
 expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
 expect(compileStoryAudio(document.project,document.project.lines[0].id,()=>({runtimePath:'assets/audio/chime.wav'})).sounds).toMatchObject([{id:'original',sourceStartMs:200,sourceEndMs:800,delayMs:200},{id:'right',sourceStartMs:800,sourceEndMs:1100,delayMs:800}]);expect(JSON.stringify(document)).toBe(before);
});
