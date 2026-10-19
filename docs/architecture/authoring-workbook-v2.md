# 공식 저작 편집 양식 — 현재 workbook v8

현재: StoryDocument schema8, archive formatVersion2, workbook8. 점수·조건은5판, 효과 지속 시간은6판, 효과/배경음/주변 소리의 종료 컷은7판에서 연결했다. [종료 컷 계약](cut-range-authoring-contract.md)과 [점수 저작 계약](score-narrative-contract.md)을 따른다. 컷의 작업 제목·목적·감정·연출 메모는 기존 필드이며 앱 입력을 연결해도 새 저작 버전을 만들지 않는다. 이 파일 경로는 기존 문서 링크를 유지하기 위해 보존한다.

2026-10-10의 점수 확장 이전 workbook2 감사와 실제 외부 앱 결과는 아래의 **이전 형식 검증 기록**으로 보존한다. 새 점수 검증은 [점수 개발 계획](score-narrative-development-plan.md)에서 별도로 판정한다. 실제 서버/DB와 실기기 검증은 후속 범위다.

현재 양식의 시간 열은 **초**입니다. 0.1·0.23처럼 입력하고 앱에서도 같은 초 단위를 사용합니다. 내부 시간 키와 기존 작품은 그대로 보존하며 workbook2/3의 ms 값은 명시적으로 변환합니다. [용어·시간 계약](editor-terminology-and-time.md), [ADR0018](../decisions/0018-authoring-seconds-and-terminology.md).

## 사람이 읽고 편집하는 양식

첫 행은 한글 항목명이며 각 제목의 메모에는 작품 적용 위치·연결 대상·필수 여부·허용 값·단위가 적혀 있다. 내부 연결 키인 둘째 행은 숨겨 두고 importer가 사용한다. 전체 열을 이동하면 숨겨진 키도 함께 이동한다. 행 정렬은 3행부터 실제 데이터만 선택한다.

선택 값도 한글이다: 대사/해설, 왼쪽 화자/해설자, 지정 컷/이야기 종료/아직 미연결, 서서히 등장/가로 이동, 배경 음악/환경음, 이전 소리 유지/소리 중지/소리 재생, 확인 후 진행, 현재 컷만/다음 컷에도 유지, 앞표지/책등/뒤표지, 작품 정보 연결/직접 입력 등이다. 선택 목록을 제공하며 importer는 한글 값과 이전 영문 값을 같은 내부 값으로 복원한다. 본문·이름·ID·URL 등 자유 입력은 번역하지 않는다.

‘사용 안내’에는 새 장·컷과 직접 인물 배치의 작성 방법이 있고, ‘자산 참고’에는 앱의 그림·소리를 한글 이름·종류·관련 작품으로 찾아 ID를 복사할 수 있는 목록이 있다. 참고 목록 자체를 수정해 자산을 등록하지 않는다. 새 이미지·음원은 서비스에 등록된 ID만 선택한다. 기존 저장 작품의 private 음원 정보·첨부 보존은 신규 외부 업로드 허용과 구분한다. 놀스토리는40개 편집 탭과2개 안내 탭, 숏스토리는7개 편집 탭과2개 안내 탭이다.

장 ID→컷·음원 설정, 컷 ID→흐름·무대·연출, 인물 키→화자·효과, 메모 ID→항목·연결, 표지 면/레이어→글·그림을 연결한다. 필수 참조 누락·중복은 오류로 알린다. 메모의 미해결 인물 이름·삭제된 장/컷 연결은 기획 정보로 보존한다. ‘장 인물 이어받기’를 없음으로 바꾸고 ‘무대 구성 있음’을 있음으로 선택하면 해당 컷의 인물 행을 직접 배치한다.

이전 workbook2의 [실제 한글 Google 시트](https://docs.google.com/spreadsheets/d/1RwRqGnAmiZUoXJFMixgy1H4MbsVlDIATLKLo8u9rz_8/edit)의 한글 값·메모·선택 목록은 [서비스 판독 기록](evidence/authoring-format/google-korean-cells.json)에서 확인했다. 이 시트와 실제 Excel에서 한글 ‘해설’을 입력하고 저장/반출한 파일의 전체 의미 일치2개, Web 적용/저장/reload2개, 두 엔딩 Ren’Py 재생을 검증했다. [한글 외부 앱 왕복](evidence/authoring-format/korean-native-roundtrip.log), [최종 제품 동선](evidence/authoring-format/final-actions-host.log), [native 재생](evidence/authoring-format/native-format-final.log).

점수 확장 당시 workbook3은 [점수 Google 시트](https://docs.google.com/spreadsheets/d/1Q7Lnb7arGZKfNgb_YRZg79eco6Q2Xx2ruUODavmd_nc/edit)와 [점수 검증 기록](score-narrative-validation.md)을 따른다. 위의 이전 시트는 점수 탭이 추가되기 전 검증 자료다.

## 문서와 파일

공식 `.knolstory`는 `{format:'knolstory',formatVersion:2,document,audioResources}`를 담는다. `.shortstory`는 `{format:'shortstory',formatVersion:2,project}`다. 문서 schemaVersion·교환 formatVersion·API payloadVersion·저장 revision은 서로 다른 계약이다. 현재 Next의 이전 plain StoryDocument(+audioResources)와 숏스토리 v1 파일은 명시적인 읽기 adapter로 보존한다. 기존 story-maker 파일은 이 작업 범위가 아니다.

[공식 저장 계약](authoring-storage-contract.md), [모든 필드 목록](authoring-format-field-inventory.md), [코드 스키마](../../packages/compatibility/src/authoring-field-schema.json).

## 다중 탭 편집

양식은 전체 원고를 숨긴 payload 없이 각 탭의 실제 값으로 문서를 구성한다. 공통 코드의 `authoringWorkbookSpecs()`가 탭·열 key·한국어 label·값 타입을 정의한다. 파일 내 첫 행은 한국어 설명, 둘째 행은 고정 필드 key, 셋째 행부터 작성 데이터다. 둘째 행 key는 열 이동과 함께 움직인다. 첫 행 label은 안내이며 importer의 열 기준은 둘째 행이다. 탭 이름과 필드 key를 임의 변경하면 명시적인 형식 오류다.

놀스토리 탭:

- 형식 정보 / 작품 정보 / 장 / 컷 / 인물 / 이름과 장 자료
- 작품 기본 무대 / 이어쓰기 위치 / 작품 출처 / 출처 창작 경로 / 출처 앞부분 컷 / 출처 선택 경로
- 컷 흐름 / 선택지 / 엔딩
- 무대 구성 / 무대 인물 / 무대 화자
- 오디오 설정 / 음악 환경음 / 효과음
- 연출 구성 / 연출 효과
- 표지 정보 / 표지 자유 배치 / 표지 디자인 / 표지 면 / 표지 글 레이어 / 표지 그림 레이어
- 작품 기획 / 창작 메모 / 메모 항목 / 메모 연결
- 사용자 음원 정보 / 첨부 음원 원본
- 점수 항목 / 선택 점수 / 점수 조건 / 조건 경로

숏스토리는 형식 정보 / 그림책 정보 / 그림책 쪽 / 표지 디자인 / 표지 면 / 표지 글 레이어 / 표지 그림 레이어를 사용한다. 놀스토리 연출·오디오·분기는 그림책에 넣지 않는다.

## 작성 규칙

- 빈 문자열은 작성한 빈 값이다. 선택적 값의 부재는 `⟪미설정⟫`이다. 문자 그대로 이 문자열을 쓰면 exporter가 `⟪문자열⟫` 접두어로 구분한다. 숫자0·없음·빈 목록·설정 부재를 서로 바꾸지 않는다.
- boolean은 있음/없음, 숫자는 유한한 숫자로 입력한다. ID·대사·문구·색·날짜 등은 text 셀을 사용한다. 실제 수식/날짜/리치 객체 셀은 거부한다.
- optional 설정의 있음 열을 없음로 두면 해당 자식 행/값도 비워야 한다. 서로 모순되면 내용을 무시하지 않고 오류를 낸다.
- 배열 순서/position/order 열은 저장 배열·인물/레이어/메모 등의 순서를 나타낸다. 데이터 행 자체를 옮겨도 숫자로 표현한 순서가 유지된다. 순서를 바꾸려면 해당 수치를 바꾼다. 장/컷 표시 순서와 배열 순서는 목적이 다르다.
- 분기의 `targetKind`는 cut/end/pending이다. end는 명시적 종료(null), pending은 연결 대기(빈 ID), 컷 흐름 없음은 순서 진행이다.
- 새 장/컷을 작성하면 연결된 구성·연출·오디오 설정 행도 작성해야 한다. 불완전한 참조/중복 ID는 탭·행·항목 오류로 안내하며 현재 작품에 적용하지 않는다.
- 음원 bytes 조각은 보존 자료다. 음원 이름/종류/출처·cue와 참조는 편집할 수 있지만 bytes를 바꾸면 자산 ID/hash도 맞아야 한다. 손상·조각 누락·서명/hash 불일치를 거부한다.
- 표지 레이어는 모든 세 면의 글/그림·역할·내용 방식·좌표·글꼴·색·crop을 편집한다. 텍스트 bind와 직접 입력 문구를 동시에 작성하면 오류다.
- 표 셀은30,000자 이하, 파일은25MB 이하이다. 긴 저작 요소를 잘라내지 않고 오류와 작품 파일 보관 경로를 제공한다.

## Excel·Google 실제 편집 경로

Web에서 ‘Excel 내보내기’ 또는 ‘빈 공식 편집 양식’을 내려받는다. Excel에서 편집 후 `.xlsx`로 저장한다. Google은 이 `.xlsx`를 업로드해 Google 시트로 변환하고 여러 탭을 편집한 뒤 Microsoft Excel(.xlsx) 형식으로 다운로드한다. 이 파일을 앱에서 가져오기→검증 요약→내 사본으로 가져오기로 적용한다. 현재 파일 importer는 직접 Google OAuth나 원격 쓰기를 요구하지 않는다.

이전 TSV/공개 한 탭 가져오기는 별도의 제한된 v1 경로다. 모든 요소의 편집 지원으로 판정하지 않는다. 실제 서비스 검증은 [검증용 전체 요소 시트](https://docs.google.com/spreadsheets/d/1IPPk6hpj9PKBAZr3eL38kvb37y8qzsNSn4fW-YfmZXI/edit), [빈 그림책에서 작성한 시트](https://docs.google.com/spreadsheets/d/11E9lc-oQltjViXfIu3hXHa93EOTbHr-aCEesXASturw/edit)와 반출 파일의 로컬 재검증으로 기록한다. 기존 사용자 파일/공유 권한은 수정하지 않았다.

## 이전 형식 검증 기록 (점수 확장 전 workbook2)

- 전수 fixture: 놀스토리318개·숏스토리95개 scalar field path와 union 구조를 각 모듈/편집 표에 연결한다. 모든 enum literal을 전수 검사했다는 뜻은 아니다.
- 순수 archive/workbook/xlsx/API-jsonb 직렬화/복원 parity와 Runtime Core 모든 fixture 컷 컴파일을 검사한다.
- 실제 Google에서 다섯 종류의 값을 변경하고 `.xlsx`로 반출해 전체 미수정 저작 데이터·첨부 bytes까지 비교했다.
- Google에서 반출할 때 끝의 빈 열이 추가되는 차이를 재현하고, 빈 후행 헤더만 제거해 의미를 유지했다. 작성한 알 수 없는 셀/열은 여전히 오류다.
- 실제 Microsoft Excel 앱에서 놀스토리 ‘컷’ F3의 본문과 ‘무대 인물’ K3의 좌표45, 숏스토리 첫 쪽 본문을 수정·저장했다. `story-excel-edited.xlsx`와 `shortstory-excel-edited.xlsx` 재반입2/2에서 의도한 수정 외 모든 필드와 첨부 bytes 일치를 확인했다. [실행 로그](evidence/authoring-format/excel-native-roundtrip.log).
- Web PC/태블릿/폰 viewport의 가져오기 취소/확인·손상 헤더·빈 양식·저장/reload와 Google 반출 재열기9개 검사는 통과했다. [로그](evidence/authoring-format/formats-host.log). 최종 영향 회귀와 Ren’Py 재생은 통과했고, 실제 기기 판정은 [개발 계획](authoring-format-development-plan.md)의 별도 완료 조건이다.

## 새 작품과 새 행 작성 예시

빈 공식 양식의 `my-story`/`chapter-1`/`cut-1`은 사용자 작성용 식별자다. 같은 양식을 여러 번 가져오더라도 앱이 기존 작품을 덮지 않고 사본 ID를 발급한다. 파일 안의 장·컷·자산 참조는 보존한다.

둘째 컷을 만들 때:

1. ‘컷’의 첫 데이터 행을 복제하고 ID를 `cut-2`, 배열 순서를1, 표시 순서를2로 바꾼다. 장 ID는 같은 장이면 그대로 두고 본문을 작성한다.
2. ‘무대 구성’, ‘연출 구성’, ‘오디오 설정’의 기존 `cut-1` 행을 복제해 컷 ID만 `cut-2`로 바꾼다. 설정을 쓰지 않으면 있음과 목록 있음은없음, 선택 값은미설정으로 둔다.
3. 순서 진행이면 ‘컷 흐름’에 새 행을 쓰지 않는다. 명시적 엔딩이면 컷ID=`cut-2`, 흐름 종류=다음 컷 지정, 도착 종류=이야기 종료를 쓰고 도착 컷 ID는미설정으로 둔다.
4. 모든 참조를 작성하고 xlsx로 저장해 가져온다. 오류가 있으면 탭·항목을 고친 뒤 다시 가져온다.

새 장은 ‘장’과 해당 장의 ‘오디오 설정’ 행(컷ID 미설정)을 추가한 뒤 하나 이상의 컷을 연결한다. 무대인물·효과음·연출 효과·선택지·레이어·메모 항목은 부모 ID와 각 목록의 순서를 지정한 행을 추가한다. 삭제 시 Flow·무대·자산 등 실행에 필요한 참조가 남으면 가져오기를 거부하므로 연결을 명시적으로 수정한다. 메모의 미해결 인물 이름·삭제된 장/컷 연결은 기획 정보로 그대로 보존한다. 이러한 추가/삭제·부재/빈값·참조 실패는단위검사에서 확인하며, 서식에 포함된 ‘사용 안내’ 탭은각 열의 타입/필수 여부와 작성 지침을 제공한다.

## 소리 검색 속성 (workbook5)

사용자 음원 정보의 검색 속성 있음·용도·원래 이름·검색 출처와 ‘소리 검색 태그’의 음원 ID·순서·태그를 편집한다. 원음/권리 정보와 이름·태그는 따로 유지하며 앱/파일/JSONB에서 보존한다. 이전2/3/4는 명시적으로 변환한다. [소리 속성 계약](audio-attributes-and-import.md).

## 현재 workbook6 비음원 연출 시간

현재 출력은6판이다. 연출 효과 탭의 `durationMs`는 ‘한 번 재생 시간 (초)’로 편집한다. Workbook5→6은 새 열에 미설정만 추가하며 이전 작품의 기본값을 보존한다. 이전판 선언에 새 열을 넣으면 거부한다. 실제 Excel/Google 수정·반출 및 전체 작품/JSONB 비교는 [검증](non-audio-direction-validation.md), 의미는 [계약](non-audio-direction-contract.md)을 따른다.

## 2026-10-14 갈래 조건 확장

workbook8의 연출 효과·음악 환경음·효과음에는 `branchConditionPresent`, `branchSourceLineId`, `branchChoiceId` 일반 열이 있다. 조건 없음은 없음/미설정 두 ID, 조건 있음은 갈림길 컷 ID와 그 컷의 선택지 ID 한 쌍이다. 목적지나 글을 조건으로 쓰지 않는다. 이전 workbook2–7은 명시적으로8판으로 올리고 원고·기존 cue·ID를 보존한다. 구버전 선언에 실제 갈래 조건을 넣거나 한 ID만 작성하면 거부한다. [갈래 조건 계약](branch-scope-authoring-contract.md)을 따른다. 새 Excel ChatGPT 연결·실제 외부 앱 편집은 이번 로컬 검증의 완료 조건이 아니다.
