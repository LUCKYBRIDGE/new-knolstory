import type {StoryProject} from '@knolstory/story-domain';

// Reviewed catalog cues only. Do not infer perspective changes from arbitrary prose.
const onggojibCues:Readonly<Record<string,string>>={
 'review-main-003:start:0':'옹고집의 시점',
 'review-main-003:fake-route:0':'쫓겨난 옹고집의 시점',
 'review-main-003:fake-route-cruelty-labor-first__work-promised__wage-wet-wood__shoe-poverty:0':'쫓겨난 옹고집의 시점',
 'review-main-003:fake-route-cruelty-drive-away__work-no-food__wage-too-slow__shoe-crawl:0':'쫓겨난 옹고집의 시점',
};
/** Only the exact catalog resolver applies this additive presentation revision. */
export function connectCatalogPerspective(project:StoryProject):StoryProject{
 if(project.id!=='pinky-review-main-003')return project;
 return {...project,lines:project.lines.map(line=>{
  const title=onggojibCues[line.id];
  if(!title||line.text!==title||line.speakerName!=='시점 전환'||line.type!=='narration'||line.flow||line.ending||line.presentation?.transition)return line;
  return {...line,presentation:{...line.presentation,transition:{type:'perspective-blackout' as const,mode:'confirm' as const,durationMs:900,title,actionLabel:'계속 읽기'}}};
 })};
}
