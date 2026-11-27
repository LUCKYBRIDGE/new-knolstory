import type {StoryLine,StoryProject} from '@knolstory/story-domain';

// 원고: one choice per cut says who speaks it — 해설, or a name the work already knows.
export const NARRATION='narration',UNNAMED='dialogue';
const NAMED='name:';

/** Names the work already uses: its characters, its speaker list, then any speaker named in a cut. */
export function knownSpeakerNames(project:StoryProject):string[]{
 const names=[...(project.characters??[]).map(item=>item.name),...project.speakerNames,...project.lines.filter(line=>line.type==='dialogue').map(line=>line.speakerName)];
 return [...new Set(names.map(name=>name.trim()).filter(Boolean))];
}

export function speakerValue(line:Pick<StoryLine,'type'|'speakerName'>):string{
 if(line.type==='narration')return NARRATION;
 return line.speakerName.trim()?`${NAMED}${line.speakerName.trim()}`:UNNAMED;
}

const short=(name:string)=>[...name].length>20?`${[...name].slice(0,19).join('')}…`:name;

export function speakerOptions(names:readonly string[],line:Pick<StoryLine,'type'|'speakerName'>):{value:string;label:string}[]{
 const current=speakerValue(line);
 return [
  {value:NARRATION,label:'해설'},
  ...names.map(name=>({value:`${NAMED}${name}`,label:short(name)})),
  // A dialogue cut without a name stays choosable; a work without names still offers 대사.
  ...(current===UNNAMED||!names.length?[{value:UNNAMED,label:'대사(이름 없음)'}]:[]),
 ];
}

export function speakerPatch(line:Pick<StoryLine,'speaker'>,value:string):Partial<StoryLine>|null{
 if(value===NARRATION)return {type:'narration',speaker:'narration'};
 const speaker=line.speaker==='narration'?'left':line.speaker;
 if(value===UNNAMED)return {type:'dialogue',speaker,speakerName:''};
 if(value.startsWith(NAMED)&&value.length>NAMED.length)return {type:'dialogue',speaker,speakerName:value.slice(NAMED.length)};
 return null;
}

/** ‘철수: …’ at the start of a new cut names its speaker when 철수 is a name the work knows (해설: means narration). */
/** While typing, the prefix counts once a space follows the colon, so the space is not left at the start of the text. */
export function speakerPrefix(text:string,names:readonly string[],typing=false):{value:string;rest:string}|null{
 const match=(typing?/^([^\n:：]{1,40})[:：][ \t]+/:/^([^\n:：]{1,40})[:：][ \t]*/).exec(text);
 if(!match)return null;
 const name=match[1]!.trim(),rest=text.slice(match[0].length);
 if(name==='해설')return {value:NARRATION,rest};
 return names.includes(name)?{value:`${NAMED}${name}`,rest}:null;
}
