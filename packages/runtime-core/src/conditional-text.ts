import type {StoryLine,StoryProject} from '@knolstory/story-domain';
import {initialStoryScores,playbackScores,storyScoreCondition} from './story-scores';
import type {PlaybackState} from './story-runtime';
export function resolveStoryText(project:StoryProject,line:StoryLine,state?:Pick<PlaybackState,'path'|'choiceHistory'|'lineId'|'status'>):string{
 if(!line.textVariants?.length)return line.text;
 const values=state?playbackScores(project,state):initialStoryScores(project);
 return line.textVariants?.find(variant=>storyScoreCondition(values,variant.condition))?.text??line.text;
}
