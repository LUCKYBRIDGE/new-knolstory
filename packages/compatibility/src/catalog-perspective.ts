import type {StoryProject} from '@knolstory/story-domain';

// Reviewed catalog cues only. Do not infer perspective changes from arbitrary prose.
const onggojibCues:Readonly<Record<string,string>>={
 'review-main-003:start:0':'옹고집의 시점',
 'review-main-003:fake-route:0':'쫓겨난 옹고집의 시점',
 'review-main-003:fake-route-cruelty-labor-first__work-promised__wage-wet-wood__shoe-poverty:0':'쫓겨난 옹고집의 시점',
 'review-main-003:fake-route-cruelty-drive-away__work-no-food__wage-too-slow__shoe-crawl:0':'쫓겨난 옹고집의 시점',
};
// Reviewed source cuts whose own perspective card asked for a button ('부인의 시점으로 계속').
const onggojibSourceConfirmCues=new Set([
 'review-main-003:part1-court-cruelty-labor-first__work-promised__wage-wet-wood__shoe-poverty:30',
 'review-main-003:part1-court-cruelty-drive-away__work-no-food__wage-too-slow__shoe-crawl:31',
]);
function connect(project:StoryProject,confirm:boolean):StoryProject{
 if(project.id!=='pinky-review-main-003')return project;
 return {...project,lines:project.lines.map(line=>{
  const own=line.presentation?.transition;
  if(!confirm&&own&&onggojibSourceConfirmCues.has(line.id)&&own.type==='perspective-blackout'&&own.mode==='confirm'){
   const {actionLabel:_button,...rest}=own;
   return {...line,presentation:{...line.presentation,transition:{...rest,mode:'auto' as const,durationMs:1800}}};
  }
  const title=onggojibCues[line.id];
  if(!title||line.text!==title||line.speakerName!=='시점 전환'||line.type!=='narration'||line.flow||line.ending||line.presentation?.transition)return line;
  const transition=confirm
   ?{type:'perspective-blackout' as const,mode:'confirm' as const,durationMs:900,title,actionLabel:'계속 읽기'}
   :{type:'perspective-blackout' as const,mode:'auto' as const,durationMs:1800,title};
  return {...line,presentation:{...line.presentation,transition}};
 })};
}
/** Only the exact catalog resolver applies this additive presentation revision.
 * The title shows by itself and the story goes on: readers are not stopped by a '계속 읽기' button
 * (user decision 2026-11-01). Authors can still choose a confirm transition in their own works. */
export function connectCatalogPerspective(project:StoryProject):StoryProject{return connect(project,false);}
/** The version published 2026-10-20 to 2026-10-31 (a '계속 읽기' confirm card). Recognized only so that
 * an unchanged saved copy of it is refreshed to the current version. */
export function connectPreviousCatalogPerspective(project:StoryProject):StoryProject{return connect(project,true);}
