import {describe,expect,it} from 'vitest';
import {createBlankStoryProject} from '../../../packages/runtime-core/src/authoring';
import {buildStoryCredits} from './story-credits';

const texts=(lines:readonly {text:string}[])=>lines.map(line=>line.text);

describe('closing credits',()=>{
 it('names the author, the speakers in order and credits pictures by their rights holder',()=>{
  const project=createBlankStoryProject({id:'p1',chapterId:'c1',lineId:'l1',title:'달빛 숲'});
  const first=project.lines[0]!;
  const lines=[{...first,id:'a',type:'dialogue' as const,speakerName:'토끼',backgroundId:'rabbit-turtle.background.rabbit-turtle-bg-palace'},{...first,id:'b',type:'dialogue' as const,speakerName:'자라',backgroundId:'my-own-photo'},{...first,id:'c',type:'dialogue' as const,speakerName:'토끼'},{...first,id:'d',type:'narration' as const,speakerName:'해설'}];
  const credits=buildStoryCredits({...project,cover:{...(project.cover??{}),author:'3학년 2반 하늘',authorNote:'읽어 줘서 고마워요.'} as NonNullable<typeof project.cover>,lines});
  expect(credits.title).toBe('달빛 숲');expect(credits.author).toBe('3학년 2반 하늘');expect(credits.note).toBe('읽어 줘서 고마워요.');
  expect(texts(credits.sections.find(section=>section.heading==='등장인물')!.lines)).toEqual(['토끼','자라']);
  const pictures=credits.sections.find(section=>section.heading==='그림')!.lines;
  expect(pictures.some(line=>/^기본 제공 그림 \d+점$/.test(line.text)&&/^© /.test(line.detail??''))).toBe(true);expect(texts(pictures)).toContain('직접 넣은 그림 1점');
 });
 it('prefers registered characters and leaves out empty sections',()=>{
  const project=createBlankStoryProject({id:'p2',chapterId:'c2',lineId:'l2',title:'빈 이야기'});
  const credits=buildStoryCredits({...project,characters:[{id:'c1',name:'흥부',role:'',description:'',defaultImageId:''}],lines:project.lines.map(line=>({...line,backgroundId:'',backgroundMode:'none' as const,speakerName:'놀부',type:'dialogue' as const}))});
  expect(credits.sections.map(section=>section.heading)).toEqual(['등장인물']);expect(texts(credits.sections[0]!.lines)).toEqual(['흥부']);
  expect(credits.endingCount).toBe(0);
 });
 it('credits music apart from sound effects, each once, and counts the named endings',()=>{
  const project=createBlankStoryProject({id:'p3',chapterId:'c3',lineId:'l3',title:'소리 이야기'});
  const first={...project.lines[0]!,backgroundId:'',backgroundMode:'none' as const};
  const music={action:'play' as const,assetId:'audio:music:forest',loop:true,volume:.3,fadeInMs:0,fadeOutMs:0};
  const lines=[
   {...first,id:'a',audio:{music,sounds:[{assetId:'audio:sound:chime',delayMs:0,volume:1}]}},
   {...first,id:'b',audio:{music,sounds:[{assetId:'audio:sound:chime',delayMs:0,volume:1},{assetId:'audio:custom:mine',delayMs:0,volume:1}]},ending:{name:'함께 사는 결말',description:'',endsStory:true}},
   {...first,id:'c',ending:{name:'홀로 떠나는 결말',description:'',endsStory:true}},
   {...first,id:'d',ending:{name:'함께 사는 결말',description:'',endsStory:true}},
   {...first,id:'e',ending:{name:'잠깐 쉬어 가기',description:'',endsStory:false}},
  ] as typeof project.lines;
  const credits=buildStoryCredits({...project,lines});
  expect(credits.sections.map(section=>section.heading)).toEqual(['음악','효과음','소리']);
  expect(texts(credits.sections[0]!.lines)).toEqual(['숲의 아침 · 잔잔한 배경음']);
  expect(texts(credits.sections[1]!.lines)).toEqual(['맑은 종소리']);
  expect(texts(credits.sections[2]!.lines)).toEqual(['직접 넣은 소리 1개']);
  expect(credits.endingCount).toBe(2);
 });
});
