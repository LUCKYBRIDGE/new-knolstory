import {COVER_FONTS,COVER_THEMES,COVER_PRESET_OPTIONS,PRESENTATION_EFFECTS,PRESENTATION_LOOKS,PRESENTATION_TRANSITIONS} from '@knolstory/story-domain';
import type {Column,TableSpec} from './model';
export type WorkbookValueChoice=Readonly<{value:string;label:string}>;
type Labels=Readonly<Record<string,string>>;
const alignment={left:'왼쪽',center:'가운데',right:'오른쪽'};
const facing={left:'왼쪽 보기',right:'오른쪽 보기',original:'원래 방향'};
const intensity={soft:'약하게',normal:'보통',strong:'강하게'};
const fit={cover:'영역 채우기',contain:'전체 보이기'};
const fonts=Object.fromEntries(Object.entries(COVER_FONTS).map(([key,value])=>[key,value.label]));
const faces={front:'앞표지',spine:'책등',back:'뒤표지'};
const licenses={permitted:'허용',restricted:'제한',unknown:'확인 필요'};
const content:Readonly<Record<string,Readonly<Record<string,Labels>>>>={
 metadata:{kind:{knolstory:'놀스토리',shortstory:'숏스토리'}},
 project:{choiceMode:{simple:'직선 이야기',choice:'선택형 이야기',free:'자유 구성'}},
 cuts:{type:{dialogue:'대사',narration:'해설'},speaker:{left:'왼쪽 말하는 인물',right:'오른쪽 말하는 인물',narration:'해설자'},backgroundMode:{none:'배경 숨김'}},
 projectLists:{kind:{speakerNames:'작품 말하는 인물 이름',storyStageKeys:'장 구조 단계',chapterSpeakerNames:'장 말하는 인물 이름',characterAssetIds:'장 인물 이미지',backgroundAssetIds:'장 배경 이미지',coSpeakerNames:'함께 말하는 인물'}},
 source:{kind:{blank:'빈 작품에서 창작',baseEdition:'기본 판본에서 창작',publication:'공개 작품에서 창작',sharedFile:'공유 파일에서 창작'}},
 sourceCreation:{mode:{continue:'이어쓰기',rewrite:'다시쓰기'}},
 flows:{type:{goto:'다음 컷 지정',choice:'선택지 분기'},targetKind:{cut:'지정 컷',end:'이야기 종료',pending:'아직 미연결'}},
 scoreEffects:{operation:{add:'더하기',set:'이 값으로 바꾸기'}},
 scoreConditions:{ownerKind:{choice:'선택지 표시',route:'조건 경로'},mode:{all:'모두 만족',any:'하나라도 만족'},operator:{eq:'같음',ne:'다름',gt:'초과',gte:'이상',lt:'미만',lte:'이하'}},
 scoreRoutes:{targetKind:{cut:'지정 컷',end:'이야기 종료',pending:'아직 미연결'}},
 flowChoices:{targetKind:{cut:'지정 컷',end:'이야기 종료',pending:'아직 미연결'}},
 stageActors:{side:{left:'왼쪽 그룹',right:'오른쪽 그룹'},position:{center:'가운데 배치'},placementPreset:{'single-left':'왼쪽 한 명','single-right':'오른쪽 한 명','double-left':'왼쪽 두 명','double-right':'오른쪽 두 명'},facing,motionType:{'fade-in':'서서히 등장','fade-out':'서서히 퇴장',move:'가로 이동'}},
 audioTracks:{channel:{music:'배경음',ambience:'주변 소리'},action:{maintain:'이전 소리 유지',stop:'소리 중지',play:'소리 재생'}},
 presentations:{backgroundFit:fit,look_type:Object.fromEntries(PRESENTATION_LOOKS.map(v=>[v.type,v.label])),look_intensity:intensity,transition_type:Object.fromEntries(PRESENTATION_TRANSITIONS.map(v=>[v.type,v.label])),transition_mode:{auto:'자동 진행',confirm:'확인 후 진행'},left_facing:{left:facing.left,right:facing.right},right_facing:{left:facing.left,right:facing.right},left_emphasis:{normal:'보통',dim:'어둡게'},right_emphasis:{normal:'보통',dim:'어둡게'}},
 presentationEffects:{type:Object.fromEntries(PRESENTATION_EFFECTS.map(v=>[v.type,v.label.replace(/^[^\p{L}\p{N}]+\s*/u,'')])),intensity,trigger:{'scene-enter':'컷 시작 때','with-dialogue':'대사와 함께','after-delay':'지연 후'},scope:{cut:'현재 컷만',following:'다음 컷에도 유지'},repeat:{once:'한 번',loop:'계속 반복'},targetKind:{screen:'화면 전체',background:'배경',actor:'지정 인물'}},
 cover:{layout:{classic:'기본 책 배치',picture:'장면 중심 배치',bold:'인물 중심 배치'},theme:Object.fromEntries(Object.entries(COVER_THEMES).map(([key,value])=>[key,value.label])),font:fonts,titlePosition:{top:'위쪽',middle:'가운데',bottom:'아래쪽'},authorPosition:{'under-title':'제목 아래',bottom:'아래쪽'},align:{left:alignment.left,center:alignment.center},characterPosition:alignment,presetId:Object.fromEntries(COVER_PRESET_OPTIONS.map(v=>[v.id,v.label]))},
 coverComposition:{backgroundFit:{fill:'영역 채우기',complete:'전체 보이기'},textPanel:{auto:'자동 글판',none:'글판 없음'}},
 coverDesign:{trim:{'trade-300-435':'기본 책 판형 (300×435)'},stock:{cream:'크림 종이',matte:'무광 종이',cloth:'천 표지'},texture:{normal:'보통 질감',subtle:'은은한 질감',none:'질감 없음'},designId:{classic:'기본 띠지',cream:'크림 띠지',ruled:'줄무늬 띠지',stripe:'사선 띠지'}},
 coverFaces:{face:faces,preset:{picturebook:'그림책',arch:'아치 창',cloth:'천 표지',literary:'문학 책',banded:'띠지 책',character:'인물 중심',cameo:'작은 초상',poster:'포스터'}},
 coverTextLayers:{face:faces,role:{title:'제목',subtitle:'부제',author:'지은이',description:'작품 소개',authorNote:'작가의 말',edition:'판본',imprint:'출판 표시',number:'번호',custom:'자유 글'},region:{face:'표지 면',band:'띠지'},contentKind:{bind:'작품 정보 연결',text:'직접 입력'},bind:{'project.title':'작품 제목','project.description':'작품 소개','cover.author':'표지 지은이','cover.subtitle':'표지 부제','cover.authorNote':'작가의 말'},fontId:fonts,align:alignment,writing:{horizontal:'가로쓰기',vertical:'세로쓰기'}},
 coverImageLayers:{face:faces,role:{scene:'장면 그림',actor:'인물 그림',custom:'자유 그림'},assetType:{background:'배경 이미지',character:'인물 이미지'},frame:{rect:'직사각형',arch:'아치',oval:'타원'},fit},
 planning:{structureMode:{free:'자유 구조',three:'3단 구조',four:'4단 구조',five:'5단 구조'}},
 memos:{kind:{free:'자유 메모',character:'인물 메모',relationship:'관계 메모',place:'장소 메모',event:'사건 메모',task:'할 일'}},
 memoFields:{source:{default:'기본 항목',recommended:'추천 항목',custom:'직접 만든 항목'}},
 memoLinks:{kind:{linkedChapterIds:'장 연결',linkedLineIds:'컷 연결',linkedCharacterNames:'인물 이름 연결'}},
 resources:{category:{background:'배경음',ambience:'주변 소리(환경음)',effect:'효과음'},kind:{music:'배경음',sound:'효과음'},commercialUse:licenses,redistribution:licenses},
 shortProject:{sourceKind:{original:'직접 창작',preset:'기본 그림책'}},
};
/** Only explicit enum columns are mapped. User text, names, URLs and all IDs remain verbatim. */
export function workbookValueChoices(spec:TableSpec,column:Column,row?:Readonly<Record<string,unknown>>):readonly WorkbookValueChoice[]{
 if(spec.key==='projectLists'&&column.key==='value'&&['storyStageKeys','장 구조 단계'].includes(String(row?.kind)))return Object.entries({opening:'발단',middle:'전개',crisis:'위기',climax:'절정',ending:'결말'}).map(([value,label])=>({value,label}));
 if(column.type==='boolean')return [{value:'true',label:'있음'},{value:'false',label:'없음'}];
 return Object.entries(content[spec.key]?.[column.key]??{}).map(([value,label])=>({value,label}));
}
export function workbookDisplayValue(spec:TableSpec,column:Column,text:string,row?:Readonly<Record<string,unknown>>):string{
 return workbookValueChoices(spec,column,row).find(choice=>choice.value===text)?.label??text;
}
const previousLabels:Readonly<Record<string,Readonly<Record<string,Readonly<Record<string,string>>>>>>={
 audioTracks:{channel:{'배경 음악':'music','환경음':'ambience'}},
 resources:{kind:{'음악':'music'},category:{'환경음':'ambience'}},
 scoreEffects:{operation:{'설정':'set'}},
 scoreConditions:{mode:{'하나 이상 만족':'any'}},
 cuts:{speaker:{'왼쪽 화자':'left','오른쪽 화자':'right'}},
 projectLists:{kind:{'작품 화자 이름':'speakerNames','장 화자 이름':'chapterSpeakerNames'}},
};
export function workbookStoredValue(spec:TableSpec,column:Column,text:string,row?:Readonly<Record<string,unknown>>):string{
 const choices=workbookValueChoices(spec,column,row);
 if(column.type==='boolean'&&/^(true|false)$/i.test(text))return text.toLowerCase();
 return choices.find(choice=>choice.label===text)?.value??previousLabels[spec.key]?.[column.key]?.[text]??text;
}
