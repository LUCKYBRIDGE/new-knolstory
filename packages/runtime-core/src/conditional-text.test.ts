import {expect,it} from 'vitest';
import {createStoryDocument,parseStoryDocument,createStoryBranches,createStoryChoiceChapter,type StoryProject} from '@knolstory/story-domain';
import {createBlankStoryProject} from './authoring';
import {advancePlayback,backPlayback,compileStoryScene,createPlayback,restorePlayback,patchStoryLine} from './story-runtime';
import {duplicateStoryCut} from './editor-authoring';
import {splitStoryCut,mergeStoryCuts} from './manuscript-operations';
const condition={mode:'all' as const,terms:[{scoreId:'trust',operator:'gte' as const,value:1}]};
const variants=[{id:'high',text:'믿음의 말',condition},{id:'zero',text:'',condition:{mode:'any' as const,terms:[{scoreId:'trust',operator:'eq' as const,value:0},{scoreId:'trust',operator:'gte' as const,value:8}]}}];
function fixture():StoryProject {const p=createBlankStoryProject({id:'conditional',chapterId:'ch',lineId:'start'});return {...p,scores:[{id:'trust',name:'믿음',description:'',initial:0}],lines:[{...p.lines[0],text:'선택',flow:{type:'choice',options:[{id:'yes',label:'A',targetLineId:'end',effects:[{scoreId:'trust',operation:'add',value:2}]},{id:'no',label:'B',targetLineId:'end'}]}},{...p.lines[0],id:'end',order:2,text:'기본 글',textVariants:variants}]};}
const document=(p:StoryProject)=>createStoryDocument({project:p,savedAt:p.updatedAt,appVersion:'test'});
it('preserves schema8 variants and rejects malformed or dangling authored data',()=>{
 const p=fixture();expect(parseStoryDocument(document(p))).toMatchObject({ok:true,document:{project:{lines:[{}, {textVariants:variants}]}}});
 for(const textVariants of [null,{},[variants[0],variants[0]],Array.from({length:17},(_,i)=>({...variants[0],id:String(i)})),[{...variants[0],id:' '}],[{...variants[0],id:'a'.repeat(201)}],[{...variants[0],text:'a'.repeat(20001)}],[{...variants[0],extra:true}],[{...variants[0],condition:{mode:'all',terms:[]}}]])expect(parseStoryDocument(document({...p,lines:[p.lines[0],{...p.lines[1],textVariants}]} as StoryProject)).ok).toBe(false);
 expect(parseStoryDocument(document({...p,scores:[]})).ok).toBe(false);
 expect(()=>patchStoryLine(p,'end',{text:'changed'})).not.toThrow();
});
it('rejects variants in every older envelope and unversioned legacy input',()=>{const p=fixture();for(let version=1;version<=7;version++)expect(parseStoryDocument({...document(p),schemaVersion:version}).ok).toBe(false);expect(parseStoryDocument(p,{savedAt:p.updatedAt,appVersion:'test'}).ok).toBe(false);});
it('resolves first matching score text without changing fallback, derives restore and back state',()=>{
 const p=fixture(),before=structuredClone(p),start=createPlayback(p),high=advancePlayback(p,start,'yes'),low=advancePlayback(p,start,'no');
 const text=(state:typeof high)=>compileStoryScene(p,'end',1,{mode:'play',playbackState:state}).dialogue.text;
 expect(text(high)).toBe('믿음의 말');expect(text(low)).toBe('');expect(text(restorePlayback(p,JSON.parse(JSON.stringify(high))))).toBe('믿음의 말');
 expect(advancePlayback(p,backPlayback(p,high),'no')).toEqual(low);expect(compileStoryScene(p,'end',1,{mode:'edit'}).dialogue.text).toBe('기본 글');
 const unmatched={...p,lines:[p.lines[0],{...p.lines[1],textVariants:[variants[0]]}]};expect(compileStoryScene(unmatched,'end',1,{mode:'play'}).dialogue.text).toBe('기본 글');
 const first={...p,lines:[p.lines[0],{...p.lines[1],textVariants:[variants[0],{...variants[0],id:'also',text:'later'}]}]};expect(compileStoryScene(first,'end',1,{mode:'play',playbackState:high}).dialogue.text).toBe('믿음의 말');expect(p).toEqual(before);
 expect(()=>restorePlayback(p,{...high,choiceHistory:undefined})).toThrow();
});
it('preserves clone, refuses ambiguous manuscript split/merge and clears only blank new branch text',()=>{
 const p=fixture(),clone=duplicateStoryCut(p,'end','copy');expect(clone.lines.find(l=>l.id==='copy')?.textVariants).toEqual(variants);expect(clone.lines.find(l=>l.id==='copy')?.textVariants).not.toBe(p.lines[1].textVariants);
 expect(()=>splitStoryCut(p,'end','new',2)).toThrow(/조건/);const merge={...p,lines:[{...p.lines[1],id:'first',order:1},{...p.lines[1],id:'second',order:2}]};expect(()=>mergeStoryCuts(merge,'first','second')).toThrow(/조건/);
 let id=0;const branch=createStoryBranches({...p,lines:[p.lines[1]]},'end',2,()=>`new${id++}`);expect(branch.lines.find(l=>l.id==='end')?.textVariants).toEqual(variants);expect(branch.lines.filter(l=>l.id!=='end').every(l=>!l.textVariants)).toBe(true);
 const source={...p.lines[1],flow:{type:'choice' as const,options:[{id:'a',label:'A',targetLineId:''},{id:'b',label:'B',targetLineId:null}]}};const fresh=createStoryChoiceChapter({...p,lines:[source]},'end','a',()=>`new${id++}`);expect(fresh.line.textVariants).toBeUndefined();
});
it('evaluates AND and OR terms including zero, and keeps real text after perspective transition',()=>{
 const p=fixture();const line={...p.lines[1],speakerName:'시점 전환',text:'나의 시점',presentation:{transition:{type:'perspective-blackout' as const,title:'나의 시점',durationMs:400}},textVariants:[{id:'v',text:'실제 이야기',condition:{mode:'all' as const,terms:[{scoreId:'trust',operator:'eq' as const,value:0},{scoreId:'trust',operator:'lt' as const,value:1}]}}]};
 const scene=compileStoryScene({...p,lines:[p.lines[0],line]},'end',1,{mode:'play'});expect(scene.dialogue.text).toBe('실제 이야기');expect(scene.transitionOnly).toBeUndefined();
 expect(compileStoryScene({...p,lines:[p.lines[0],{...line,textVariants:[{...line.textVariants[0],condition:{...line.textVariants[0].condition,terms:[...line.textVariants[0].condition.terms,{scoreId:'trust',operator:'gt',value:1}]}}]}]},'end',1,{mode:'play'}).dialogue.text).toBe('나의 시점');
});

it('past script resolves text at each historical score rather than latest or base text',async()=>{const {playbackLog}=await import('./playback-history');const p=fixture(),high=advancePlayback(p,createPlayback(p),'yes'),low=advancePlayback(p,createPlayback(p),'no');expect(playbackLog(p,high,{lineId:'end',endOffset:99}).at(-1)?.text).toBe('믿음의 말');expect(playbackLog(p,low,{lineId:'end',endOffset:99}).at(-1)?.text).toBe('');});
