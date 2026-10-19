import {createStoryDocument,parseStoryDocument,type StoryLine,type StoryProject} from '@knolstory/story-domain';

function requireCut(project:StoryProject,id:string):StoryLine {
 const line=project.lines.find(item=>item.id===id);
 if(!line)throw new Error('이야기 컷을 찾을 수 없어요.');
 return line;
}
function validated(project:StoryProject):StoryProject {
 const next={...project,updatedAt:new Date().toISOString()};
 const parsed=parseStoryDocument(createStoryDocument({project:next,savedAt:next.updatedAt,appVersion:'knolstory-next'}));
 if(!parsed.ok)throw new Error(parsed.issues.map(issue=>issue.message).join('\n'));
 return next;
}
function replaceCuts(project:StoryProject,chapterId:string,cuts:StoryLine[]):StoryProject {
 const numbered=cuts.map((line,index)=>({...line,order:index+1}));
 return validated({...project,lines:[...project.lines.filter(line=>line.chapterId!==chapterId),...numbered]});
}
const ordered=(project:StoryProject,chapterId:string)=>project.lines.filter(line=>line.chapterId===chapterId).sort((a,b)=>a.order-b.order);

/** Explicit UTF-16 textarea position, checked against graphemes. Never trim or insert text. */
export function splitStoryCut(project:StoryProject,lineId:string,newId:string,position:number):StoryProject {
 const source=requireCut(project,lineId);
 if(typeof newId!=='string'||!newId.trim()||project.lines.some(line=>line.id===newId))throw new Error('새 컷의 ID를 확인해 주세요.');
 const boundary=Number.isInteger(position)&&position>0&&position<source.text.length&&
  [...new Intl.Segmenter('ko',{granularity:'grapheme'}).segment(source.text)].some(segment=>segment.index===position);
 if(!boundary)throw new Error('글 안에서 나눌 위치를 골라 주세요. 한 글자나 이모지 중간에서는 나눌 수 없어요.');
 const first={...source,text:source.text.slice(0,position),flow:undefined,ending:undefined};
 const second={...structuredClone(source),id:newId,text:source.text.slice(position)};
 return replaceCuts(project,source.chapterId,ordered(project,source.chapterId).flatMap(line=>line.id===lineId?[first,second]:[line]));
}
function targets(line:StoryLine,id:string):boolean {
 return line.flow?.type==='choice'?line.flow.options.some(option=>option.targetLineId===id):line.flow?.type==='goto'&&(line.flow.targetLineId===id||Boolean(line.flow.routes?.some(route=>route.targetLineId===id)));
}
function settings(line:StoryLine):Record<string,unknown> {
 const {id:_id,order:_order,text:_text,flow:_flow,ending:_ending,...rest}=line;
 return rest;
}
/** Keep the earlier identity and append verbatim; reject any removed entry point or staging cue. */
export function mergeStoryCuts(project:StoryProject,firstId:string,secondId:string):StoryProject {
 const first=requireCut(project,firstId),second=requireCut(project,secondId);
 const cuts=ordered(project,first.chapterId),index=cuts.findIndex(line=>line.id===firstId);
 if(first.chapterId!==second.chapterId||cuts[index+1]?.id!==secondId)throw new Error('같은 장에서 바로 다음에 있는 컷만 합칠 수 있어요.');
 if(first.ending||first.flow&&(first.flow.type!=='goto'||first.flow.targetLineId!==secondId||Boolean(first.flow.routes?.length)))throw new Error('앞 컷에 선택지·다른 연결·엔딩이 있어 합칠 수 없어요.');
 if(project.lines.some(line=>line.id!==firstId&&targets(line,secondId)))throw new Error('뒤 컷으로 들어오는 연결이 있어 합칠 수 없어요. 연결을 먼저 확인해 주세요.');
 if(project.continuation?.lineId===secondId)throw new Error('뒤 컷이 이어쓰기 시작점이어서 합칠 수 없어요.');
 if(project.creativeMemos.some(memo=>memo.linkedLineId===secondId||memo.linkedLineIds?.includes(secondId)))throw new Error('뒤 컷에 연결된 창작 메모가 있어 합칠 수 없어요. 메모의 연결을 먼저 확인해 주세요.');
 const creation=project.source?.kind==='baseEdition'?project.source.linearCreation:undefined;
 if(creation&&(creation.writingStartLineId===secondId||creation.sourceStartChoiceLineId===secondId||creation.prefixLineIds.includes(secondId)||creation.choices.some(choice=>choice.lineId===secondId)))throw new Error('뒤 컷이 원작 이어쓰기 기록에 사용되어 합칠 수 없어요.');
 if(first.presentation||second.presentation||first.audio||second.audio)throw new Error('컷마다 재생되는 연출·오디오가 있어 합칠 수 없어요. 연출과 오디오를 먼저 확인해 주세요.');
 if(JSON.stringify(settings(first))!==JSON.stringify(settings(second)))throw new Error('화자·무대·메모 설정이 서로 달라 합칠 수 없어요. 두 컷의 설정을 먼저 확인해 주세요.');
 if(first.text.length+second.text.length>20000)throw new Error('한 컷의 글은 20,000자 이내로 합칠 수 있어요.');
 const merged={...first,text:first.text+second.text,flow:second.flow,ending:second.ending};
 return replaceCuts(project,first.chapterId,cuts.flatMap(line=>line.id===firstId?[merged]:line.id===secondId?[]:[line]));
}
