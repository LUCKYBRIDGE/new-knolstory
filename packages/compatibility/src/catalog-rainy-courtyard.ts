import type {StoryProject} from '@knolstory/story-domain';
const reunionCuts=new Set([3,4,5,6,7].map(n=>'E3-5-v23-'+n));
/** Final visual-only follow-up, called inside the exact official-catalog fingerprint gate. */
export function connectCatalogRainyCourtyard(project:StoryProject):StoryProject{
 if(project.id!=='pinky-review-main-004')return project;
 const lines=project.lines.map(line=>reunionCuts.has(line.id)&&line.chapterId==='E3-5-v23'&&line.backgroundId==='seonnyeo.background.BG04-cottage-day'
  ?{...line,backgroundId:'seonnyeo.background.cottage-rain-evening-v1'}:line);
 return lines.some((line,index)=>line!==project.lines[index])?{...project,lines}:project;
}
