import type {Column,TableSpec} from './model';
/** User-facing meaning; IDs stay stable and are never replaced with display names. */
export function columnApplication(spec:TableSpec,column:Column):string{
 if(spec.key==='sceneVisibility')return '컷 표시 조건 있음으로 정한 컷마다 한 행을 써요. 점수와 선택 조건을 함께 정하면 둘 다 맞아야 보여요. 단일 선택은 묶음을 미설정으로, 여러 선택은 모두 만족 또는 하나라도 만족으로 정해요.';
 if(spec.key==='sceneVisibilityScores')return '컷 ID로 연결하고 조건 순서는0부터 연속으로 써요. 같은 컷의 조건 묶음은 같아야 해요. 점수 ID는 점수 항목 탭에서 확인하세요.';
 if(spec.key==='sceneVisibilityChoices')return '선택지가 있는 컷 ID와 선택지 ID를 함께 써요. 같은 도착 컷이라도 어떤 선택을 골랐는지 구분해요. 조건 순서는0부터 연속으로 써요.';
 if(column.key==='visibilityPresent')return '조건에 맞을 때만 이 컷을 보여 주려면 있음으로 정하고 컷 표시 조건·컷 표시 점수·컷 표시 선택 탭을 작성해요.';
 if(spec.key==='textVariants')return '컷 ID와 조건별 글 ID로 연결해요. 검사 순서는0부터 연속으로 쓰고 처음 만족하는 글을 사용해요. 본문이 빈 문자열이면 빈 글을 표시하며 기본 글은 컷 탭에 그대로 남겨요.';
 if(spec.key==='textVariantConditions')return '조건별 글 탭의 컷 ID·조건별 글 ID와 같은 값으로 연결해요. 조건 순서는0부터 연속, 조건 묶음은 모든 행에서 같게 쓰세요. 해당 글마다 한 개 이상의 점수 비교가 필요해요.';
 if(column.key==='textVariantsPresent')return '조건별 글 탭과 글 점수 조건 탭에서 이 컷의 다른 글을 편집하려면 있음으로 정해요. 없음은 기본 글만 사용해요.';
 if(spec.key==='audioClips')return '장·컷·소리 종류·이어 재생 ID가 같은 설정에 연결됩니다. 재생 순서는 0부터 연속으로 입력하세요. 시간은 초 단위로 작성합니다. 각 구간의 원본 사용 끝은 필수이며 반복·대기 없이 차례로 재생합니다.';
 if(spec.key==='audioTracks'&&column.key==='endLineId')return '재생하는 장 기본 소리 또는 컷 소리의 종료 컷 ID입니다. 종료 컷까지 포함하고 다음 방문 컷에서 해당 소리만 멈춥니다. 장 기본 소리는 이 장에 실제 진입한 컷부터 시작합니다. 종료를 우회하면 계속 유지되며 미설정은 종료를 제한하지 않습니다.';
 if(spec.key==='branchConditionTerms')return '장·컷·효과 ID·소리 종류로 정확히 연결하세요. 연출 효과는 효과 순서도 일치해야 하며 ID가 없으면 미설정으로 둡니다. 조건 순서는 0부터 연속으로 쓰고 같은 선택은 중복하지 않습니다.';
 const key=column.key;
 if(key==='branchConditionMode')return '미설정은 한 선택 조건, 모두 만족은 그리고, 하나라도 만족은 또는 조건입니다. 묶음을 쓰면 두 단일 조건 ID는 미설정으로 두고 선택 조건 묶음 탭에 1~8개 조건을 씁니다.';
 if(key==='branchConditionPresent')return '선택 갈래 조건 있음은 지정한 선택 컷에서 해당 선택지를 골랐을 때만 이 효과·소리를 적용합니다. 같은 도착 컷으로 모여도 선택지 ID로 갈래를 구분합니다.';
 if(key==='branchSourceLineId')return '조건의 선택 컷 ID입니다. 선택지가 있는 컷을 지정하고 조건 선택지 ID도 함께 작성합니다.';
 if(key==='branchChoiceId')return '조건 선택 컷 안의 선택지 ID입니다. 조건 없음일 때는 두 조건 ID를 모두 미설정으로 둡니다.';
 if(spec.key==='resourceTags')return key==='id'?'사용자 음원 정보의 음원 ID와 연결합니다.':key==='tag'?'학교 종·피아노·남성·여성처럼 소리를 찾는 태그를 한 행에 하나씩 입력합니다. 24개까지, 각 60자까지 허용합니다.':'같은 음원의 태그 순서입니다. 0부터 연속한 정수로 입력합니다.';
 if(spec.key==='resources'){
  const help:Record<string,string>={metadataPresent:'있음으로 바꾸면 용도·원래 이름·검색 출처·소리 검색 태그를 작품에 보관합니다.',category:'배경음·주변 소리(환경음)·효과음 중 실제 사용할 용도를 고릅니다. 소리 선택 목록의 종류 필터에 적용합니다.',originalName:'원본 사이트의 이름을 기록합니다. 작품에는 한글 이름을 표시하고 출처 보기에서 원래 이름을 확인합니다.',metadataSource:'Pixabay 등 자료 제공처를 기록합니다. 출처 필터와 검색에 사용하며 상업 이용 허가를 뜻하지는 않습니다.'};
  if(help[key])return help[key];
 }

 if(spec.key==='presentationEffects'&&key==='durationMs')return '효과를 한 번 재생하는 시간을 초로 입력합니다. 0초는 즉시 끝나며 미설정은 원래 효과의 기본 시간을 유지합니다. 계속 반복의 시작 간격은 반복 주기로 따로 조정합니다.';
 if(column.type==='number'&&key.endsWith('Ms'))return `‘${spec.title}’의 ${column.label}을 초 단위로 입력합니다. 예: 0.1은 0.1초, 0.23은 0.23초입니다. 숨겨진 연결 키의 Ms는 내부 저장 단위이며 이 양식에서는 초로 작성합니다.`;
 if(key==='scoresPresent')return '있음으로 바꾸면 점수 항목 탭에서 이야기의 점수 이름과 시작 값을 정의합니다. 없음은 점수 없는 이야기입니다.';
 if(spec.key==='flowChoices'&&key==='effectsPresent')return '있음: 선택 점수 탭에서 이 선택의 점수 변경을 입력합니다. 빈 목록은 점수 변경이 없음을 명시합니다.';
 if(key==='conditionPresent')return '있음: 점수 조건 탭에 선택지 표시 조건을 입력합니다. 이전 선택으로 누적된 점수가 조건을 만족할 때만 선택할 수 있습니다.';
 if(key==='routesPresent')return '있음: 조건 경로 탭을 위에서부터 판단합니다. 첫 만족 경로로 이동하고 하나도 맞지 않으면 컷 흐름의 기본 도착으로 갑니다.';
 if(key==='scoreId')return '점수 항목 탭의 점수 ID와 연결합니다. 신뢰·용기·욕심 등 점수 이름은 자유롭게 정하고 ID는 같은 값으로 연결합니다.';
 if(key==='optionId')return '같은 컷의 선택지 탭 선택지 ID와 연결합니다. 이 선택을 누를 때 점수를 한 번 변경합니다.';
 if(spec.key==='scoreDefinitions'&&key==='initial')return '새로 읽기에서 시작하는 점수입니다. 저장과 이어읽기에서는 선택 기록으로 누적 상태를 복원합니다.';
 if(spec.key==='scoreEffects'&&key==='operation')return '더하기는 현재 점수에 적용 점수를 더합니다. 음수는 감소입니다. 이 값으로 바꾸기는 현재 점수를 적용 점수로 바꿉니다.';
 if(spec.key==='scoreConditions'&&key==='mode')return '모두 만족은 같은 조건의 모든 비교를 만족해야 합니다. 하나라도 만족은 그중 한 비교만 맞으면 됩니다. 같은 묶음 행들은 같은 방식을 선택하세요.';
 if(spec.key==='scoreConditions'&&key==='ownerId')return '조건 위치가 선택지 표시이면 같은 컷의 선택지 ID, 조건 경로이면 같은 컷의 경로 ID와 연결합니다.';
 if(spec.key==='scoreEffects'&&key==='value')return '선택을 한 번 고를 때 더하거나 설정하는 정수 점수입니다. 음수는 감소이며 같은 선택의 여러 결과는 순서대로 적용합니다.';
 if(spec.key==='scoreConditions'&&key==='value')return '누적 점수와 비교하는 유한한 숫자입니다. 예: 신뢰 이상 3은 신뢰가 3 또는 더 높을 때 만족합니다.';
 if(key==='inheritActors')return '있음: 장의 인물 구성을 이어받습니다. 컷의 배치한 인물 행을 직접 편집하려면 없음으로 바꾸고 인물 배치 있음을 선택하세요.';
 if(spec.key==='cuts'&&key==='type')return '대사는 인물이 말하는 글, 해설은 장면을 설명하는 글입니다. 본문은 그대로 두고 이야기의 표시 방식을 선택합니다.';
 if(spec.key==='audioTracks'&&key==='action')return '이전 소리 유지: 재시작하지 않음. 소리 중지: 기존 채널을 끔. 소리 재생: 선택한 음원을 시작함. 이어 재생: 이어 재생 음원 탭의 구간을 순서대로 한 번 재생함.';
 if(key==='bind')return '작품 제목·소개·지은이 등과 표지 글을 연결합니다. 내용 방식을 직접 입력으로 바꾸면 연결 대신 직접 입력 글을 사용합니다.';
 if(spec.key==='metadata')return '앱이 자동으로 기록하는 양식 정보입니다. 새 작품의 내용은 다른 편집 탭에 입력하세요.';
 if(key==='chapterId')return '‘장’ 탭의 장 ID와 연결합니다. 이 행의 컷·무대·소리 설정이 어느 장에 속하는지 정합니다.';
 if(key==='lineId'||key==='linkedLineId')return '‘컷’ 탭의 컷 ID와 연결합니다. 같은 ID의 컷에 이 설정을 적용합니다. 메모의 없어진 연결은 내용과 함께 보존합니다.';
 if(key==='linkedChapterId')return '‘장’ 탭의 장 ID를 메모에 연결합니다. 없어진 장의 ID도 메모에 보존됩니다.';
 if(key==='targetLineId')return '도착 종류가 ‘지정 컷’이면 ‘컷’ 탭의 도착 컷 ID를 입력합니다. ‘이야기 종료’나 ‘아직 미연결’는 미설정으로 둡니다.';
 if(key==='actorKey'||key==='speakerActorKey'||key==='target_actorKey')return '같은 컷의 ‘배치한 인물’ 탭 인물 키와 연결합니다. 말하는 인물 또는 효과를 받을 인물을 지정합니다.';
 if(key==='characterKey')return '‘인물’ 탭의 인물 ID와 연결하여 해당 배치한 인물이 누구인지 지정합니다.';
 if(key==='memoId')return '‘창작 메모’ 탭의 메모 ID와 연결합니다. 이 항목·연결 행을 해당 메모에 적용합니다.';
 if(key==='ownerId')return '목록 종류에 맞는 작품·장·컷 ID를 입력합니다. 이름 목록이나 장 자료를 해당 항목에 연결합니다.';
 if(key==='assetId'||/AssetId$|ImageId$|backgroundId|characterId/.test(key))return '‘작품 자료 참고’ 탭에서 그림·소리 이름을 찾아 작품 자료 ID를 복사합니다. 이름은 바꿀 수 있지만 작품 자료 ID가 실제 그림·소리를 연결합니다.';
 if(key==='id'||key==='key')return '이 항목의 고유 연결 이름입니다. 다른 행에서 참조하므로 임의로 중복하지 마세요. 이름을 바꾸면 연결된 ID도 함께 수정합니다.';
 if(key==='position')return '저장되는 배열 순서입니다. 첫 항목은 0이며 같은 목록에서 서로 다른 정수를 사용합니다.';
 if(key==='text'||key==='value'||key==='description')return '직접 작성하는 문구입니다. 한국어·줄바꿈·이모지를 그대로 보존합니다. 코드나 수식으로 해석하지 않습니다.';
 if(spec.key==='stageActors')return '현재 컷의 배치한 인물 배치·크기·방향·등장 동작에 적용됩니다. 사용자 지정 배치를 유지합니다.';
 if(spec.key.startsWith('presentation'))return '현재 컷의 구도·연출·효과·전환에 적용됩니다. 다음 컷까지 유지할지는 적용 범위에서 선택합니다.';
 if(spec.key.startsWith('cover'))return '앞표지·책등·뒤표지의 해당 글·그림·자유 배치에 적용됩니다. 표지면과 레이어 ID로 연결합니다.';
 if(spec.key.startsWith('audio'))return '장 또는 컷의 배경음·주변 소리(환경음)·효과음에 적용됩니다. 장 설정에서 컷 ID는 미설정입니다.';
 return `‘${spec.title}’의 ‘${column.label}’에 적용됩니다. 안내에 적힌 허용 값과 단위를 사용하세요.`;
}
