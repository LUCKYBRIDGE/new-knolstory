import {createStoryDocument,type StoryLine} from '@knolstory/story-domain';
import {completeStoryDocument} from './authoring-complete';
/** Two earlier choices meet at one shared cut, then accumulated trust selects an ending. */
export function scoreNarrativeDocument(){
 const base=completeStoryDocument(),first=base.project.lines[0],chapterId=first.chapterId;
 const line=(id:string,order:number,text:string):StoryLine=>({...first,id,chapterId,order,text,flow:undefined,ending:undefined,audio:undefined,presentation:undefined});
 const a=line('score-first',1,'처음 만난 이웃에게 어떤 선택을 할까요?');a.flow={type:'choice',options:[{id:'help',label:'이웃을 돕는다',targetLineId:'score-second',effects:[{scoreId:'trust',operation:'add',value:2}]},{id:'ignore',label:'그냥 지나간다',targetLineId:'score-second',effects:[{scoreId:'trust',operation:'set',value:0}]}]};
 const b=line('score-second',2,'다시 만난 이웃과 음식을 나눌까요?');b.flow={type:'choice',options:[{id:'share',label:'음식을 나눈다',targetLineId:'score-join',condition:{mode:'all',terms:[{scoreId:'trust',operator:'gte',value:2}]},effects:[{scoreId:'trust',operation:'add',value:2}]},{id:'keep',label:'음식을 혼자 보관한다',targetLineId:'score-join',effects:[{scoreId:'greed',operation:'add',value:1}]}]};
 const c=line('score-join',3,'모두 같은 마을에 도착했습니다. 앞선 선택이 다음 이야기를 바꿉니다.');c.flow={type:'goto',targetLineId:'score-alone',routes:[{id:'friends',condition:{mode:'all',terms:[{scoreId:'trust',operator:'gte',value:4},{scoreId:'greed',operator:'lte',value:0}]},targetLineId:'score-together'},{id:'maybe',condition:{mode:'any',terms:[{scoreId:'trust',operator:'gte',value:2},{scoreId:'greed',operator:'lt',value:0}]},targetLineId:'score-maybe'}]};
 const d=line('score-together',4,'이웃들이 도우러 왔습니다. 나눈 선택이 함께하는 결말을 만들었습니다.');d.ending={name:'함께하는 결말',description:'신뢰가 충분히 쌓였습니다.',endsStory:true};
 const e=line('score-alone',5,'이번에는 혼자 길을 찾습니다. 다음에는 다른 선택을 해 볼까요?');e.ending={name:'혼자 찾는 결말',description:'나눔을 선택하지 않았습니다.',endsStory:true};
 const f=line('score-maybe',6,'한 번의 도움을 기억한 이웃이 인사를 건넵니다.');f.ending={name:'다시 만나는 결말',description:'도움의 기억이 남았습니다.',endsStory:true};
 return createStoryDocument({project:{...base.project,id:'score-narrative-fixture',title:'선택이 쌓이는 마을 이야기',continuation:undefined,creativeMemos:[],chapters:base.project.chapters.map(chapter=>({...chapter,audio:undefined})),scores:[{id:'trust',name:'신뢰',description:'도움과 나눔으로 쌓이는 관계',initial:0},{id:'greed',name:'욕심',description:'독차지한 선택을 기억하는 수치',initial:0}],lines:[a,b,c,d,e,f]},savedAt:base.savedAt,appVersion:'knolstory-score-test'});
}
