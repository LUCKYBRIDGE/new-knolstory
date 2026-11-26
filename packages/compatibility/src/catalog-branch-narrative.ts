import type {StoryProject} from '@knolstory/story-domain';
import {SEONNYEO_PROJECT_ID,seonnyeoPastTense} from './catalog-seonnyeo-tense';

/** Later branch-aware wording that replaces an earlier reader correction, keyed by work and cut. */
const branchNarrativeEdits:Readonly<Record<string,Readonly<Record<string,readonly [string,string]>>>>={
 'heungbu-nolbu-nolstory':{
  'scene-7-13':[
   '흥부는 힘든 겨울에 손을 내밀어 준 이들을 먼저 찾아갔다.\n\n빌린 것은 갚았다. 품과 물건을 나눈 이들에게도 고마움을 전했다.\n\n어떤 겨울을 보냈든, 혼자 힘으로 여기까지 온 것은 아니었다.',
   '흥부는 힘든 겨울에 손을 내밀어 준 이들을 먼저 찾아갔다.\n\n빌린 것이 있으면 갚았다. 품과 물건을 나눈 이들에게도 고마움을 전했다.\n\n어떤 겨울을 보냈든, 혼자 힘으로 여기까지 온 것은 아니었다.',
  ],
 },
 'pinky-review-main-004':{
  // 나무꾼's spoken worry, and the season order after the first snow of 7장.
  'H1-v71-6':['“선녀도 여기서 잘 살고 있다.\n옷을 보여줘 모든 걸 흔드는 게 더 나쁘지 않을까?”\n\n“……그걸 정할 사람은 내가 아니다.”','“선녀도 여기서 잘 살고 있다.\n옷을 보여 주어 모든 걸 흔드는 게 더 나쁘지 않을까?”\n\n“……그걸 정할 사람은 내가 아니다.”'],
  'H1-v120-6':['“선녀도 여기서 잘 살고 있다.\n옷을 보여줘 모든 걸 흔드는 게 더 나쁘지 않을까?”\n\n“……그걸 정할 사람은 내가 아니다.”','“선녀도 여기서 잘 살고 있다.\n옷을 보여 주어 모든 걸 흔드는 게 더 나쁘지 않을까?”\n\n“……그걸 정할 사람은 내가 아니다.”'],
  'H1-v127-6':['“선녀도 여기서 잘 살고 있다.\n옷을 보여줘 모든 걸 흔드는 게 더 나쁘지 않을까?”\n\n“……그걸 정할 사람은 내가 아니다.”','“선녀도 여기서 잘 살고 있다.\n옷을 보여 주어 모든 걸 흔드는 게 더 나쁘지 않을까?”\n\n“……그걸 정할 사람은 내가 아니다.”'],
  '8-v81-1':['가을이 깊어졌다. 둘의 생활도 조금씩 섞여들었다. 선녀는 마을 어귀에서 씨앗 고르는 법을 배웠다. 처마 밑에는 작은 주머니들을 말렸다.','늦가을 바람이 차가워졌다. 둘의 생활도 조금씩 섞여들었다. 선녀는 마을 어귀에서 씨앗 고르는 법을 배웠다. 처마 밑에는 작은 주머니들을 말렸다.'],
  '8-v97-1':['가을이 깊어졌다. 둘의 생활도 조금씩 섞여들었다. 선녀는 마을 어귀에서 씨앗 고르는 법을 배웠다. 처마 밑에는 작은 주머니들을 말렸다.','늦가을 바람이 차가워졌다. 둘의 생활도 조금씩 섞여들었다. 선녀는 마을 어귀에서 씨앗 고르는 법을 배웠다. 처마 밑에는 작은 주머니들을 말렸다.'],
  '8-v137-1':['가을이 깊어졌다. 둘의 생활도 조금씩 섞여들었다. 선녀는 마을 어귀에서 씨앗 고르는 법을 배웠다. 처마 밑에는 작은 주머니들을 말렸다.','늦가을 바람이 차가워졌다. 둘의 생활도 조금씩 섞여들었다. 선녀는 마을 어귀에서 씨앗 고르는 법을 배웠다. 처마 밑에는 작은 주머니들을 말렸다.'],
  '8-v152-1':['가을이 깊어졌다. 둘의 생활도 조금씩 섞여들었다. 선녀는 마을 어귀에서 씨앗 고르는 법을 배웠다. 처마 밑에는 작은 주머니들을 말렸다.','늦가을 바람이 차가워졌다. 둘의 생활도 조금씩 섞여들었다. 선녀는 마을 어귀에서 씨앗 고르는 법을 배웠다. 처마 밑에는 작은 주머니들을 말렸다.'],
  '13-v76-1':['가을 어느 날, 기러기 떼가 하늘을 지나간다. 선녀는 바구니를 든 채 오래 바라본다.','늦가을 어느 날, 기러기 떼가 하늘을 지나간다. 선녀는 바구니를 든 채 오래 바라본다.'],
  '13-v92-1':['가을 어느 날, 기러기 떼가 하늘을 지나간다. 선녀는 바구니를 든 채 오래 바라본다.','늦가을 어느 날, 기러기 떼가 하늘을 지나간다. 선녀는 바구니를 든 채 오래 바라본다.'],
  '13-v132-1':['가을 어느 날, 기러기 떼가 하늘을 지나간다. 선녀는 바구니를 든 채 오래 바라본다.','늦가을 어느 날, 기러기 떼가 하늘을 지나간다. 선녀는 바구니를 든 채 오래 바라본다.'],
  '13-v147-1':['가을 어느 날, 기러기 떼가 하늘을 지나간다. 선녀는 바구니를 든 채 오래 바라본다.','늦가을 어느 날, 기러기 떼가 하늘을 지나간다. 선녀는 바구니를 든 채 오래 바라본다.'],
  ...Object.fromEntries(['v30','v108'].flatMap(variant=>[
  [`E3-1-${variant}-7`,['“사흘 전에 찾았소.”','“이틀 전에 찾았소.”'] as const],
  [`E3-1-${variant}-8`,['“사흘?”','“이틀?”'] as const],
 ])),
 },
 'pinky-review-main-002':{
  // Reached from both the feast invitation and the sick-friend plea; only the first promised a feast.
  'review-main-002:palace:1':['하지만 안에는 잔치 음식도, 반갑게 맞는 신하들도 없었다.','하지만 안에는 손님을 맞을 준비도, 반갑게 맞는 신하들도 없었다.'],
  'review-main-002:shoreAfterShield:37':['토끼는 숲속으로 사라졌다.\n용왕은 아직\n나를 기다리고 있을 것이다.','토끼는 숲속으로 사라졌다.\n용왕님은 아직 나를 기다리고 있을 것이다.'],
  'review-main-002:palace:3':['이상하군.\n잔치라면 상부터 보여야 하고…','이상하군.\n반기는 사람이 하나도 없소.'],
  'review-main-002:palace:4':['병자를 만나러 왔다면 병자부터 보여야 하는 것 아니오?','용궁에서는 손님을 이렇게 맞는 것이오?'],
  'review-main-002:palace:15':['자라 선생.\n잔치 이야기를 했든…','자라 선생.'],
  'review-main-002:palace:16':['병든 이를 도와달라고 했든…','나를 이곳에 데려오면서…'],
 },
};
/** Apply only inside the exact-version catalog gate, after all earlier published revisions.
 * Common scenes must hold for every incoming choice; links and endings are not rearranged. */
/** The edits as readers see them: 선녀's narration also goes into the past tense (`catalog-seonnyeo-tense`). */
export const catalogBranchNarrativeChanges:Readonly<Record<string,Readonly<Record<string,readonly [string,string]>>>>=Object.fromEntries(Object.entries(branchNarrativeEdits).map(([work,edits])=>[work,
 work===SEONNYEO_PROJECT_ID?Object.fromEntries(Object.entries(edits).map(([id,[from,to]])=>[id,[from,seonnyeoPastTense(to)] as const])):edits]));
export function connectCatalogBranchNarrative(project:StoryProject):StoryProject{
 const edits=catalogBranchNarrativeChanges[project.id],tense=project.id===SEONNYEO_PROJECT_ID;
 if(!edits&&!tense)return project;
 return {...project,lines:project.lines.map(line=>{
  const edit=edits?.[line.id],text=edit&&line.text===edit[0]?edit[1]:line.text;
  const next=tense?seonnyeoPastTense(text):text;
  return next===line.text?line:{...line,text:next};
 })};
}
