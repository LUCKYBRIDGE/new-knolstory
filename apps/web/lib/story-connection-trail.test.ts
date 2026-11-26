import {describe,expect,it} from 'vitest';
import type {StoryProject} from '@knolstory/story-domain';
import {analyzeStoryFlow} from '@knolstory/runtime-core';
import {connectionTrail,edgeWords,shortPlace} from './story-connection-trail';

const cond=(value:number)=>({mode:'all' as const,terms:[{scoreId:'courage',operator:'gte' as const,value}]});
const chapter=(id:string,order:number,title:string,chapterNumber:number,branchLabel?:string)=>({id,order,title,chapterNumber,...(branchLabel?{branchLabel}:{}),summary:'',purpose:'',mood:'',keyEvents:'',nextChapterIdea:'',storyStageKeys:[],characterAssetIds:[],backgroundAssetIds:[],backgroundId:'',leftAssetId:'',rightAssetId:''});
const line=(id:string,chapterId:string,order:number,text:string,extra:Record<string,unknown>={})=>({id,chapterId,order,text,type:'narration',speaker:'narration',...extra});
// 1장: 1 → 2(갈림길 강/숲) · 2장A: 3 → 4 → 6 · 2장B: 5 (용기 2점 이상이면 7, 아니면 6) · 3장: 6(합류, 갈림길: 돕기 7 / 혼자 8 / 되돌아가기 미지정) · 4장A 7 끝 · 4장B 8 끝
export const sample={id:'trail',title:'갈림길',scores:[{id:'courage',name:'용기',description:'',initial:0}],
 chapters:[chapter('ch1',1,'계곡',1),chapter('ch2',2,'강',2,'A'),chapter('ch3',3,'숲',2,'B'),chapter('ch4',4,'바위',3),chapter('ch5',5,'하늘',4,'A'),chapter('ch6',6,'산',4,'B')],
 lines:[
  line('c1','ch1',1,'길 앞에 섰다.'),
  line('c2','ch1',2,'물소리와 새소리가 들렸다.',{flow:{type:'choice',options:[{id:'river',label:'강 쪽으로 간다',targetLineId:'c3'},{id:'forest',label:'숲으로 들어간다',targetLineId:'c5'}]}}),
  line('c3','ch2',1,'날개옷이 떠내려왔다.'),
  line('c4','ch2',2,'바위로 향했다.',{flow:{type:'goto',targetLineId:'c6'}}),
  line('c5','ch3',1,'사슴이 길을 알려 주었다.',{flow:{type:'goto',targetLineId:'c6',routes:[{id:'brave',condition:cond(2),targetLineId:'c7'}]}}),
  line('c6','ch4',1,'두 길이 다시 만났다.',{flow:{type:'choice',options:[{id:'help',label:'선녀를 돕는다',targetLineId:'c7'},{id:'alone',label:'혼자 떠난다',targetLineId:'c8'},{id:'back',label:'되돌아간다',targetLineId:'',condition:cond(1)}]}}),
  line('c7','ch5',1,'함께 하늘로 올라갔다.',{ending:{endsStory:true,name:'하늘',description:''}}),
  line('c8','ch6',1,'홀로 산을 내려왔다.',{ending:{endsStory:true,name:'산',description:''}}),
 ]} as unknown as StoryProject;

describe('connection trail',()=>{
 const graph=analyzeStoryFlow(sample);
 it('reads a cut after a branch: the nearest branch point, the way that leads here, and the way on',()=>{
  const trail=connectionTrail(sample,graph,'c3')!;
  expect(trail.place).toBe('2장A 1컷');
  expect(trail.upstream.map(branch=>[branch.place,branch.routes.map(route=>[route.words.label,route.distance])])).toEqual([['1장 2컷',[['‘강 쪽으로 간다’',1]]]]);
  expect(trail.incoming).toEqual([]);
  expect(trail.outgoing.map(way=>[way.words.label,way.status,way.place])).toEqual([['순서대로','connected','2장A 2컷']]);
 });
 it('keeps every choice at a join apart, with its own destination, condition and missing target',()=>{
  const trail=connectionTrail(sample,graph,'c6')!;
  expect(trail.marks).toEqual(['갈림길','2갈래가 만나는 곳']);
  expect(trail.incoming.map(way=>[way.place,way.words.label])).toEqual([['2장A 2컷','이동'],['2장B 1컷','조건이 맞지 않으면']]);
  expect(trail.outgoing.map(way=>[way.mark,way.words.label,way.words.condition,way.status,way.place,way.ending])).toEqual([
   ['A','‘선녀를 돕는다’',undefined,'connected','4장A 1컷',true],
   ['B','‘혼자 떠난다’',undefined,'connected','4장B 1컷',true],
   ['C','‘되돌아간다’','용기 1점 이상일 때만','pending',undefined,undefined],
  ]);
  expect(trail.warning).toBe(true);
  // The nearest branch point is the score rule just before; both choices at 1장 2컷 stay separate ways with their own distance.
  expect(trail.upstream.map(branch=>[branch.place,branch.routes.map(route=>[route.words.label,route.distance])])).toEqual([
   ['2장B 1컷',[['조건이 맞지 않으면',1]]],['1장 2컷',[['‘강 쪽으로 간다’',3],['‘숲으로 들어간다’',2]]]]);
 });
 it('lists the ways into a cut reached by a score condition and by a choice as two ways',()=>{
  const trail=connectionTrail(sample,graph,'c7')!;
  expect(trail.marks).toEqual(['2갈래가 만나는 곳','이야기 끝']);
  expect(trail.incoming.map(way=>[way.place,way.words.label,way.words.condition])).toEqual([['2장B 1컷','점수 조건','용기 2점 이상일 때'],['3장 1컷','‘선녀를 돕는다’',undefined]]);
  expect(trail.outgoing.map(way=>way.status)).toEqual(['ending']);
 });
 it('describes rules without evaluating scores and never changes the work',()=>{
  const before=JSON.stringify(sample);
  for(const node of graph.nodes)connectionTrail(sample,graph,node.lineId);
  expect(JSON.stringify(sample)).toBe(before);
  const route=graph.edges.find(edge=>edge.routeId==='brave')!;
  expect(edgeWords(sample,route)).toEqual({label:'점수 조건',condition:'용기 2점 이상일 때'});
  expect(shortPlace({chapterLabel:'2장A · 강',order:3})).toBe('2장A 3컷');
  expect(connectionTrail(sample,graph,'missing')).toBeNull();
 });
});
