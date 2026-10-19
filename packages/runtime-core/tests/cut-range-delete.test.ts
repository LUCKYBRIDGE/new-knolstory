import {it,expect} from 'vitest';
import {getRepresentativeStory} from '@knolstory/compatibility';
import {getStoryCutDeletionImpact,deleteStoryCut} from '../src';
it('reports surviving effect and cut/chapter sound endpoints and prevents destructive range expansion',()=>{
 const source=getRepresentativeStory('rabbit').project,id=source.lines[1].id;
 const project={...source,chapters:source.chapters.map((chapter,index)=>index===0?{...chapter,audio:{music:{action:'play' as const,assetId:'audio:music:forest',endLineId:id}}}:chapter),lines:source.lines.map((line,index)=>index===0?{...line,presentation:{effects:[{type:'shake' as const,scope:'following' as const,endLineId:id}]},audio:{ambience:{action:'play' as const,assetId:'audio:music:forest',endLineId:id}}}:line)};
 const impact=getStoryCutDeletionImpact(project,id);expect(impact.rangeEnds).toHaveLength(3);expect(impact.rangeEnds.map(item=>item.kind).sort()).toEqual(['ambience','effect','music']);expect(()=>deleteStoryCut(project,id)).toThrow('종료 컷');expect(project.lines).toHaveLength(source.lines.length);
});
it('does not block a range whose owner is itself removed, and counts conditional Flow links',()=>{
 const source=getRepresentativeStory('rabbit').project,id=source.lines[1].id;const project={...source,lines:source.lines.map((line,index)=>index===0?{...line,flow:{type:'goto' as const,targetLineId:null,routes:[{id:'route',condition:{mode:'all' as const,terms:[]},targetLineId:id}]}}:index===1?{...line,presentation:{effects:[{type:'shake' as const,scope:'following' as const,endLineId:id}]}}:line)};
 expect(getStoryCutDeletionImpact(project,id).rangeEnds).toEqual([]);expect(getStoryCutDeletionImpact(project,id).incomingLinks).toBe(1);
});
