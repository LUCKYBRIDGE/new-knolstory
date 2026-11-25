import {describe,expect,it} from 'vitest';
import {branchChapterNumbering,branchLetter,chapterLabel,chaptersInStoryOrder,type StoryProject} from '../src/index';

type Flow=Record<string,unknown>|undefined;
/** chapters: [id, stored order], each with one cut `${id}1` unless more are given; flows by cut id. */
function work(chapters:readonly [string,number][],flows:Record<string,Flow>={},extraCuts:Record<string,number>={}):StoryProject{
 return {id:'w',title:'갈래',chapters:chapters.map(([id,order])=>({id,order,title:id})),
  lines:chapters.flatMap(([id])=>Array.from({length:1+(extraCuts[id]??0)},(_,index)=>({id:`${id}${index+1}`,chapterId:id,order:index+1,text:id,...(flows[`${id}${index+1}`]?{flow:flows[`${id}${index+1}`]}:{})})))} as unknown as StoryProject;
}
const names=(project:StoryProject)=>{const {identities}=branchChapterNumbering(project);return Object.fromEntries([...identities].map(([id,identity])=>[id,`${identity.chapterNumber}${identity.branchLabel??''}`]));};
const choice=(...targets:string[])=>({type:'choice',options:targets.map((targetLineId,index)=>({id:`o${index}`,label:`길 ${index+1}`,targetLineId}))});
const go=(targetLineId:string|null)=>({type:'goto',targetLineId});

describe('branch chapter numbering',()=>{
 it('names the chapters after a choice by the choice, not by where they were stored (10장 → 11A / 11B)',()=>{
  // Stored as 1 2 3 4: the B way (‘x’) was written last, after the way that meets again.
  const project=work([['a',1],['b',2],['join',3],['x',4]],{a1:choice('b1','x1'),b1:go('join1'),join1:go(null),x1:go('join1')});
  expect(names(project)).toEqual({a:'1',b:'2A',x:'2B',join:'3'});
 });
 it('letters score rules in their order with the default way last (11A·11B·11C)',()=>{
  const cond={mode:'all',terms:[{scoreId:'s',operator:'gte',value:1}]};
  const project=work([['a',1],['high',2],['mid',3],['low',4]],{a1:{type:'goto',targetLineId:'low1',routes:[{id:'r1',condition:cond,targetLineId:'high1'},{id:'r2',condition:cond,targetLineId:'mid1'}]},high1:go(null),mid1:go(null)});
  expect(names(project)).toEqual({a:'1',high:'2A',mid:'2B',low:'2C'});
 });
 it('keeps a way’s letter along it, adds a letter for a branch inside it and keeps only shared letters where ways meet',()=>{
  const project=work([['a',1],['l',2],['l2',3],['la',4],['lb',5],['lmeet',6],['r',7],['end',8]],{
   a1:choice('l1','r1'),l1:go('l21'),l21:choice('la1','lb1'),la1:go('lmeet1'),lb1:go('lmeet1'),lmeet1:go('end1'),r1:go('end1')});
  expect(names(project)).toEqual({a:'1',l:'2A',l2:'3A',la:'4AA',lb:'4AB',lmeet:'5A',r:'2B',end:'6'});
 });
 it('lets a shorter way skip numbers before ways meet, ignores loops back and leaves unreachable chapters out',()=>{
  const project=work([['a',1],['long',2],['long2',3],['short',4],['meet',5],['lost',6]],{a1:choice('long1','short1'),long1:go('long21'),long21:go('meet1'),short1:go('meet1'),meet1:choice('a1','meet1')});
  const numbering=branchChapterNumbering(project);
  expect(names(project)).toEqual({a:'1',long:'2A',long2:'3A',short:'2B',meet:'4'});
  expect(numbering.reachable.has('lost')).toBe(false);
 });
 it('treats a branch point inside one chapter (both ways in the same chapter) as no chapter branch',()=>{
  const project=work([['a',1],['b',2]],{a1:choice('a2','a2'),a2:go('b1')},{a:1});
  expect(names(project)).toEqual({a:'1',b:'2'});
 });
 it('keeps storylines that never meet apart to their endings, and lists each storyline before the next',()=>{
  // Stored order mixes the two storylines; neither way comes back.
  const project=work([['fork',1],['sky',2],['land',3],['palace',4],['village',5],['trial',6],['partner',7],['alone',8],['pass',9],['fail',10]],{
   fork1:choice('sky1','land1'),sky1:go('palace1'),palace1:go('trial1'),trial1:choice('pass1','fail1'),pass1:go(null),fail1:go(null),
   land1:go('village1'),village1:choice('partner1','alone1'),partner1:go(null),alone1:go(null)});
  expect(names(project)).toEqual({fork:'1',sky:'2A',land:'2B',palace:'3A',village:'3B',trial:'4A',partner:'4BA',alone:'4BB',pass:'5AA',fail:'5AB'});
  expect(branchChapterNumbering(project).order).toEqual(['fork','sky','palace','trial','pass','fail','land','village','partner','alone']);
  expect(chaptersInStoryOrder(project).map(chapter=>chapter.id)).toEqual(['fork','sky','palace','trial','pass','fail','land','village','partner','alone']);
 });
 it('puts a chapter where ways meet after every way into it',()=>{
  const project=work([['a',1],['l',2],['r',3],['meet',4],['after',5]],{a1:choice('l1','r1'),l1:go('meet1'),r1:go('meet1'),meet1:choice('after1','a1'),after1:go(null)});
  expect(branchChapterNumbering(project).order).toEqual(['a','l','r','meet','after']);
 });
 it('labels read as 11A장 with the shared chapter label',()=>{
  expect(chapterLabel({order:9,title:'숲',chapterNumber:11,branchLabel:'AB'})).toBe('11장AB · 숲');
  expect(['A','Z','AA','AZ','BA'].map((_,index)=>branchLetter([0,25,26,51,52][index]!))).toEqual(['A','Z','AA','AZ','BA']);
 });
});
