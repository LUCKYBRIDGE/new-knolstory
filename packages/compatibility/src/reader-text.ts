import {parseStoryDocument,type StoryProject} from '@knolstory/story-domain';
import seonnyeo from '../../../tests/fixtures/stories/seonnyeo.json';
import heungbu from '../../../tests/fixtures/stories/heungbu.json';
import onggojib from '../../../tests/fixtures/stories/onggojib.json';
import rabbit from '../../../tests/fixtures/stories/rabbit.json';
import first from './reader-text-rabbit-heungbu.json';
import second from './reader-text-seonnyeo-onggojib.json';
import rabbitClassic from '../../../tests/fixtures/stories/rabbit-classic.json';
import rabbitEdits from './reader-edit-rabbit.json';
import heungbuClassic from '../../../tests/fixtures/stories/heungbu-classic.json';
import heungbuEdits from './reader-edit-heungbu.json';
import seonnyeoClassic from '../../../tests/fixtures/stories/seonnyeo-classic.json';
import seonnyeoEdits from './reader-edit-seonnyeo.json';
import onggojibClassic from '../../../tests/fixtures/stories/onggojib-classic.json';
import onggojibEdits from './reader-edit-onggojib.json';
import {enhanceExistingStory} from './story-direction';
import {connectCatalogPerspective,connectPreviousCatalogPerspective} from './catalog-perspective';
export type ReaderTextEdit=Readonly<{projectId:string;lineId:string;before:string;after:string;reason:string}>;
export const readerTextEdits:readonly ReaderTextEdit[]=[...first,...second,...rabbitEdits,...heungbuEdits,...seonnyeoEdits,...onggojibEdits];
// Storage validators may reorder object keys. Array order and every JSON value remain exact.
function catalogFingerprint(project: StoryProject): string {
 return JSON.stringify(project,(_key,value:unknown)=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return value;
  const record=value as Record<string,unknown>;
  return Object.fromEntries(Object.keys(record).sort().map(key=>[key,record[key]]));
 });
}
const pristine=new Map([seonnyeo,heungbu,onggojib,rabbit,rabbitClassic,heungbuClassic,seonnyeoClassic,onggojibClassic].map(raw=>{
 const result=parseStoryDocument(raw,{savedAt:'2026-10-06T00:00:00.000Z',appVersion:'knolstory-next-fixture'});
 if(!result.ok)throw Error('제공 작품의 읽기 원고 기준을 확인해 주세요.');
 return [result.document.project.id,catalogFingerprint(result.document.project)] as const;
}));
/** Explicit catalog transform only. Any edited field makes the whole project ineligible. */
export function refineProvidedStory(project:StoryProject):StoryProject{
 if(pristine.get(project.id)!==catalogFingerprint(project))return project;
 const edits=new Map(readerTextEdits.filter(edit=>edit.projectId===project.id).map(edit=>[edit.lineId,edit]));
 return {...project,lines:project.lines.map(line=>{
  const edit=edits.get(line.id);return edit&&line.text===edit.before?{...line,text:edit.after}:line;
 })};
}

const catalogVersions = new Map<string, {known: ReadonlySet<string>; current: StoryProject}>();

/** Refresh exact published catalog versions only; any authored difference stays intact. */
export function resolveProvidedCatalogStory(original: StoryProject, stored?: StoryProject): StoryProject {
 if(pristine.get(original.id)!==catalogFingerprint(original))return stored??original;
 let versions=catalogVersions.get(original.id);
 if(!versions){
  const previousEdits=new Map([...first,...second].filter(edit=>edit.projectId===original.id).map(edit=>[edit.lineId,edit]));
  const previous={...original,lines:original.lines.map(line=>{
   const edit=previousEdits.get(line.id);
   return edit&&line.text===edit.before?{...line,text:edit.after}:line;
  })};
  const refined=refineProvidedStory(original);
  const enhanced=enhanceExistingStory(refined);
  const current=connectCatalogPerspective(enhanced);
  // The confirm-card cue published until 2026-10-31 is a known version too, so it refreshes to the current one.
  const known=new Set([original,enhanceExistingStory(original),previous,enhanceExistingStory(previous),refined,enhanced,connectPreviousCatalogPerspective(enhanced),current].map(catalogFingerprint));
  versions={known,current};catalogVersions.set(original.id,versions);
 }
 if(stored&&!versions.known.has(catalogFingerprint(stored)))return stored;
 // Callers own the selected work; never expose the cached canonical object to edits.
 return structuredClone(versions.current);
}
