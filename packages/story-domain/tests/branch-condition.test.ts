import { describe, expect, it } from 'vitest';
import { createStoryDocument, parseStoryDocument, updateStoryLine, isStoryAudio, isStoryPresentation, isStoryBranchCondition } from '../src';
import { normalizeAndValidateStoryProject } from '../src/legacy/story-project-validation';
const branchCondition = {sourceLineId:'source',choiceId:'a'};
function project() {
  const p = normalizeAndValidateStoryProject({id:'story',title:'갈래',description:'',sheetUrl:'',sheetEditable:false,updatedAt:'',chapters:[{id:'chapter',order:1,title:'장',summary:''}],lines:['source','join','end'].map((id,i)=>({id,chapterId:'chapter',order:i+1,type:'narration',speaker:'narration',speakerName:'해설',text:'원고',leftAssetId:'',rightAssetId:'',backgroundId:'',stageComposition:{leftActors:[],rightActors:[]}}))}).project!;
  return {...p,lines:p.lines.map(l=>l.id==='source'?{...l,flow:{type:'choice' as const,options:[{id:'a',label:'첫 선택',targetLineId:'join'},{id:'b',label:'다른 선택',targetLineId:'join'}]}}:l)};
}
function document() {return createStoryDocument({project:project(),savedAt:'2026-10-14T00:00:00.000Z',appVersion:'test'});}
function conditionalProject() {
  const p=project();
  const audio={music:{action:'play' as const,assetId:'music',endLineId:'end',branchCondition},ambience:{action:'play' as const,assetId:'ambience',branchCondition},sounds:[{id:'sound',assetId:'sound',branchCondition}]};
  return {...p,chapters:p.chapters.map(c=>({...c,audio})),lines:p.lines.map(l=>l.id==='join'?{...l,audio,presentation:{effects:[{id:'fx',type:'shake' as const,scope:'following' as const,endLineId:'end',branchCondition}]}}:l)};
}
describe('branch condition domain contract',()=>{
  it('stores schema8 and preserves all cue locations without score or reachability requirements',()=>{
    const p=conditionalProject(); const loaded=parseStoryDocument({...document(),schemaVersion:8,project:p});
    expect(loaded.ok).toBe(true); if(loaded.ok){expect(loaded.document.schemaVersion).toBe(8);expect(loaded.document.project).toEqual(p);}
    expect(document().schemaVersion).toBe(8);
    expect(isStoryBranchCondition(branchCondition)).toBe(true);
  });
  it('migrates an unchanged schema7 project and rejects branch data declared under old versions',()=>{
    const d=document();for(const schemaVersion of [1,2,3,4,5,6,7]) {const loaded=parseStoryDocument({...d,schemaVersion});expect(loaded.ok).toBe(true);if(loaded.ok)expect(loaded.document.project).toEqual(d.project);}
    for(const schemaVersion of [1,2,3,4,5,6,7])expect(parseStoryDocument({...d,schemaVersion,project:conditionalProject()}).ok).toBe(false);
    expect(parseStoryDocument({...d,schemaVersion:9}).ok).toBe(false);
  });
  it('migrates all schema7 range/audio/presentation values without changing the complete project',()=>{
    const authored=conditionalProject();
    const withoutBranch = (value:unknown):unknown => Array.isArray(value) ? value.map(withoutBranch) : value && typeof value==='object' ? Object.fromEntries(Object.entries(value).filter(([key])=>key!=='branchCondition').map(([key,item])=>[key,withoutBranch(item)])) : value;
    const p=withoutBranch(authored);
    const loaded=parseStoryDocument({...document(),schemaVersion:7,project:p});
    expect(loaded.ok).toBe(true);if(loaded.ok)expect(loaded.document.project).toEqual(p);
    expect(authored.lines[1].presentation?.effects?.[0].branchCondition).toEqual(branchCondition);
  });
  it.each([null,'source',{},[],new String('source'),{sourceLineId:'source'},{sourceLineId:1,choiceId:'a'},{sourceLineId:new String('source'),choiceId:'a'},{sourceLineId:'x'.repeat(201),choiceId:'a'},{sourceLineId:'source',choiceId:' '},{sourceLineId:'source',choiceId:null},{sourceLineId:' ',choiceId:'a'},{sourceLineId:'source',choiceId:'x'.repeat(201)},{...branchCondition,extra:true}])('rejects malformed branch value %j',(invalid)=>{
    expect(isStoryBranchCondition(invalid)).toBe(false);
    expect(isStoryAudio({music:{action:'play',assetId:'music',branchCondition:invalid}})).toBe(false);
    expect(isStoryAudio({sounds:[{id:'sound',assetId:'sound',branchCondition:invalid}]})).toBe(false);
    expect(isStoryPresentation({effects:[{type:'shake',branchCondition:invalid}]})).toBe(false);
  });
  it('allows conditions only on play music and preserves cut effects',()=>{
    expect(isStoryAudio({music:{action:'stop',branchCondition}})).toBe(false);
    expect(isStoryAudio({ambience:{action:'maintain',branchCondition}})).toBe(false);
    expect(isStoryPresentation({effects:[{type:'shake',scope:'cut',branchCondition}]})).toBe(true);
  });
  it.each([{sourceLineId:'missing',choiceId:'a'},{sourceLineId:'join',choiceId:'a'},{sourceLineId:'source',choiceId:'missing'}])('rejects missing source choice or option %j',(invalid)=>{
    const p=conditionalProject();p.chapters[0].audio.sounds[0].branchCondition=invalid;
    expect(normalizeAndValidateStoryProject(p).issues.some(i=>i.code==='broken-reference')).toBe(true);
  });
  it('validates references in all six audio locations and effects without changing ending/range rules',()=>{
    const p=conditionalProject();
    const candidates=[
      {...p,lines:p.lines.map(l=>l.id==='source'?{...l,flow:undefined}:l)},
      {...p,lines:p.lines.filter(l=>l.id!=='source')},
    ];
    for(const candidate of candidates) {
      const issues=normalizeAndValidateStoryProject(candidate).issues.filter(i=>i.code==='broken-reference');
      for(const path of ['chapters[0].audio.music','chapters[0].audio.ambience','chapters[0].audio.sounds[0]','lines[1].audio.music','lines[1].audio.ambience','lines[1].audio.sounds[0]','lines[1].presentation.effects[0]']) {
        if(candidate.lines.length===p.lines.length)expect(issues.some(i=>i.path.includes(path))).toBe(true);
      }
      expect(issues.length).toBeGreaterThanOrEqual(7);
    }
    expect(normalizeAndValidateStoryProject({...p,lines:p.lines.filter(l=>l.id!=='end')}).issues.some(i=>i.message.includes('종료 컷'))).toBe(true);
  });
  it('rejects source/option removal while retaining label and destination edits',()=>{
    const p=conditionalProject();const d={...document(),schemaVersion:8,project:p};
    expect(()=>updateStoryLine(d as ReturnType<typeof document>,'source',{flow:{type:'goto',targetLineId:'join'}})).toThrow();
    const options=[{id:'other',label:'첫 선택',targetLineId:'join'},{id:'b',label:'다른 선택',targetLineId:'join'}];
    expect(()=>updateStoryLine(d as ReturnType<typeof document>,'source',{flow:{type:'choice',options}})).toThrow();
    const changed=updateStoryLine(d as ReturnType<typeof document>,'source',{flow:{type:'choice',options:[{id:'a',label:'고친 선택',targetLineId:null},{id:'b',label:'다른 선택',targetLineId:'end'}]}});
    expect(changed.project.lines[1].presentation?.effects?.[0].branchCondition).toEqual(branchCondition);
    expect(changed.project.chapters[0].audio).toEqual(p.chapters[0].audio);
  });
});
