import {hasOnlyStoryKeys,isStoryScoreCondition,type StoryScoreCondition} from './story-scores';
export type StoryTextVariant={id:string;text:string;condition:StoryScoreCondition};
export const STORY_TEXT_VARIANT_LIMIT=16;
export function isStoryTextVariants(value:unknown):value is StoryTextVariant[]{
 if(!Array.isArray(value)||value.length>STORY_TEXT_VARIANT_LIMIT)return false;
 for(let i=0;i<value.length;i++){if(!Object.hasOwn(value,i))return false;const item=value[i];if(!item||typeof item!=='object'||Array.isArray(item)||!hasOnlyStoryKeys(item,['id','text','condition'])||typeof item.id!=='string'||!item.id.trim()||item.id.length>200||typeof item.text!=='string'||item.text.length>20000||!isStoryScoreCondition(item.condition))return false;}
 return new Set(value.map(item=>item.id)).size===value.length;
}
