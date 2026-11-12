/** Missions 놀스토리 offers for the four provided works. A teacher copies one, edits it freely and assigns the copy. */
import {BUILTIN_WORKS,type BuiltinWorkId} from './builtin-works';
import type {MissionDraft} from './mission-api';

export type ProvidedMission=Readonly<MissionDraft&{providedId:string;storyKey:BuiltinWorkId}>;
type WorkCopy=Readonly<{choice:string;otherPath:string;activityTitle:string;activity:string}>;

/** Per-work wording: the choice a character makes, a different turn of the plot, and a classroom activity. */
const copy:Record<BuiltinWorkId,WorkCopy>={
 rabbit:{
  choice:'토끼는 용궁에서 “간을 육지에 두고 왔다”고 말했어요. 토끼의 선택을 어떻게 생각하나요? 그렇게 생각한 까닭을 이야기 속 장면에서 찾아 써 보세요.',
  otherPath:'자라가 처음부터 토끼에게 사실대로 말했다면 이야기가 어떻게 달라졌을까요?',
  activityTitle:'토끼와 자라에게 편지 쓰기',
  activity:'토끼나 자라 가운데 한 인물을 골라 공책에 편지를 써요. 하고 싶은 말과 묻고 싶은 것을 함께 적어요. 다 쓰면 선생님께 보여 주세요.',
 },
 onggojib:{
  choice:'스님은 가짜 옹고집을 만들어 진짜 옹고집이 집에서 쫓겨나게 했어요. 스님의 방법을 어떻게 생각하나요? 그렇게 생각한 까닭을 이야기 속 장면에서 찾아 써 보세요.',
  otherPath:'옹고집이 처음부터 어머니와 이웃을 따뜻하게 대했다면 이야기가 어떻게 달라졌을까요?',
  activityTitle:'진짜 옹고집 찾기 역할놀이',
  activity:'모둠에서 진짜 옹고집, 가짜 옹고집, 가족 역할을 나누어 한 장면을 꾸며요. 누가 진짜인지 가리는 질문도 하나씩 준비해요.',
 },
 seonnyeo:{
  choice:'나무꾼은 사슴의 말을 듣고 선녀의 날개옷을 감췄어요. 나무꾼의 선택을 어떻게 생각하나요? 그렇게 생각한 까닭을 이야기 속 장면에서 찾아 써 보세요.',
  otherPath:'나무꾼이 날개옷을 감추지 않고 선녀에게 솔직하게 말을 걸었다면 이야기가 어떻게 달라졌을까요?',
  activityTitle:'뒷이야기 한 장면 그리기',
  activity:'이야기가 끝난 뒤 나무꾼과 선녀, 아이들이 어떻게 지냈을지 상상해 그림 한 장으로 그려요. 그림 아래에 한 줄 설명을 붙여요.',
 },
 heungbu:{
  choice:'놀부는 일부러 제비 다리를 부러뜨렸어요. 놀부의 선택을 어떻게 생각하나요? 흥부와 견주어 그렇게 생각한 까닭을 써 보세요.',
  otherPath:'흥부가 다친 제비를 그냥 지나쳤다면 이야기가 어떻게 달라졌을까요?',
  activityTitle:'내 박에서 나왔으면 하는 것 발표하기',
  activity:'내가 박을 탄다면 무엇이 나오면 좋을지, 그것을 누구와 나누고 싶은지 정해 친구들 앞에서 발표해요.',
 },
};

/** 별주부전 → 별주부전을, 흥부와 놀부 → 흥부와 놀부를. */
function object(title:string){const last=title.charCodeAt(title.length-1)-0xac00;return `${title}${last>=0&&last<=11171&&last%28===0?'를':'을'}`;}

export const PROVIDED_MISSIONS:readonly ProvidedMission[]=BUILTIN_WORKS.flatMap(work=>{
 const text=copy[work.id];
 return [
  {providedId:`${work.id}-reading`,kind:'reading' as const,storyKey:work.id,readingFormat:'original' as const,title:`${work.title} 끝까지 읽기`,
   description:`${object(work.title)} 처음부터 끝까지 읽어요. 다 읽으면 가장 기억에 남는 장면을 한 줄로 남겨 주세요.`,
   criteria:'끝까지 읽고, 기억에 남는 장면을 한 줄 넘게 남기면 통과예요.',questions:[]},
  {providedId:`${work.id}-worksheet`,kind:'worksheet' as const,storyKey:work.id,readingFormat:'original' as const,title:`${work.title} 독후 활동지`,
   description:`${object(work.title)} 읽고 세 가지 질문에 내 생각을 써요. 정답은 없어요. 생각한 까닭을 함께 쓰는 것이 중요해요.`,
   criteria:'세 질문에 모두 답하고, 생각한 까닭을 이야기 속 장면과 함께 쓰면 통과예요.',
   questions:[
    {id:'q1',prompt:'가장 기억에 남는 장면은 어디인가요? 그 장면이 왜 기억에 남았는지도 써 보세요.'},
    {id:'q2',prompt:text.choice},
    {id:'q3',prompt:text.otherPath},
   ]},
  {providedId:`${work.id}-activity`,kind:'custom' as const,storyKey:work.id,readingFormat:'original' as const,title:text.activityTitle,
   description:text.activity,criteria:'교실에서 선생님이 확인하면 통과예요. 온라인으로 낼 것은 없어요.',questions:[]},
 ];
});

/** A fresh, editable copy: the provided mission itself is never changed. */
export function copyProvidedMission(mission:ProvidedMission):MissionDraft{
 return {title:mission.title,description:mission.description,criteria:mission.criteria,kind:mission.kind,storyKey:mission.storyKey,readingFormat:mission.readingFormat,questions:mission.questions.map(question=>({...question}))};
}
