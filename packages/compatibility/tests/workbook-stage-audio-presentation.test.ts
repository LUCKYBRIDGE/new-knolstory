import {expect,it} from 'vitest';
import {parseStoryDocument,type StoryProject} from '@knolstory/story-domain';
import raw from '../../../tests/fixtures/stories/rabbit.json';
import {exportStageTables,readStageTables} from '../src/authoring-workbook/stage';
import {exportAudioTables,readAudioTables} from '../src/authoring-workbook/audio';
import {exportPresentationTables,readPresentationTables} from '../src/authoring-workbook/presentation';
const loaded=parseStoryDocument(raw,{savedAt:"2026-10-09T00:00:00.000Z",appVersion:"test"});if(!loaded.ok)throw new Error(JSON.stringify(loaded.issues));
const base=loaded.document.project;
const project:StoryProject={...base,chapters:base.chapters.map((c,i)=>i?c:{...c,audio:{music:{action:'maintain'},sounds:[]}}),lines:base.lines.map((l,i)=>i?l:{...l,inheritActors:false,stageComposition:{leftActors:[{key:'hero',assetId:l.leftAssetId||'image',characterKey:'person',position:'center',positionOrder:1,placementPreset:'single-left',xAnchor:35,scaleMultiplier:1,facing:'original',baseDepth:1,depthOverride:0,motion:{type:'move',durationMs:300,delayMs:0,fromXAnchor:20}}],rightActors:[],speakerActorKeys:[],speakerActorKey:'hero'},audio:{music:{action:'play',assetId:'music',volume:0,loop:false,fadeInMs:0,fadeOutMs:100},ambience:{action:'stop',fadeOutMs:0},sounds:[{id:'s1',assetId:'sound',volume:0.3,delayMs:12}]},presentation:{clearFollowingEffects:false,backgroundFit:'contain',backgroundFocal:{x:0,y:1},effects:[{id:'fx',type:'shake',target:{kind:'actor',actorKey:'hero'},scope:'following',repeat:'loop',periodMs:500,intensity:'strong',trigger:'after-delay',delayMs:0}],look:{type:'flashback',intensity:'soft'},transition:{type:'fade-black',durationMs:0,mode:'confirm',cue:'시점',title:'제목',description:'본문\n다음',actionLabel:'계속'},actors:{left:{xAnchor:0,scaleMultiplier:1,facing:'right',opacity:0,emphasis:'dim',spectral:false},right:{}},presetOrigin:''}})};
it('roundtrips complete stage/audio/presentation values without mutation',()=>{for(const [write,read] of [[exportStageTables,readStageTables],[exportAudioTables,readAudioTables],[exportPresentationTables,readPresentationTables]] as const){expect(read(write(project),project)).toEqual(project);}});
it('rejects rows with nonexistent owners',()=>{for(const [write,read,key] of [[exportStageTables,readStageTables,'stageActors'],[exportAudioTables,readAudioTables,'audioSounds'],[exportPresentationTables,readPresentationTables,'presentationEffects']] as const){const tables=write(project);const table=tables[key];const rows=table.rows.map((row,i)=>i?row:row.map((v,j)=>table.headers[j]==='lineId'?'missing':v));expect(()=>read({...tables,[key]:{...table,rows}},project)).toThrow();}});
it('allows reordered rows and edits and preserves unrelated manuscript',()=>{for(const [write,read,key,column,value] of [[exportStageTables,readStageTables,'stageActors','xAnchor','40'],[exportAudioTables,readAudioTables,'audioSounds','volume','0.8'],[exportPresentationTables,readPresentationTables,'presentationEffects','intensity','soft']] as const){const tables=write(project);const table=tables[key];const rows=table.rows.map((row,i)=>i?row:row.map((v,j)=>table.headers[j]===column?value:v)).reverse();const edited=read({...tables,[key]:{...table,rows}},project);expect(edited.lines[0].text).toBe(project.lines[0].text);expect(edited).not.toEqual(project);}});
function change(tables:ReturnType<typeof exportStageTables>,key:string,index:number,patch:Record<string,string>){const t=tables[key];return {...tables,[key]:{...t,rows:t.rows.map((r,i)=>i!==index?r:r.map((v,j)=>patch[t.headers[j]]??v))}};}
it('authors an empty stage exit and empty audio/presentation objects, preserving explicit presence',()=>{
 const empty={...project,lines:project.lines.map((l,i)=>i?l:{...l,stageComposition:{leftActors:[],rightActors:[],speakerActorKeys:[]},audio:{sounds:[]},presentation:{effects:[],actors:{left:{},right:{}},clearFollowingEffects:false}})};
 expect(readStageTables(exportStageTables(empty),empty)).toEqual(empty);
 expect(readAudioTables(exportAudioTables(empty),empty)).toEqual(empty);
 expect(readPresentationTables(exportPresentationTables(empty),empty)).toEqual(empty);
});
it('adds and deletes ordered actors and sound cues through readable rows',()=>{
 const stageTables=exportStageTables(project),at=stageTables.stageActors;
 const second=at.rows[0].map((v,i)=>({key:'second',side:'right',order:'0',motionPresent:'false',motionType:'⟪미설정⟫',durationMs:'⟪미설정⟫',delayMs:'⟪미설정⟫',fromXAnchor:'⟪미설정⟫'} as Record<string,string>)[at.headers[i]]??v);
 const stageEdit=readStageTables({...stageTables,stageActors:{...at,rows:[second,...at.rows]}},project);
 expect(stageEdit.lines[0].stageComposition?.rightActors[0].key).toBe('second');
 const audioTables=exportAudioTables(project),st=audioTables.audioSounds;
 const newSound=st.rows[0].map((v,i)=>({id:'s2',order:'1',assetId:'new-sound'} as Record<string,string>)[st.headers[i]]??v);
 const audioEdit=readAudioTables({...audioTables,audioSounds:{...st,rows:[newSound,...st.rows]}},project);
 expect(audioEdit.lines[0].audio?.sounds?.map(c=>c.id)).toEqual(['s1','s2']);
 expect(readAudioTables({...audioTables,audioSounds:{...st,rows:[]}},project).lines[0].audio?.sounds).toEqual([]);
});
it('rejects duplicate actor and sound IDs, invalid numbers and contradictory absent flags',()=>{
 const stages=exportStageTables(project),at=stages.stageActors;
 const duplicate=at.rows[0].map((v,i)=>at.headers[i]==='order'?'1':v);
 expect(()=>readStageTables({...stages,stageActors:{...at,rows:[...at.rows,duplicate]}},project)).toThrow();
 expect(()=>readStageTables(change(stages,'stageActors',0,{xAnchor:'101'}),project)).toThrow();
 expect(()=>readStageTables(change(stages,'stages',0,{present:'false'}),project)).toThrow();
 const audio=exportAudioTables(project),st=audio.audioSounds;
 const duplicateSound=st.rows[0].map((v,i)=>st.headers[i]==='order'?'1':v);
 expect(()=>readAudioTables({...audio,audioSounds:{...st,rows:[...st.rows,duplicateSound]}},project)).toThrow();
 expect(()=>readAudioTables(change(audio,'audioSounds',0,{delayMs:'-1'}),project)).toThrow();
 expect(()=>readAudioTables(change(audio,'audioTracks',1,{action:'maintain'}),project)).toThrow();
 const presentation=exportPresentationTables(project);
 expect(()=>readPresentationTables(change(presentation,'presentations',0,{lookPresent:'false'}),project)).toThrow();
 expect(()=>readPresentationTables(change(presentation,'presentationEffects',0,{periodMs:'399'}),project)).toThrow();
});
it('clears module data without discarding unrelated flow, original wording or other module data',()=>{
 const noStage={...project,lines:project.lines.map(({stageComposition:_old,...l})=>l)};
 const noAudio={...project,chapters:project.chapters.map(({audio:_old,...c})=>c),lines:project.lines.map(({audio:_old,...l})=>l)};
 const noPresentation={...project,lines:project.lines.map(({presentation:_old,...l})=>l)};
 expect(readStageTables(exportStageTables(noStage),project)).toEqual(noStage);
 expect(readAudioTables(exportAudioTables(noAudio),project)).toEqual(noAudio);
 expect(readPresentationTables(exportPresentationTables(noPresentation),project)).toEqual(noPresentation);
});
it('accepts column rearrangement and rejects missing scope rows and orphan data',()=>{
 for(const [write,read] of [[exportStageTables,readStageTables],[exportAudioTables,readAudioTables],[exportPresentationTables,readPresentationTables]] as const){const tables=write(project);const rearranged=Object.fromEntries(Object.entries(tables).map(([k,t])=>[k,{headers:[...t.headers].reverse(),rows:t.rows.map(r=>[...r].reverse())}]));expect(read(rearranged,project)).toEqual(project);const key=Object.keys(tables)[0];expect(()=>read({...tables,[key]:{...tables[key],rows:[]}},project)).toThrow();}
});
it('adds ordered effects and removes one while preserving authored transition wording',()=>{
 const tables=exportPresentationTables(project),t=tables.presentationEffects;
 const second=t.rows[0].map((v,i)=>({id:'second-effect',order:'1',type:'flash',targetKind:'screen',actorKey:'⟪미설정⟫'} as Record<string,string>)[t.headers[i]]??v);
 const edited=readPresentationTables({...tables,presentationEffects:{...t,rows:[second,...t.rows]}},project);
 expect(edited.lines[0].presentation?.effects?.map(e=>e.id)).toEqual(['fx','second-effect']);
 const removed=readPresentationTables({...tables,presentationEffects:{...t,rows:[]}},project);
 expect(removed.lines[0].presentation?.effects).toEqual([]);
 expect(removed.lines[0].presentation?.transition?.description).toBe('본문\n다음');
});
it('authors fresh stage audio and presentation objects using empty exports as templates',()=>{
 const empty={...base,lines:base.lines.map(({stageComposition:_stage,audio:_audio,presentation:_p,...l})=>l)};
 const stage=exportStageTables(empty);const changedStage=change(stage,'stages',0,{present:'true',speakerKeysPresent:'true'});
 expect(readStageTables(changedStage,empty).lines[0].stageComposition).toEqual({leftActors:[],rightActors:[],speakerActorKeys:[]});
 const audio=exportAudioTables(empty),lineIndex=empty.chapters.length;
 expect(readAudioTables(change(audio,'audio',lineIndex,{present:'true',soundsPresent:'true'}),empty).lines[0].audio).toEqual({sounds:[]});
 const presentation=exportPresentationTables(empty);
 expect(readPresentationTables(change(presentation,'presentations',0,{present:'true',effectsPresent:'true',actorsPresent:'true',leftPresent:'true'}),empty).lines[0].presentation).toEqual({effects:[],actors:{left:{}}});
});
