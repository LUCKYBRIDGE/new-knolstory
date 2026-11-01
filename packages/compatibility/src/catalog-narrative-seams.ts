import type {StoryProject} from '@knolstory/story-domain';
const corrected=new Set([
 'review-main-003:real-loop-testimony:17',
 'review-main-003:real-loop-testimony-cruelty-labor-first__work-promised__wage-wet-wood__shoe-poverty:17',
 'review-main-003:real-loop-testimony-cruelty-drive-away__work-no-food__wage-too-slow__shoe-crawl:17',
]);
/** Exact catalog resolver only: replace a production choice label left in automatic narration. */
export function connectCatalogNarrativeSeams(project:StoryProject):StoryProject{
 if(project.id==='pinky-review-main-004')return {...project,lines:project.lines.map(line=>line.id==='E4-7-v36-1'&&line.text==='다음 저녁, 어제보다 조금 더 이지러진 달이 뜬다.'?{...line,text:'그날 저녁, 어젯밤보다 조금 더 이지러진 달이 뜬다.'}:line)};
 if(project.id!=='pinky-review-main-003')return project;
 return {...project,lines:project.lines.map(line=>corrected.has(line.id)&&line.type==='narration'&&line.text==='아이를 감싸 준 옹고집과 돌아간다'?{...line,text:'부인은 아이를 감싸 준 옹고집을 바라보았다.'}:line)};
}
