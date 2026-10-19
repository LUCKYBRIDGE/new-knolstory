import {expect,it} from 'vitest';
import {getRepresentativeStory} from '../src/index';
import {exportProjectTables,readProjectTables} from '../src/authoring-workbook/project';
it('preserves project scalar fields, absent arrays and explicit source provenance through reordered columns',()=>{
 const p=getRepresentativeStory('rabbit').project;
 const source={...p,stageDefaults:{backgroundId:'bg',leftAssetId:'l',rightAssetId:'r'},continuation:{chapterId:p.chapters[0].id,lineId:p.lines[0].id,label:'계속'},characters:[],source:{kind:'baseEdition' as const,baseStoryId:'rabbit',baseEditionId:'one',linearSetup:true as const,linearCreation:{mode:'rewrite' as const,sourceStartChoiceLineId:'origin',writingStartLineId:p.lines[0].id,prefixLineIds:['before'],choices:[{lineId:'origin',optionId:'a',label:'원작 선택'}],sourceRevision:'001'}}};
 const t=exportProjectTables(source);const result=readProjectTables(t);
 expect({...result,planning:source.planning,creativeMemos:source.creativeMemos,cover:source.cover}).toEqual({...source,lines:source.lines.map(({flow:_f,ending:_e,stageComposition:_s,audio:_a,presentation:_p,...line})=>line),chapters:source.chapters.map(({audio:_a,...chapter})=>chapter)});
 const moved=Object.fromEntries(Object.entries(t).map(([k,v])=>[k,{headers:[...v.headers].reverse(),rows:v.rows.map(row=>[...row].reverse())}]));expect(readProjectTables(moved)).toEqual(result);
});
it('applies new chapter and cut, text edits and rejects dangling owners and duplicate IDs',()=>{
 const p=getRepresentativeStory('rabbit').project,t=structuredClone(exportProjectTables(p)) as Record<string,{headers:string[];rows:string[][]}>;
 const ch=[...t.chapters.rows[0]],cut=[...t.cuts.rows[0]];
 ch[t.chapters.headers.indexOf('id')]='new-ch';ch[t.chapters.headers.indexOf('position')]='99';
 cut[t.cuts.headers.indexOf('id')]='new-cut';cut[t.cuts.headers.indexOf('chapterId')]='new-ch';cut[t.cuts.headers.indexOf('position')]='999';cut[t.cuts.headers.indexOf('text')]='001 한글\n😀';
 t.chapters.rows.push(ch);t.cuts.rows.push(cut);expect(readProjectTables(t).lines.at(-1)?.text).toBe('001 한글\n😀');
 cut[t.cuts.headers.indexOf('chapterId')]='missing';expect(()=>readProjectTables(t)).toThrow(/장/);cut[t.cuts.headers.indexOf('chapterId')]='new-ch';t.cuts.rows.push(cut);expect(()=>readProjectTables(t)).toThrow(/중복/);
});
it('round-trips all source variants, absent source and speaker list optionality without JSON cells',()=>{
 const base=getRepresentativeStory('rabbit').project;
 const variants=[undefined,{kind:'blank' as const},{kind:'baseEdition' as const,baseStoryId:'rabbit',baseEditionId:'base'},{kind:'publication' as const,publicationId:'pub',originalTitle:'001',originalAuthorDisplayName:'글쓴이',originalFingerprint:'hash'},{kind:'sharedFile' as const,originalTitle:'제목',originalAuthorDisplayName:'',originalFingerprint:'hash'}];
 for(const provenance of variants){
  const p={...base,source:provenance,characters:undefined,lines:base.lines.map((l,i)=>({...l,workingTitle:i===0?'':undefined,inheritActors:i===0?false:undefined,coSpeakerNames:i===0?[]:i===1?['같이','둘']:undefined,backgroundMode:i===0?'none' as const:undefined}))};
  const t=exportProjectTables(p),r=readProjectTables(t);expect(r.source).toEqual(provenance);expect(r.characters).toBeUndefined();expect(r.lines[0]).toMatchObject({workingTitle:'',inheritActors:false,coSpeakerNames:[],backgroundMode:'none'});expect(r.lines[1].coSpeakerNames).toEqual(['같이','둘']);expect(r.lines[2].coSpeakerNames).toBeUndefined();
  expect(Object.values(t).flatMap(v=>v.headers)).not.toContain('payload');
 }
});
it('rejects invalid source kind fields, continuation and orphan lists',()=>{
 const base=getRepresentativeStory('rabbit').project;
 const t=structuredClone(exportProjectTables({...base,source:{kind:'blank'}})) as Record<string,{headers:string[];rows:string[][]}>;
 t.source.rows[0][t.source.headers.indexOf('originalTitle')]='stray';expect(()=>readProjectTables(t)).toThrow(/출처/);
 const bad=structuredClone(exportProjectTables(base)) as Record<string,{headers:string[];rows:string[][]}>;
 bad.projectLists.rows.push(['coSpeakerNames','missing','0','name']);expect(()=>readProjectTables(bad)).toThrow(/소유/);
});
