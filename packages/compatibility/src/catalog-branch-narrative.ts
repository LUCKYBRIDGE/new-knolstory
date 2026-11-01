import type {StoryProject} from '@knolstory/story-domain';

const changes:Readonly<Record<string,Readonly<Record<string,readonly [string,string]>>>>={
 'heungbu-nolbu-nolstory':{
  'scene-7-13':[
   '흥부는 힘든 겨울에 손을 내밀어 준 이들을 먼저 찾아갔다.\n\n빌린 것은 갚았다. 품과 물건을 나눈 이들에게도 고마움을 전했다.\n\n어떤 겨울을 보냈든, 혼자 힘으로 여기까지 온 것은 아니었다.',
   '흥부는 힘든 겨울에 손을 내밀어 준 이들을 먼저 찾아갔다.\n\n빌린 것이 있으면 갚았다. 품과 물건을 나눈 이들에게도 고마움을 전했다.\n\n어떤 겨울을 보냈든, 혼자 힘으로 여기까지 온 것은 아니었다.',
  ],
 },
 'pinky-review-main-004':Object.fromEntries(['v30','v108'].flatMap(variant=>[
  [`E3-1-${variant}-7`,['“사흘 전에 찾았소.”','“이틀 전에 찾았소.”'] as const],
  [`E3-1-${variant}-8`,['“사흘?”','“이틀?”'] as const],
 ])),
 'pinky-review-main-002':{
  'review-main-002:palace:3':['이상하군.\n잔치라면 상부터 보여야 하고…','이상하군.\n반기는 사람이 하나도 없소.'],
  'review-main-002:palace:4':['병자를 만나러 왔다면 병자부터 보여야 하는 것 아니오?','용궁에서는 손님을 이렇게 맞는 것이오?'],
  'review-main-002:palace:15':['자라 선생.\n잔치 이야기를 했든…','자라 선생.'],
  'review-main-002:palace:16':['병든 이를 도와달라고 했든…','나를 이곳에 데려오면서…'],
 },
};
/** Apply only inside the exact-version catalog gate, after all earlier published revisions.
 * Common scenes must hold for every incoming choice; links and endings are not rearranged. */
export function connectCatalogBranchNarrative(project:StoryProject):StoryProject{
 const edits=changes[project.id];if(!edits)return project;
 return {...project,lines:project.lines.map(line=>{
  const edit=edits[line.id];return edit&&line.text===edit[0]?{...line,text:edit[1]}:line;
 })};
}
