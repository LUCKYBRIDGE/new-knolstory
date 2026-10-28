import type {StoryProject} from '@knolstory/story-domain';
import type {PlaybackState} from './story-runtime';
import {initialStoryScores,storyScoreCondition,type StoryScoreValues} from './score-values';
import {replayStoryVisits} from './scene-visits';
export * from './score-values';
/** State is derived from authored defaults and recorded decisions, never a second saved source of truth. */
export function playbackScores(project:StoryProject,state:Pick<PlaybackState,'path'|'choiceHistory'|'lineId'|'status'>):StoryScoreValues{
 return replayStoryVisits(project,state).scores;
}
export function availableStoryChoices(project:StoryProject,lineId:string,state?:PlaybackState){
 const line=project.lines.find(item=>item.id===lineId);
 const values=state?playbackScores(project,state):initialStoryScores(project);
 return line?.flow?.type==='choice'?line.flow.options.filter(option=>storyScoreCondition(values,option.condition)):[];
}
