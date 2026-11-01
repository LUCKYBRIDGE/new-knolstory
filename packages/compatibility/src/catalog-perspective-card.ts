import type {StoryProject} from '@knolstory/story-domain';

/** Exact official catalog revision only; authored captions remain untouched. */
export function simplifyCatalogPerspectiveCard(project:StoryProject):StoryProject{
 if(project.id!=='pinky-review-main-003')return project;
 return {...project,lines:project.lines.map(line=>{
  const transition=line.presentation?.transition;
  if(transition?.type!=='perspective-blackout'||transition.title!=='부인의 시점'
   ||transition.cue!=='시점 전환'||transition.description!=='이제부터 부인이 보고 겪는 일을 따라갑니다.')return line;
  const {cue:_cue,description:_description,...rest}=transition;
  return {...line,presentation:{...line.presentation,transition:rest}};
 })};
}
