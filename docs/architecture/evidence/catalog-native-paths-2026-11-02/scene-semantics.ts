import {createHash} from 'node:crypto';
/** Compare story content, actors, audio and effects at the fixed default landscape layout.
 * Layout/chrome and host lifecycle are checked separately, not part of this signature.
 * Preserve sequence entryId: restarting the same clips is a distinct audio instruction.
 */
export function sceneSemanticHash(scene:Record<string,unknown>):string{
 const audio=scene.audio as Record<string,unknown>|undefined;
 const value=Object.fromEntries(['sceneId','width','height','actors','background','dialogue','choices','presentation','transitionOnly','effectSteps','reducedMotion'].map(key=>[key,scene[key]]));
 const payload={...value,...(audio?{audio:Object.fromEntries(Object.entries(audio).filter(([key])=>key!=='sessionId'))}:{})};
 return createHash('sha256').update(JSON.stringify(payload,(_key,item:unknown)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item)).digest('hex');
}
