import {describe,expect,it} from 'vitest';
import {groupTodos} from './student-todo';
import type {Assignment} from './classroom-api';
import type {Mission} from './mission-api';
const task=(id:string,extra:Partial<Assignment>={}):Assignment=>({id,format:'knolstory',title:id,description:'',storyKey:null,open:true,createdAt:1,...extra});
const mission=(id:string,extra:Partial<Mission>={}):Mission=>({id,title:id,description:'',criteria:'',kind:'reading',storyKey:null,readingFormat:'original',questions:[],open:true,createdAt:1,...extra});
const progress=(extra:Partial<NonNullable<Mission['progress']>>)=>({answers:{},note:'',submittedAt:null,reviewStatus:null,feedback:'',reviewedAt:null,...extra});
describe('student todo',()=>{
 it('puts work to do first, then work waiting for the teacher, then finished work',()=>{
  const groups=groupTodos([task('write'),task('sent',{submittedAt:5}),task('closed',{open:false}),task('rewrite',{submittedAt:5,reviewStatus:'revise'}),task('done',{submittedAt:5,reviewStatus:'passed'})],
   [mission('read'),mission('revise',{progress:progress({submittedAt:3,reviewStatus:'revise'})}),mission('pending',{progress:progress({submittedAt:3})}),mission('passed',{progress:progress({submittedAt:3,reviewStatus:'passed'})})]);
  expect(groups.todo.map(e=>e.item.id).sort()).toEqual(['read','revise','rewrite','write']);
  expect(groups.waiting.map(e=>e.item.id).sort()).toEqual(['pending','sent']);
  expect(groups.done.map(e=>e.item.id).sort()).toEqual(['closed','done','passed']);
 });
 it('keeps past work out of the current year counts',()=>{
  const groups=groupTodos([task('지난 작품',{archived:true})],[mission('지난 활동',{archived:true})]);
  expect(groups.archived).toHaveLength(2);
  expect([...groups.todo,...groups.waiting,...groups.done]).toHaveLength(0);
 });
 it('orders by the nearest due date, undated last, newest first among equals',()=>{
  const groups=groupTodos([task('later',{dueAt:300}),task('none',{createdAt:9}),task('soon',{dueAt:100})],[mission('mid',{dueAt:200})]);
  expect(groups.todo.map(e=>e.item.id)).toEqual(['soon','mid','later','none']);
 });
 it('puts a later stage that waits for the teacher after what can be done now',()=>{
  const groups=groupTodos([task('stage',{dueAt:50,after:{id:'book',title:'그림책',passed:false}}),task('book',{format:'shortstory',dueAt:100}),task('open stage',{dueAt:200,after:{id:'x',title:'x',passed:true}})],[]);
  // A stage still waiting for the teacher's pass is not something to do yet: it has its own group after the rest.
  expect(groups.todo.map(e=>e.item.id)).toEqual(['book','open stage']);
  expect(groups.later.map(e=>e.item.id)).toEqual(['stage']);
 });
});
