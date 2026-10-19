import {PRESENTATION_EFFECTS,PRESENTATION_LOOKS,PRESENTATION_TRANSITIONS,COVER_FACE_PRESETS} from '@knolstory/story-domain';
import type {Column,TableSpec} from './model';
import {workbookValueChoices} from './labels';
import {columnApplication} from './application-help';
const choices:Record<string,string>={type:'항목에 따라 다릅니다. 대사 종류: dialogue/narration. 흐름: goto/choice. 글 레이어: text/image 구분은 탭으로 지정.',speaker:'left / right / narration',side:'left / right',action:'maintain / stop / play',channel:'music / ambience',targetKind:'컷 흐름: cut / end / pending. 연출: screen / background / actor',contentKind:'bind / text',source:'default / recommended / custom',sourceKind:'original / preset',layout:'classic / picture / bold',theme:'forest / night / rose / cream',font:'serif / sans / rounded / handwriting',fontId:'serif / sans / rounded / handwriting',align:'left / center / right (표지 정보는 left/center)',writing:'horizontal / vertical',region:'face / band',assetType:'background / character',frame:'rect / arch / oval',fit:'contain / cover',stock:'cream / matte / cloth',texture:'normal / subtle / none',designId:'classic / cream / ruled / stripe',face:'front / spine / back',facing:'left / right / original (연출 인물: left/right)',backgroundMode:'none 또는 미설정',choiceMode:'simple / choice / free',structureMode:'free / three / four / five',repeat:'once / loop',scope:'cut / following',trigger:'scene-enter / with-dialogue / after-delay',intensity:'soft / normal / strong',kind:'탭에 맞는 종류. 메모: free/character/relationship/place/event/task. 음원: music/sound.',backgroundFit:'표지 자유배치: fill/complete. 연출: cover/contain',placementPreset:'single-left / single-right / double-left / double-right',motionType:'fade-in / fade-out / move',commercialUse:'permitted / restricted / unknown',redistribution:'permitted / restricted / unknown'};
export function columnHelp(column:Column,spec?:TableSpec):string{
 if(spec?.key.startsWith('score')&&(column.key==='value'||column.key==='initial'))return '-1,000,000~1,000,000의 정수. 음수는 감소·시작 빚 등에도 사용할 수 있습니다.';
 if(/At$/.test(column.key))return 'UTC 시각 예: 2026-10-10T00:00:00.000Z. 자동 기록된 시각은 보통 그대로 유지합니다.';
 if(['color','ink','accent','titleColor'].includes(column.key))return '색상 코드 예: #173D35. 셀의 채우기 색과는 별개의 작품 색입니다.';
 if(spec){const values=workbookValueChoices(spec,column);if(values.length)return values.map(value=>value.label).join(' / ');}
 const context:Record<string,Record<string,string>>={cuts:{type:'dialogue / narration'},flows:{type:'goto / choice'},presentationEffects:{type:PRESENTATION_EFFECTS.map(v=>v.type).join(' / ')},presentations:{look_type:PRESENTATION_LOOKS.map(v=>v.type).join(' / '),transition_type:PRESENTATION_TRANSITIONS.map(v=>v.type).join(' / '),transition_mode:'auto / confirm',left_emphasis:'normal / dim',right_emphasis:'normal / dim'},coverFaces:{preset:COVER_FACE_PRESETS.join(' / ')},source:{kind:'blank / baseEdition / publication / sharedFile'},sourceCreation:{mode:'continue / rewrite'},memos:{kind:'free / character / relationship / place / event / task'}};
 if(spec&&context[spec.key]?.[column.key])return context[spec.key][column.key];
 if(column.type==='boolean')return 'TRUE / FALSE';
 if(spec?.key==='presentationEffects'&&column.key==='durationMs')return '0~10초. 한 번 재생하는 시간입니다. 미설정은 효과의 기본 시간(흔들림 0.6초, 갈라짐 1.8초, 그 밖의 효과 0.8초)을 유지합니다. 반복 주기는 별도 항목이며 시간은 초 단위 소수로 입력합니다.';
 if(column.type==='number'&&column.key.endsWith('Ms'))return column.key==='periodMs'?'0.4~10초. 예: 0.4, 1.23. 시간은 초 단위 소수로 입력합니다.':'0 이상의 초 단위 소수. 예: 0.1, 0.23, 0.001. 항목별 허용 범위를 검사합니다.';
 if(column.type==='number'){const bounds:Record<string,string>={x:'0~1의 표지 좌표. x+w≤1',y:'0~1의 표지 좌표. y+h≤1',w:'0보다 큰 표지 너비, x+w≤1',h:'0보다 큰 표지 높이, y+h≤1',volume:'0~1',delayMs:'0~10초',durationMs:'0~10초',periodMs:'0.4~10초',focalX:'0~1',focalY:'0~1',xAnchor:'무대:5~95%, 연출:0~100%',fontSize:'표지면 비율 0.015~1',cropX:'0~100%',cropY:'0~100%',zoom:'cover:1~2, contain:0.5~2'};if(bounds[column.key])return bounds[column.key];return /order|position|part/.test(column.key)?'정수 순서. 각 목록 안에서 중복하지 않음.':'유한한 숫자. 화면과 같은 단위/허용 범위 사용.';}
 return choices[column.key]??(/Id$|^id$|Key$/.test(column.key)?'다른 탭의 동일 ID/키와 정확히 연결. 앞자리 0 보존.':'일반 문자열. 한국어·줄바꿈 허용. 수식은 값으로 저장.');
}
export function workbookGuideRows(specs:readonly TableSpec[]):string[][]{
 const story=specs.some(spec=>spec.key==='cuts');
 const creation=story?[
  ['점수 이야기','작품 정보의 점수 항목 있음을 선택하고 점수 항목에 이름·뜻·시작 점수를 입력합니다. 신뢰·용기·욕심 등 작가가 기준을 정합니다.','점수 ID로 모든 점수 변경·조건 연결'],
  ['선택 점수','선택지의 점수 변경 있음을 선택한 뒤 선택 점수에서 선택 컷 ID·선택지 ID·점수 ID와 더하기/이 값으로 바꾸기 값을 입력합니다.','음수는 감소, 적용 순서는 0부터'],
  ['조건부 선택지','선택지의 표시 조건 있음을 선택하고 점수 조건에서 선택지 표시·컷 ID·선택지 ID·비교 방법·비교 점수를 작성합니다.','같은 묶음에서 모두 만족 또는 하나라도 만족'],
  ['조건 줄거리·엔딩','컷 흐름의 조건 경로 있음을 선택하고 조건 경로의 경로 ID·순서·도착을 작성한 뒤 점수 조건에서 조건 경로·경로 ID를 연결합니다.','첫 만족 경로 사용, 그 외는 컷 흐름의 기본 도착'],
  ['새 컷','컷 행을 복제하여 새 컷 ID·장 ID·순서를 작성합니다. 인물 배치·소리 설정·연출 구성에도 해당 컷의 설정 행을 추가합니다.','컷 흐름 행이 없으면 다음 컷으로 진행'],
  ['컷 인물 직접 배치','장 인물 이어받기를 없음, 인물 배치 있음을 있음으로 선택한 뒤 배치한 인물 행을 작성합니다.','같은 장 ID·컷 ID·인물 키로 연결'],
  ['새 장','장과 소리 설정의 장 행을 작성합니다. 장 설정에서 컷 ID는 미설정이며, 새 컷을 장 ID에 연결합니다.','ID 중복과 참조 누락 금지'],
  ['메모','창작 메모 ID로 메모 항목·연결 행을 묶습니다. 표시 순서와 연결 종류를 작성합니다.','미해결 인물 이름과 삭제된 장/컷 메모도 보존'],
  ['소리 검색 속성','사용자 음원 정보에서 검색 속성 있음을 선택하고 용도·원래 이름·검색 출처를 입력합니다. 소리 검색 태그에 음원 ID와 태그를 한 행씩 적습니다.','배경음·환경음·효과음, 출처 Pixabay, 태그 학교 종·피아노·남성·여성 등'],
  ['첨부 음원','기존 저장 작품의 첨부 원본·작품별 정보·순서·미사용 첨부는 파일로 보관할 때 보존합니다.','새 웹 가져오기는 외부 음원 원본이 포함된 파일을 적용하지 않습니다.'],
 ]:[
  ['새 쪽','그림책 쪽의 행을 복제하고 새로운 쪽 ID·제목·이야기·그림 ID를 작성합니다.','쪽 순서는 1부터 빈 번호 없이 연속'],
  ['쪽 이동·삭제','쪽 순서를 고치거나 행을 삭제한 뒤 남은 쪽 순서를 1, 2, 3 순서로 맞춥니다.','쪽 ID를 바꾸지 않으면 같은 쪽으로 유지'],
 ];
 return [
  ['항목','작품 적용 위치와 연결','허용 값과 작성 방법'],
  ['공식 양식','첫 행은 한글 항목명과 메모, 숨겨진 둘째 행은 자동 연결 키입니다. 열은 전체 열을 함께 이동하고 행 정렬은 3행부터 데이터만 선택하세요.','xlsx로 저장'],
  ['미설정','⟪미설정⟫은 선택 값이 없는 상태입니다. 빈 글·0·없음과 구분합니다.','이 표기 자체가 본문이면 ⟪문자열⟫를 앞에 붙임'],
  ...creation,
  ['표지 글·그림','표지 면과 레이어 ID로 연결합니다. 작품 정보 연결 또는 직접 입력을 선택하고 위치·크기를 작성합니다.','앞표지·책등·뒤표지와 같은 레이어 순서 유지'],
  ['Google 시트','xlsx 업로드 → Google 시트에서 편집 → Microsoft Excel(.xlsx) 다운로드 → 앱에서 가져오기','전체 편집은 xlsx. TSV는 제한된 간단 양식'],
  ['작품 자료 고르기','서비스에 등록된 작품 자료만 선택합니다. 작품 자료 참고에서 이름·종류·관련 작품을 확인하고 ID를 복사합니다.',story?'등록된 그림·음원 ID를 사용합니다. 외부 그림·음원 업로드는 제공하지 않습니다.':'등록된 그림 ID를 그림책 쪽과 표지에 입력합니다. 외부 그림 업로드는 제공하지 않습니다.'],
  ['시간 입력','시간은 초 단위입니다. 0.1초는 0.1, 0.23초는 0.23으로 입력합니다.','표 버전 4부터 초 사용. 이전 버전 2·3의 밀리초 값은 가져올 때 자동 변환'],
  ['정확한 값 보존','ID·문구·정밀한 소수가 자동으로 바뀌지 않도록 문자 서식을 사용합니다. 숫자 열은 앱에서 숫자와 범위로 검증합니다.','셀의 색·서식은 작품 값에 자동 적용되지 않음'],
  ['가져오기','모든 탭·필드·연결을 검사 후 사본으로 적용합니다. 오류 시 원고를 유지합니다.','기본 제공 작품과 기존 작품은 보호'],
  ...specs.flatMap(spec=>spec.columns.map(column=>[`${spec.title} · ${column.label}`,columnApplication(spec,column),`${column.optional?'선택 · 미설정 가능':'필수'} · ${columnHelp(column,spec)}`])),
 ];
}
