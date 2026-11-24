import type {StoryProject} from '@knolstory/story-domain';

/** Built-in authored motion uses the same contract as a motion chosen in the editor. */
export function directOnggojibGhostExit(project:StoryProject):StoryProject {
 if (project.id !== 'pinky-review-main-003') return project;
 return {...project,lines:project.lines.map(line=>{
  const transform = line.id === 'review-main-003:b-fake-warning:5';
  const exit = line.id === 'review-main-003:b-fake-warning:10';
  const stage = line.stageComposition;
  if ((!transform && !exit) || !stage) return line;
  const direct = (actor: typeof stage.rightActors[number]): typeof actor => {
   if (actor.key !== 'onggojib-real' || actor.motion) return actor;
   return transform
    ? {...actor,motion:{type:'fade-in',durationMs:450}}
    : {...actor,xAnchor:66,motion:{type:'exit-right',durationMs:700,delayMs:200}};
  };
  return {...line,stageComposition:{...stage,leftActors:stage.leftActors.map(direct),rightActors:stage.rightActors.map(direct)}};
 })};
}
