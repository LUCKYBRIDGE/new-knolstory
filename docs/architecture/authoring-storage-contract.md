# 공식 편집 파일과 향후 API · JSONB 저장 계약

## 클릭 효과의 추가 저작 필드 — 2026-10-21

StoryDocument8/archive2/workbook8의 효과 시작 값에 `on-click`을 추가한다. 선택 `clickStep`은 이 시작 값에서만 허용되는1~3정수다. 같은 순서는 함께 실행하며 미설정이면 클릭 효과의 목록 순서를 사용한다. 기존 ID·조건·대상·범위·지속 시간과 필드 미설정은 유지한다. [진행·조건·복원 의미](responsive-audio-authoring.md#클릭으로-시작하는-효과--2026-10-21)는 Core가 소유한다.

workbook의 연출 효과 표에는 ‘클릭 순서’ 열을 추가한다. 이전 workbook8에 열이 없으면 해당 표에서만 미설정 열을 보충한 뒤 기존 검증기를 적용한다. 다른 열을 추측해 바꾸지 않는다. 이전 XLSX도 같은 경로를 사용한다. 현재 앱의 기존 파일 읽기를 지원하며 이전 앱이 새 enum/열을 읽는 역방향 호환은 보장하지 않는다. 구버전으로 손실 변환하지 않는다.

읽기 상태의 `effectStep`은 작품 파일의 원고가 아니라 진행 저장에 포함된다. 현재 조건에 맞는 묶음 수 이내의 정수만 허용하며 종료 상태나 잘못된 값은 복원을 거부한다. 원고가 바뀐 저장은 기존 작품 변경 확인을 따른다.

기준 설명: 2026-10-10, 현행 schema/workbook 갱신: 2026-10-14. **공통 순수 검증·직렬화 구현 완료. 서버·PostgreSQL 연결의 현재 범위는 아래 2026-10-16 이후 계정·작품 API 절과 [STATUS](../../STATUS.md)를 따른다.** 전체 형식 목표 완료와 실제 Excel/Google 시트 검증 상태는 [개발 계획](authoring-format-development-plan.md)에서 별도로 판정한다.

구현: `packages/compatibility/src/authoring-archive.ts`. 검사: `packages/compatibility/tests/authoring-archive.test.ts`.

## 컷 나누기·합치기의 선택 조건 연결 -- 2026-10-21

글을 나누면 앞 컷 ID와 들어오는 연결은 유지하고, 선택지·나가는 연결·엔딩은 뒤 컷으로 옮긴다. 실제 선택지가 옮겨질 때만 그 선택을 참조하는 `branchCondition.sourceLineId`를 새 선택지 컷으로 바꾼다. 뒤 컷의 선택지를 앞 컷으로 합칠 때도 같은 원칙을 적용한다. 정확한 `choiceId`와 도착 컷은 그대로 유지하며 같은 도착 컷을 근거로 선택을 추정하지 않는다.

컷의 효과·배경음·주변 소리·효과음과 장의 배경음·주변 소리·효과음 조건 모두를 대상으로 하며, 자기 자신을 참조하는 조건도 포함한다. 존재하지 않는 선택 항목은 복구하지 않고 문서 검증에서 거부한다. 범위 종료 컷·창작 메모·이어쓰기·원작 출처 기록을 이 변환으로 일괄 치환하지 않는다. 합치기로 지워질 뒤 컷이 다른 소리·연출의 종료 지점이면 먼저 구간의 끝을 확인하도록 안내하고 원고를 유지한다. 기존 들어오는 연결·설정 차이·메모·출처 보호도 유지한다.

현재 컷 나누기는 배치·연출·소리를 두 컷에 복제하는 기존 동작을 유지한다. 일회성 소리·효과·인물 동작의 두 컷 재생이나 기존 종료 컷을 임의로 바꾸는 정책을 이 연결 수정에 포함하지 않는다. 파일 형식과 버전은 그대로다. [구현·검증 범위](evidence/manuscript-choice-relocation-2026-10-21/checkpoint.json).

<a id="로컬-작업파일-우선--2026-10-18"></a>

## 로컬 작품 파일 우선 — 2026-10-18

2026-10-19 사용자 확정: 작품 저장의 기본은 이용자 기기의 실제 로컬 작품 파일(`.knolstory`/`.shortstory`) 저장이다. 온라인 동작은 로컬 작품을 서버에 명시적으로 **업로드**하는 기능이며 기본 저장이나 로컬 파일 저장 완료로 표현하지 않는다. 버튼·완료·재시도 안내는 업로드/다시 업로드로 통일한다. 서버 내부의 persistence·revision·DB 저장이라는 기술 용어와 이용자의 작품 저장 동작을 구분한다.

두 제작 모드에서 이용자가 실제 `.knolstory` / `.shortstory` 파일을 저장하고 다시 열어 이어 쓰는 흐름을 우선한다. 로그인·서버·DB가 없어도 작성/파일 보관/재열기가 가능하다. 브라우저 자동 저장은 복구 보조이며 실제 파일 저장과 구분한다. 현행 archive2 검증·원고/자산/오디오 정책을 그대로 사용한다.

`작품 파일 저장`은 지원 브라우저에서 명시적인 파일 선택/권한으로 시작한다. 같은 작품·형식의 파일 연결을 현재 workspace 세션 동안 유지하고, 이후 저장은 선택 파일에 쓴다. `다른 파일로 저장`은 새 선택을 연다. 저장 시작 시 원고 snapshot을 직렬화하고 쓰기 종료 후 내용을 다시 읽어 일치해야 저장 완료를 안내한다. 외부 변경은 이전 확인 내용과 대조해 덮어쓰기를 중단한다. 취소·권한 거부·쓰기 오류는 편집 원고를 보존한다. 화면을 떠난 뒤 늦게 끝난 선택/직렬화가 새 쓰기를 시작하지 않도록 막는다. 파일 쓰기 스트림을 여는 권한·디스크 대기 후에도 같은 작품 화면인지 다시 확인하고, 이미 떠났다면 새 내용을 쓰기 전에 스트림을 취소한다. 취소된 파일은 새 연결로 기록하지 않으며 기존 확인된 파일 연결은 유지한다. 이미 시작한 쓰기는 완료·검증 절차를 따르며, 이를 되돌렸다고 표시하지 않는다. [실패 재현·수정 검증](evidence/input-file-safety-2026-10-20/checkpoint.json). 다른 프로세스가 마지막 대조 직후 동시에 쓰는 OS 수준 경쟁까지 원자적으로 차단하는 계약은 아니다.

파일 오류 안내는 제품 검증 오류와 브라우저/디스크 오류를 구분한다. 제품에서 작성한 외부 변경·내용 확인·용량 제한 안내는 유지하고, 권한 거부·저장 공간·기타 파일 오류는 한국어로 재시도/다른 파일 저장을 안내한다. 브라우저 원시 오류의 개인 경로나 기술 문구는 화면에 붙이지 않는다. 실패한 다른 파일 저장과 쓰기 후에도 이전에 확인한 파일 연결을 유지하며, 선택창 취소와 쓰기 실패를 혼동하지 않는다. 세션 저장기는 클로저가 소유하고 두 제작 모드의 부모 화면이 같은 세션을 유지한다. [실패·재시도 검증](evidence/local-file-errors-2026-10-20/checkpoint.json).

미지원 환경은 실제 다운로드를 요청하되 디스크 저장 완료로 표시하지 않는다. 새 환경에서 기존 가져오기 미리보기·검증·명시적 독립 사본 만들기로 파일을 재열 수 있다. 파일 핸들은 저장소에 영속화하지 않으므로 새로고침/재열기 후 다음 직접 저장에는 파일을 다시 선택한다. 자동 디스크 저장은 하지 않으며, 가져오기가 원래 파일을 묵시적으로 덮어쓰게 연결하지 않는다. [집중 검사와 실제 Mac 저장 근거](evidence/local-work-files-2026-10-18/checkpoint.json).

임시 보관이 차단되거나 사용할 수 없는 탭의 다시 열기는 현재 초안을 저장하는 동작이 아니다. 초안이 사라짐과 작품 파일 선행 보관을 안내하는 확인창을 거치며, 취소는 원고와 저장소를 바꾸지 않는다. 명시적 확인 뒤에만 저장소를 다시 읽는다. 파일 내보내기 요청을 파일 저장 완료로 간주하지 않는다. [초안 보호 검증](evidence/reload-draft-2026-10-20/checkpoint.json). 손상 보관함의 원본 다운로드·새 보관함 시작도 활성 편집 화면 안에 표시하며, 새 보관함을 만들기 전에 손상 raw를 별도 복구 키에 그대로 보존한다. [포인터 접근·원본 보존](evidence/corrupt-recovery-access-2026-10-20/checkpoint.json).

임시 보관의 writer 소유권은 공유 보관함 쓰기를 보호하는 조건이다. 기본편집의 현재 컷 글 초안은 불러오기 완료·편집 모드에서 메모리만 변경할 수 있으며, 소유권이 없거나 보관 기능이 없으면 임시 보관 중지로 표시한다. 파일 직렬화는 이 메모리 원고를 대상으로 하되, 자동 보관·장/컷 이동·다른 도구의 기존 쓰기 조건은 그대로 유지한다. [기본 초안 보존 검증](evidence/basic-draft-recovery-2026-10-20/checkpoint.json).

## 종료·뒤로가기와 저장 후 이동 — 2026-10-29

이번 실행에서 감지한 원고 변경·파일 쓰기 중 상태·미적용 입력이 있으면 종료·새로고침·문서 이탈에 브라우저 기본 확인창을 요청한다. 임시 보관 완료나 온라인 업로드를 작품 파일 저장 완료로 간주하지 않는다. 기본 확인창은 브라우저가 소유하므로 문구·버튼을 임의로 추가할 수 없고, 모바일 앱 강제 종료·OS 종료에서 항상 실행되는 보장은 없다. 기존 자동 임시 보관과 실제 파일 저장을 함께 유지한다.

서비스 링크 이동에는 ‘저장하고 이동 / 계속 편집하기 / 저장하지 않고 이동’을 제공한다. 편집 설정에는 ‘작품 파일 저장하고 서재로’를 제공한다. 실제 로컬 파일을 쓰고 같은 내용을 다시 읽어 확인한 뒤 현재 원고와 일치하고 다른 미적용 변경이 없어야 이동한다. 취소·권한/쓰기 실패·다운로드 요청만 완료된 경우에는 편집을 유지한다. 저장 대기 중 새 원고나 음원 자료를 수정했다면 앞선 저장 완료가 새 변경을 지우지 않는다. 서재처럼 원고를 유지하는 내부 전환에는 불필요한 이탈 확인을 반복하지 않는다.

같은 문서의 브라우저 뒤로가기는 지원 브라우저의 취소 가능한 Navigation traverse에서 현재 화면을 유지하고 서비스 확인창을 연다. 일반 문서 뒤로가기는 기본 이탈 확인을 따른다. 표지의 닫기·취소·Escape와 음원 이름/속성·출처/이용 조건의 미적용 초안은 각 편집기의 실제 기준값과 비교하며 별도 보호한다. 기존 작품을 읽거나 검색만 한 상태를 새 원고 변경으로 취급하지 않는다. 처음 불러온 기존 원고의 디스크 저장 여부를 이 추적으로 증명하지 않는다. [구현·검증·지원 한계](evidence/work-leave-protection-2026-10-29/checkpoint.json).

2026-10-29 웹 연결 후속: 파일 확인의 원고 비교는 객체 키 삽입 순서를 작성 내용으로 취급하지 않는다. 실제 값·배열 순서·현재 원고와 늦은 저장의 차이는 유지한다. 같은 문서 뒤로가기를 승인하면 새 URL을 쌓지 않고 원래 방문 이력 항목으로 돌아가며, 완료 후 다음 변경도 다시 보호한다. 승인된 이동을 기다릴 때 버튼·Escape는 잠가 늦은 이동을 취소로 오해하지 않도록 한다. [구현·검증](evidence/web-editor-connections-2026-10-29/checkpoint.json).

## 하나의 저작 문서

놀스토리의 콘텐츠 SSOT는 StoryDocument이고 숏스토리는 ShortStoryProject이다. 도메인 문서 schemaVersion, 공식 교환 formatVersion, 향후 API payloadVersion, 서버 저장 revision은 서로 다른 버전이다. 표 행은 독립 서버 저장 모델이 아니며 같은 저작 문서를 편집하는 표현이다. 서버가 Flow·StageComposition·연출을 다시 해석하지 않는다. Core→Ren’Py 재생과 숏스토리 Web/CSS 경계는 유지한다.

공식 놀스토리 파일 v2:

```json
{
  "format": "knolstory",
  "formatVersion": 2,
  "document": { "documentType": "story-maker-project", "schemaVersion": 8, "savedAt": "…", "appVersion": "…", "project": {} },
  "audioResources": []
}
```

`documentType`의 현재 식별자는 기존 Next 문서 계약의 식별자이다. 이것을 파일 형식 버전이나 구형 story-maker 파일 지원 선언으로 해석하지 않는다.

공식 숏스토리 파일 v2는 `{format:'shortstory',formatVersion:2,project:ShortStoryProject}`이다. 음악·연출을 추가해 숏스토리 모델을 확장하지 않는다.

모든 현재 Next 저작 데이터, 출처·표지·기획·메모·장·컷·인물·자산 ID·Flow·StageComposition·연출·오디오 참조는 문서 안에 보관한다. 계정 ID·소유권·학급 관계·기기 UI 상태·읽기 기록·서버 revision·접근 권한·서비스 credentials는 공식 작품 파일에 넣지 않는다. 최상위 및 현행 문서의 중첩 저작 항목은 도메인 타입에서 생성한 스키마로 검사하며, 알 수 없는 항목·잘못된 타입·필수 항목 누락은 오류다. 현행 입력의 명시한 값이 도메인 정규화 과정에서 바뀌거나 삭제되는 경우에도 정확한 항목 경로와 함께 거부한다.

중복 JSON 항목명은 일반 JSON parser의 마지막 값 덮어쓰기를 허용하지 않고 파일 적용 전에 거부한다. Unicode escape로 같은 항목명을 표현한 경우도 중복으로 판단한다. 서로 다른 객체 안에서 같은 항목명을 쓰는 것은 정상이다.

## 현재 Next 작품 보호

`decodeAuthoringArchive`는 현재 Next의 plain StoryDocument(+선택적 audioResources)를 v2 envelope로 감싸는 명시적인 adapter를 제공한다. 문서 v1–v4는 도메인 parser의 기존 schema migration을 사용한다. v5–v7의 명시한 값은 정확히 보존해 현행 v8로 올린다. 이전/현행 plain v5–v8은 명시적인 StageComposition이 있고 인물 상속을 쓰지 않는 컷의 중복된 좌우 Asset ID만 해당 composition에서 다시 계산한 뒤 검증한다. 이는 이전 Next plain 파일의 파생 필드 adapter이며 StageComposition과 저작 데이터는 바꾸지 않는다. 새 공식 v2는 파생 필드를 포함한 명시한 값이 정규화로 바뀌면 계속 거부한다. 원본 인자·브라우저 저장소는 변경하지 않는다. `createAuthoringArchive`는 도메인 constructor가 반환하는 타입상 선택적 object 항목의 명시적 `undefined`를 먼저 스키마와 허용 key로 확인한 뒤 JSON의 누락 항목으로 변환한다. 정의되지 않은 array 항목·빈 array 슬롯은 거부하며, 알 수 없는 key를 `undefined`로 숨겨 제거하지 않는다. 파일 decoder와 직접 JSON validator는 JSON 값만 받는다.

현재 Next 숏스토리의 `{manifest:{format:'shortstory',version:1,kind:'project'},project}`는 동일 프로젝트를 v2 envelope로 감싼다. 구형 story-maker의 manifest/draft/playback/sharing 파일은 이번 decoder에서 지원하지 않는다. 미래 formatVersion·미래 schemaVersion·알 수 없는 파일 항목·손상 JSON은 가져오기를 중단한다.

## 누적 선택 점수

StoryDocument schema6은 작가 정의 점수·선택 효과·표시 조건·조건 경로를 보관한다. 공통 파일/workbook5/JSONB 검증이 같은 데이터를 보존한다. 점수 없는 Next 문서1–5는 명시적으로 올리며, 구버전 선언에 점수 필드가 들어 있으면 거부한다. 읽기 점수는 Runtime Core가 컷 경로와 선택 ID 기록으로 재계산한다. 작품 파일에는 점수 정의와 규칙을 담고 특정 독자의 누적 합계·읽기 기록은 넣지 않는다. schema6/교환 archive2/API payload1/서버 revision을 혼동하지 않는다. [점수 계약](score-narrative-contract.md).

## 오디오와 바이너리

파일에는 다른 기기 복원을 위해 참조된 사용자 음원의 bytes를 base64 `audioResources`로 담는다. 항목은 ID·이름·MIME·music/sound 종류·base64 data·선택적 provenance다. ID는 `audio:custom:<SHA-256>:wav|ogg|mp3`. 원본 ID와 SHA-256, WAV/OGG/MP3 파일 signature, MIME·확장자, 출처의 sourceSha256, 중복 ID를 검증한다. 각 원본 5MiB 이하, 50개 이하, base64 첨부 합계 20,000,000 bytes 이하, 전체 JSON 파일 25,000,000 bytes 이하이다. 공식 파일로 옮길 때 필요한 사용자 음원이 없으면 성공으로 처리하지 않는다.

`validateAuthoringAudioResources`와 `validateAuthoringArchive`는 WebCrypto만 사용하며 IndexedDB·DOM·Web UI에 의존하지 않는다. 모든 검증이 끝나야 값이 반환된다. 저장소 쓰기와 rollback은 호출한 Web host/향후 서버의 책임이며, 검증 실패 시 부분 오디오 쓰기를 하지 않는다.

서버에서 바이너리를 객체 저장소 또는 별도 blob 보관으로 분리할 경우 Asset ID·SHA-256·MIME·종류·크기를 고정된 자산 참조로 유지하고, 파일 내보내기 시 권한 있는 자료를 다시 포함해야 한다. 객체 저장소 업체·업로드 URL·보관 정책은 아직 결정하지 않았다. provenance는 권리의 증거 기록이며 파일 검증이 이용 허가를 보증하지 않는다.

Web 보관은 같은 오디오 DB의 schema v2에 작품 ID/음원 ID별 메타데이터와 순서를 추가한다. 원본 bytes는 hash ID로 재사용하고 기존 공용 메타데이터를 다른 작품 가져오기로 덮지 않는다. provenance의 부재도 그대로 유지한다. 명시적 첨부는 현재 cue에서 잠시 사용하지 않더라도 파일로 보존하고, 다른 작품의 공용 자료를 자동 첨부하지 않는다. 내부 사본은 metadata만 복사하며 bytes와 Asset ID를 보존한다. 실제 브라우저에서 A/B의 같은 음원 ID, 다른 이름·종류·출처, 미설정 출처, 미사용 첨부, 사본·reload·재반출을 확인했다. [검증](evidence/authoring-format/audio-metadata-green.log).

## 향후 API와 JSONB

`prepareJsonbSnapshot(archive)`는 JSON으로 직렬화 가능한 `{payloadVersion:1,content,contentSha256,assetReferences}`를 반환한다. `content`는 검증된 공식 archive의 정확한 값이며 파일·표 importer와 같은 검증 경계를 사용한다. `restoreJsonbSnapshot(snapshot)`은 내용·hash·자산 참조를 다시 확인하고 정확한 archive를 반환한다. 실제 DB나 네트워크에 쓰지 않는다.

`contentSha256`는 key를 정렬한 canonical JSON의 SHA-256이다. 배열 순서는 저작 순서로 보존한다. 놀스토리 document의 `savedAt`과 `appVersion`만 transport metadata로 제외한다. 작품 `updatedAt`, schemaVersion, assetCatalogVersion, 저작 내용, 음원 metadata/provenance/bytes는 포함한다. 숏스토리 `updatedAt`도 현재 저작 문서 계약 일부로 포함한다. fingerprint는 접근 권한이나 변경 충돌 검사를 대신하지 않는다.

PostgreSQL은 UTF8로 운영하는 것을 서버 설계의 전제로 삼는다. jsonb가 허용하지 않는 NUL 또는 짝이 맞지 않는 Unicode surrogate는 `prepareJsonbSnapshot`에서 정확한 저작 경로와 함께 거부하고 원본 문서를 바꾸지 않는다. 파일의 JSON 표현과 DB의 입력 허용 범위가 같다고 가정하지 않는다. 정상 한국어·이모지·줄바꿈과 객체 key 순서 변화는 보존한다. 이 제약은 [PostgreSQL 공식 JSON 타입 문서](https://www.postgresql.org/docs/current/datatype-json.html)를 확인했으며, 실제 DB 연결·저장 검증은 서버 단계에서 수행한다.

이 snapshot은 **순수 직렬화/복원 계약의 검증용 값**이다. PostgreSQL migration에서 base64를 그대로 대량 JSONB에 저장할지 결정한 것이 아니다. 서버 단계에서 문서는 JSONB, 사용자 자산 bytes는 별도 저장, asset references는 문서 revision에 결합하는 저장 projection을 정하고 같은 검증을 통과시켜야 한다.

향후 관계형 보관 레코드에는 서버 record ID·owner ID·작품 종류·client project ID·저장 revision·byte size·생성/수정 시각을 별도 보관하는 방향이다. 사용자·학급·구성원·과제·제출 관계도 별도 테이블로 설계한다. 프로젝트 ID와 서버 record ID는 구분한다. 원격 저장 요청은 기대 revision과 멱등 키를 서비스 envelope에 포함하고, 인증·권한·충돌·트랜잭션은 서버가 확인한다. 이 항목들의 API route·테이블·인덱스·제약은 서버 단계 ADR에서 확정한다.

제출은 제출 시점의 검증된 문서와 자산 참조를 고정할 수 있어야 한다. 제출 후 수정·재제출·피드백 정책은 이번 형식 작업에서 임의로 결정하지 않는다. DB의 `jsonb` 타입만으로 문서 구조·오디오 무결성·소유권 검증이 수행되는 것은 아니다.

## 기존 레코드 저장 경계 준비 (2026-10-15)

[saveExisting](../../server/storage/save-existing.ts)는 기존 서버 레코드에 대한 저장 명령만 준비한다. 인증 제공자·HTTP route·DB adapter·생성/삭제·보관·no-op 요청 발생 정책을 정하지 않는다. `scopeId`·서버 `recordId`·멱등 키·기대 revision은 작품 파일 밖의 명령이며, scope 문자열은 권한 증거가 아니다. 실제 host는 인증 문맥에 결합한 권한 검사와 현행 등록 자료 정책 검사를 제공해야 한다. 두 검사가 재시도를 포함해 매번 명시적으로 true를 반환하기 전에는 트랜잭션을 열지 않는다. 현재 코드에 실제 인증/catalog 구현이 연결됐다는 뜻은 아니다.

공통 snapshot 복원/준비 검증을 재사용하고 요청을 비동기 처리 전에 복제한다. 전체 검증 요청의 fingerprint에는 scope/record/멱등 키/기대 revision과 `savedAt`·`appVersion`까지 포함한다. `contentSha256` 하나로 멱등성을 판정하지 않는다. 객체 key 순서는 정렬하고 배열 순서는 유지한다. 같은 namespace/record/key의 동일 요청은 이전 receipt를 기대 revision보다 먼저 확인해 성공 당시 revision을 반환한다. 다른 요청은 멱등 충돌이며, receipt가 없는 요청은 기존 레코드의 안전한 양의 정수 revision과 일치할 때만 다음 revision으로 저장한다. 레코드 부재·revision 충돌은 쓰지 않는다. 이 내부 계약이 최초 revision이나 신규 레코드 생성 정책을 확정하지 않는다.

포트는 레코드·receipt namespace를 callback 전체에 걸쳐 직렬화하고 snapshot/receipt를 같은 트랜잭션에서 원자적으로 기록하거나 모두 rollback해야 한다. 전달값과 반환 receipt는 분리된 복제본이다. 변경 가능한 권한은 실제 DB 트랜잭션 안에서도 재확인해야 하며 사전 hook만으로 이 경쟁을 해결했다고 주장하지 않는다. 실제 adapter의 잠금·유일성·다중 프로세스 경쟁·DB 저장/복원·API 권한 검사는 미구현이다.

[검사](../../server/storage/save-existing.test.ts)는 테스트 전용 메모리 트랜잭션 harness로 동시 저장/동시 재시도·응답 유실 후 replay·양쪽 write 실패 rollback·권한/자료 거부·snapshot 무결성·전체 저작 내용/변경 격리를 확인한다. [RED](evidence/native-resume-2026-10-15/server-preparation/save-red.log) 후 [최종16개](evidence/native-resume-2026-10-15/server-preparation/save-coverage.log)가 통과했고 이 새 모듈의 네 coverage 지표는100%다. 저장 프로토콜의 준비 검사이며 실제 API/PostgreSQL 통합 검사나 전체 저장소 coverage 결과가 아니다. 독립 보안/코드 검토에서 준비 범위의 추가 P1/P2 결함은 발견하지 못했다. 운영 정책과 실제 서비스 연결은 [단일 실행 계획](product-completion-plan.md)의 Q-01~03 및 PC-04/05에서 계속한다.

## API 요약

| 함수 | 책임 |
|---|---|
| `createAuthoringArchive(input)` | 현재 저작 문서와 첨부로 v2 archive 생성·전체 검증 |
| `validateAuthoringArchive(value)` | 공식 v2 object를 순수 검증·복제 |
| `encodeAuthoringArchive(archive)` | 검증된 공식 JSON 파일 생성 |
| `decodeAuthoringArchive(text)` | 공식 파일 읽기와 현재 Next adapter |
| `validateAuthoringAudioResources(resources)` | shape·signature·hash·출처·용량 검증 |
| `authoringReferencedAudioIds(project)` | 장·컷 음악/환경음/효과음 참조 수집 |
| `prepareJsonbSnapshot(archive)` | 향후 서버에 재사용할 검증·fingerprint·자산 참조 JSON 값 |
| `restoreJsonbSnapshot(snapshot)` | JSON 직렬화 이후 무결성을 재검증하고 저작 내용 복원 |

## 검증 범위

공식 archive·현재 Next adapter·ShortStory v1/v2·JSONB snapshot 복원, timestamp fingerprint 제외, 저작 내용 변경 검출, 미래/알 수 없는 필드·손상 오디오·출처·hash 거부를 단위/계약 검사로 확인한다. 전체 요소 fixture는 실제 음원 bytes와 함께 archive/workbook/xlsx/JSONB 왕복의 모든 미수정 필드를 비교한다. 실제 Excel·Google 반출 자료의 재반입도 동일한 공통 검증기를 통과한다.

점수 확장 전 형식 감사의 전체 단위·계약·통합 검사는1,007개 통과, coverage statements93.33%/branches90.58%/functions96.47%/lines98.60%다. [실행 근거](evidence/authoring-format/final-coverage.log). 이 수치는 전체 프로젝트 검사 집계이며 archive 단독 수치나 실제 PostgreSQL/API 실행의 증거가 아니다. 외부 앱과 Web/native의 최종 완료 판정은 [개발 계획](authoring-format-development-plan.md)에서 구분한다.

점수 확장 이후의 검증은 [점수 실행 계획](score-narrative-development-plan.md)과 새 증거 디렉터리에서 판정한다. 위의 과거 수치를 현재 코드의 재검증 수치로 해석하지 않는다.

## 편집 시간 표시의 변경

[ADR0018](../decisions/0018-authoring-seconds-and-terminology.md)부터 화면과 workbook4는 초를 입력한다. 문서6/archive2/JSONB payload1의 `*Ms` 값은 밀리초 의미를 유지한다. 기존 workbook2/3은 단위를 명시적으로 변환하며 기존 Next의 실제 재생 시간을 바꾸지 않는다.

## 검색 소리 속성

archive2의 audioResources는 선택적인 metadata(종류·태그·원래 이름·검색 출처)를 보존한다. 권리 provenance와 검색 source는 다른 의미이며 제공처 이름은 허가 증명이 아니다. 문서6/JSONB payload1·재생 명령은 유지하고 workbook5에 일반 열/태그 행을 추가한다. [계약](audio-attributes-and-import.md).

## 비음원 효과 시간 (2026-10-10)

StoryDocument6/archive2/JSONB payload1은 선택적 `StoryEffectCue.durationMs`를 보존한다. 미설정은 기존 기본 시간,0은 즉시 종료이며0–10000ms 유한값만 허용한다. Workbook6은 소수 초로 편집하고 이전2–5판은 명시적으로 변환한다. [연출 계약](non-audio-direction-contract.md), [검증](non-audio-direction-validation.md).

## 2026-10-11 승인 UI 개편과 읽기 슬롯

편집·읽기 개편은 콘텐츠 StoryDocument6/archive2/workbook6/JSONB payload1을 바꾸지 않는다. view-only dialogueDock·접힘·글 크기는 저작 문서에 넣지 않는다. 독자 기록은 별도 knolstory-player-v1 키의 저장 envelope v2에서 수동1–9/auto/quick으로 관리한다. 이전 envelope v1은 전체 검증 후 메모리에서 v2로 올리고, 다음 실제 저장 때만 쓴다. quick은 수동 슬롯을 대체하지 않는다. 미래/손상 데이터는 원본을 보존한다. [개편 검증](approved-ui-validation.md).

## 2026-10-11 컷 종료 범위 확장

현재 StoryDocument7/workbook7은 following 효과 및 play 배경음/주변 소리의 endLineId를 보존한다. 문서1–6·표2–6은 명시적으로 승격하며 저작 값은 유지한다. archive2/JSONB payload1과 RuntimeScene은 유지한다. [진행 중 계약·검증](cut-range-authoring-contract.md)을 따른다.


## 2026-10-12 가져오기 확인과 현재 원고 보호

공식 파일과 공개 시트 TSV는 같은 `previewAuthoringFile` 순수 확인 경로를 거쳐 `AuthoringArchive`를 반환한다. 이 단계에서는 첨부를 IndexedDB에 쓰거나 현재 프로젝트를 교체하지 않는다. 확인창에서 적용할 때 한글 조합 종료와 현재 workspace 저장 성공을 먼저 요구한다. 실패하면 현재 원고와 pending archive를 유지한다. 기존 작품 ID와 충돌하면 독립 project ID를 만들고 첨부 메타데이터를 그 ID에 연결한 뒤 내 사본으로 연다. 컷·장·Asset ID·Flow·StageComposition·원고와 미사용 첨부는 그대로다.

공개 시트의 오래된 비동기 응답은 작품 identity 변경/컴포넌트 종료 후 확인창을 열거나 첨부를 쓰지 않는다. 현재 작품에서 응답을 기다리며 수정한 값은 최신 callback으로 확인·적용한다. archive2/StoryDocument7/workbook7/JSONB 필드 계약을 바꾸지 않는 Web 작업 절차 변경이다. [실행 기록](editor-view-and-cut-notes-validation.md).

## 2026-10-12 서비스 catalog 전용 저작 정책

새 사용자 결정은 사용자 외부 그림/음원 업로드를 허용하지 않는다. Web 편집 picker는 service 등록 자료만 선택하고, Web authoring import는 preview 전에 아닌 decode/검증 후 IDB 쓰기·확인창 이전에 `assertCatalogOnlyMedia`를 적용한다. 비어 있지 않은 audioResources는 미사용 자료도 거부하며 사용자 음원과 미등록 그림 참조도 거부한다. JSON/Excel/TSV/CSV/공개 시트와 direct archive loader에 동일 gate를 적용한다. 기존 저장 작품의 decode/보관/export는 그대로 보존한다. 공유 순수 archive/schema/JSONB codec은 과거 자료를 손실 없이 읽기 위한 계약이며 새로운 Web 업로드 허용을 뜻하지 않는다. 실제 서버는 미구현이며 같은 서비스 정책 gate 연결이 후속 조건이다. [검증](editor-view-and-cut-notes-validation.md).

등록 자료 검사 보강: generic 객체 key-name 순회 대신 project의 실제 media 필드만 검사한다. 인물 기본 이미지·미사용 장 자료·배치 인물·설계 표지까지 registry 존재와 background/character 종류를 확인하고, 창작 메모·기획·표지 글 문자열은 해석하지 않는다. [검증](editor-view-and-cut-notes-validation.md)의 catalog 참조 보강 절을 따른다.

손상 보관함 보호 보강(2026-10-12): 자동 저장 중지만으로는 충분하지 않다. `persistWorkspace`도 정상 hydration 전에는 기기 원본을 쓰지 않는다. 손상 상태의 새 작품은 writer 소유권을 확인한 뒤 메모리의 초안으로 생성하며 글 수정·파일 내보내기를 허용한다. 수동 저장이 필요한 화면 이동은 원본을 보존한 채 중단 사유를 안내한다. 복구 기록의 export/독립 사본 열기는 허용하고, 손상 raw를 다시 쓰는 경로는 원본 별도 보존 후 새 보관함을 시작하는 명시적 복구에 한정한다. [검증](editor-view-and-cut-notes-validation.md).

## 2026-10-13 등록 CC0 참조와 native 전송

추가 공용 음원과 별칭은 StoryDocument cue의 기존 `assetId` 문자열로 보존한다. `.knolstory`·workbook7/XLSX·JSONB1에서 공용 원음은 첨부하지 않는다. 새 버전 경로·`delivery=on-demand`·SHA와 별칭 해석은 registry/Core/host의 책임이며 저작 파일에 runtime 전송 bytes를 저장하지 않는다. 선택적인 `serviceAudioResources`는 현재 RuntimeScene 참조에 묶인 Web→Ren’Py 전달 전용 필드다. 기존 private 보존과 조건부 Pixabay 정책을 변경하지 않는다. 한도·검증·재현은 [편입 계약](cc0-library-integration-plan.md), 전체 신규 ID와 alias 왕복은 [검증](cc0-library-integration-validation.md)을 따른다.

## 2026-10-13 작품별 편집 방문 상태

기기 workspace2의 `WorkContext.editingPath`는 선택적인 최근32회 컷ID 배열이다. 성공한 사용자의 편집 이동만 기록하며 특정 방문 복귀는 그 뒤 방문을 잘라낸다. 읽기 playback.path/선택ID/점수와 별도로 유지한다. 기존 workspace에 필드가 없으면 유효한 현재 컷에서 시작하고, 알 수 없는 타입·누락/삭제 컷ID는 파생 UI 방문만 정리한다. 원고나 Flow를 보정하지 않는다. 작품별 context/독립 가져오기/삭제 복구는 해당 작품의 방문만 사용한다. 목적 컷과 방문 상태는 현재 저장 guard를 통과한 뒤 함께 적용한다.

StoryDocument7/archive2/workbook7/JSONB payload1/RuntimeScene에 필드를 추가하지 않는다. 공식 파일/Excel/Google 표/JSONB에는 이 상태가 들어가지 않는다. 새 외부 업로드나 reader 경로 추정을 허용하지 않는다. [이번 검증](current-ui-continuation-validation.md)에서 저장 왕복·파일/JSONB 미첨부·native 읽기 분리·한글 조합/저장 실패의 범위를 확인한다.

## 새 갈래 작성의 원자적 적용

새 갈래 확인은 생성 후보만 메모리에 두며 취소는 저작/기기 상태를 바꾸지 않는다. 확정 때 현재 작품/원고 identity·한글 조합·workspace writer를 검증하고 생성 문서·새 컷/글 도구·실제 원래 컷→새 컷 방문을 한 workspace 쓰기로 저장한다. 저장이 실패하면 원본 선택지·기존 글·대화상자를 유지한다. 기존 미연결 선택 생성의 후속 원고 끝 보호 의미는 유지하며 적용 전에 표시한다. 새 문서 field/version이나 archive/workbook/JSONB 전용 상태를 추가하지 않는다. [검증](branch-writing-validation.md).

## 2026-10-14 장 소리 종료 편집과 양식 안내

장 기본 배경음·주변 소리의 기존 `endLineId`를 장 저작 화면의 선택/취소와 연결했다. 실제 장 진입 컷에서 시작하며 종료 컷을 포함하고 다음 방문 컷에서 정지한다. document7/archive2/workbook7/JSONB1·기존 bytes/ID/Flow·무대는 유지한다. 표의 ‘종료 컷 ID (컷 소리만)’ 표시를 ‘종료 컷 ID’로 고치되 숨겨진 key와 파싱 계약은 동일하다. 기존 실제 외부 반출물도 재검사한다. [검증](chapter-audio-range-validation.md).

현재 workbook 사용 안내와 자료 참고 메모는 service 등록 자료만 선택한다고 설명한다. 외부 등록을 유도하던 안내를 제거했으며 기존 저장 private 첨부를 보존하는 codec은 유지한다. Excel 추가 기능 ChatGPT 연결은 사용자 요청으로 이번 개발에서 제외하므로 설치/로그인/연결은 저작·파일 검증의 선행 조건이 아니다. [범위/안내 기록](range-external-preparation-validation.md).

2026-10-14 현재 문서 schema8/workbook8은 cue의 선택적 branchCondition을 보관한다. archive2/API payload1/JSONB envelope1은 유지한다. 위 날짜별7판 기록은 당시 계약이며 현행 조건은 [갈래 계약](branch-scope-authoring-contract.md)을 따른다. 기존7판 snapshot은 원본 fingerprint 확인 뒤 명시적으로8판으로 올리며 원본 인자/해시를 변경하지 않는다. 실제 선택 기록은 작품 파일에 넣지 않는다. [현재 검증](branch-scope-validation.md).

2026-10-14 기존 private 자료 보존은 현재 기기 저장/IDB에서 한글 이름·메타데이터·원본 bytes/ID·목록을 유지하고 실제 native 재개까지 확인한다. 새 private 첨부 파일은 확인 전에 거부하며 등록 참조 사본만 정상 신규 가져오기를 지원한다. 기존 모델/archive2/schema8/workbook8 계약을 변경하지 않는다. [이번 보존/회귀](current-regression-migration-validation.md).

## 2026-10-14 새 컷 복제의 참조 계약

새 컷 복제는 원래 컷의 Flow·엔딩·글·배치·연출·소리를 보존한다. 새 복제본 내부의 자기 cut 대상/조건 route/선택지 대상·효과/음악/환경음 종료·갈래 조건만 새 cut ID 및 실제 생성된 새 choice ID로 재연결한다. 외부 컷 대상/종료/조건과 원래 메모·continuation은 그대로이며 선택 ID 충돌은 고유 suffix로 처리한다. 잘못된 자기 선택 조건은 오류로 거부한다. 기존 저장 복제본을 자동 migration하지 않으며 schema8/workbook8과 archive2/API1/JSONB1 계약을 유지한다. [전체 형식·native 검증](manuscript-authoring-continuation-validation.md).

2026-10-14 사용자 재확인: 모든 과거 파일 양식 호환은 현행 저작의 필수 gate가 아니다. 지금도 필요한 과거 원고·자산 참조·Flow·Stage·메모·연출·점수의 내용은 현재 형식으로 명시적으로 변환하고 전체 비교로 검증한다. 역사적 외부 편집 artifact는 덮지 않고 변환 사본과 구분한다. 새 private 첨부를 허용하는 변환을 하지 않는다. [ADR0016](../decisions/0016-authoring-format-contract-and-scope.md), [실행 기록](full-current-regression-validation.md).

2026-10-14 한글 양식/기존 출처 검증: 필요한 과거 한글2파일은 현재 schema8/workbook8 등록 사본으로 명시 변환하고 전체 문서·원본 해시를 보존한다. 기존 기기 private의 bytes/ID/권리 기록은 기존 저장 snapshot 경로로 유지하며 신규 private file import는 거부한다. 검사용 사본의 자산 치환을 사용자 문서에 자동 migration하지 않는다. [실행·제한](remaining-current-regression-validation.md).

2026-10-14 현재 작품 회귀: 내보낸 전체 document의 다른 내용은 유지하고 같은 기기로 재가져오는 사본 ID만 독립 발급한다. 빈 현재8판/unknownasset/손상JSON을 적용 전에 거부하며 기존 작품은 전체 보존한다. 서로 다른 작품 전환과 읽기 재개는 기기workspace 상태이며 파일에UI/읽기상태를 넣지 않는다. [실제 파일/독립성 검증](work-switch-current-regression-validation.md).

2026-10-14 기존 자료 공유/지연 입력 검증: 같은 기존 private Asset ID를 참조한 cue의 metadata만 명시 저장하며 원본 bytes/ID·원고/Flow/Stage를 보존한다. 다른 cue의 dirty 초안을 shared baseline으로 덮지 않는다. 현재8판의 금지 private 첨부는 비동기 읽기 완료 뒤에도 확인창/IDB쓰기 전에 거부하고 최신 저작 상태를 보존한다. ShortStory의 미지원 music은 현재 archive2 검증에서 거부한다. [실행·제한](shared-media-staging-current-validation.md).

2026-10-14 UI 경계 fixture는 필요한 옛 원고를 현재 StoryDocument 생성기로 변환하여 사용한다. 원본 fixture bytes는 수정하지 않으며 모든 옛 envelope/codec을 새 필수 조건으로 만들지 않는다. 점수 없는 선택의 기본 상세 탐색은 점수/Flow를 생성하지 않고, 실제 점수 생성 후 상세 조정을 허용한다. [현재 경계 검증](ui-clarity-current-regression-validation.md).

2026-10-14 현재 왕복 회귀: 기존 기기 private 내보내기 보존과 새 private 첨부 반입 거부는 서로 다른 조건이다. 필요한 옛 원고의 등록 사본은 명시적으로 현재 문서 생성기를 사용하며 원본/기존 작품에 자동 적용하지 않는다. 제한 TSV의 전체 보존 행과 정식 다중 탭 워크북 편집을 구분한다. [파일/읽기 검증](reader-file-current-regression-validation.md).


## Mac mini Docker의 실제 저장 어댑터 (2026-10-16)

사용자가 [ADR0023](../decisions/0023-mac-mini-docker-and-linked-login.md)에서 현재 Mac mini Docker 호스팅을 확정했다. `server/compose.storage-test.yml`은 기존 서비스와 분리된 Next 전용 PostgreSQL16·내부 네트워크·볼륨을 사용하고 호스트 DB 포트를 열지 않는다. 기존 서비스/비밀값을 재사용하지 않고 서버 의존성은 Docker 내부에서 별도 pnpm lock으로 설치한다.

`postgres-save-port.ts`는 receipt 조회 전에 scope/record 단위 advisory transaction lock을 획득하고 실제 트랜잭션 안의 명시적 authorization hook을 실행한다. 기대 revision 비교와 JSONB projection·bytes blob·receipt를 한 client/트랜잭션에서 기록한다. 다른 key의 동시 수정은 하나만 저장되고 동일 요청은 성공 receipt를 재생한다. SQL은 매개변수로 전달하며 rollback까지 실패한 연결은 풀에서 폐기한다. 실제 인증/ACL 행 잠금과 서비스 catalog 정책은 아직 host에 연결되지 않았다.

`snapshot-projection.ts`는 오디오 data만 별도 bytes로 분리하고 Asset ID·이름·종류·출처·메타데이터·순서를 작품 projection에 유지한다. 복원은 bytes 재결합 후 기존 공유 validator/hash/asset references를 통과해야 한다. DB의 별도 client project ID/format도 복원한 문서와 비교한다. prior private bytes의 내부 보존 검사는 신규 private 업로드 허용이 아니다.

[최초 실제 DB 검사](evidence/native-resume-2026-10-15/postgres/integration-initial.log)는 당시12개를 통과했다. 테스트를 먼저 작성했지만 최초 구현 전 RED 실행은 확보하지 못했으므로 TDD RED 완료라고 기록하지 않는다. 후속 적용에서 이미 실행된001 변경을 checksum gate가 거부했다([실패](evidence/native-resume-2026-10-15/postgres/integration-current.log)). 적용 당시001을 journal hash와 정확히 맞게 복원하고 blob trigger 추가는002로 옮겼다. DB/journal/기존 데이터를 초기화하지 않았다. [전진 migration 재검증](evidence/native-resume-2026-10-15/postgres/integration-forward-migration.log)은14개 통과하며 실제 DB 동시 수정/동일 재시도·충돌·양 형식 JSONB·private bytes·receipt 실패 원자 rollback·없는 record 생성 거부·권한 거부·무결성/ID 불일치·대상 혼용 거부를 확인한다.

순수 projection10개는 scoped coverage100%, rollback 연결 폐기는 실제 실패 RED 후 수정/단위 회귀로 확인했다. SQL adapter의 실제 DB 경로 전체 coverage80%는 아직 측정/증명하지 못했다. 호스트 단위 coverage의 미달 기록을 통과로 바꾸지 않는다. 별도 Docker DB14개 통과가 실제 API·OAuth·권한 정책·Web 동기화·삭제/복구·운영 백업/복원·공개 배포 완료를 의미하지 않는다. 실제 서비스의 나머지 구현은 같은 PC-04에서 이어간다.


## 가입·로그인·Google 연결 경계 (2026-10-16)

[ADR0023](../decisions/0023-mac-mini-docker-and-linked-login.md)의 확정 정책을 `server/auth/identity-links.ts`에 구현했다. 검증된 카카오 identity만 계정을 생성하며, 연결되지 않은 Google 로그인은 가입을 만들지 않는다. 로그인한 내부 계정에 검증된 Google identity를 명시적으로 연결한 뒤에는 두 제공자가 같은 내부 account ID를 반환한다. 이메일 자동 연결·계정 병합·다른 계정 identity 이전은 제공하지 않는다.

입력은 실제 verifier/session을 통과한 내부 값이어야 한다. TypeScript 타입이 인증 증거가 아니며 브라우저 입력을 이 함수에 그대로 넘기면 안 된다. transaction port는 identity 유일성, 계정 상태·identity 조회/쓰기 직렬화 또는 충돌 재시도, 가입 계정/identity의 원자 commit/rollback을 요구한다. 신규 카카오 계정에는 identity 삽입 성공이 반드시 확인되어야 하며 알 수 없는 adapter 결과는 거부한다. identity snapshot과 account ID는 비동기 호출 사이에서 변경되지 않도록 격리한다.

[검토 회귀 RED](evidence/native-resume-2026-10-15/auth/adapter-red.log) 후 [최종29개](evidence/native-resume-2026-10-15/auth/adapter-green-coverage.log)가 통과했고 순수 identity 모듈의 coverage 네 지표는100%다. 실제 Google/Kakao 토큰·nonce/state·session·HTTP·계정 DB adapter/트랜잭션 검증은 아직 미구현이다. 이 메모리 harness 결과를 실제 인증 완료로 확대하지 않는다.


## 실제 OIDC·세션·HTTP 및 로컬 API (2026-10-16)

앞 절의 순수 경계 이후 실제 구현을 연결했다. `server/auth/oidc-provider.ts`는 고정 provider endpoint·PKCE S256·RS256/JWKS·issuer/audience/nonce/시간을 검증한다. 세션/flow는 DB에 hash로 저장하고 flow는 브라우저·제공자·시작 세션에 묶어 한 번만 소비한다. callback은 계정 생성/연결·시작 세션 적격성·세션 회전을 하나의 재시도 가능한 SERIALIZABLE 트랜잭션으로 처리한다. 연결 후 구글 로그인은 동일 account ID를 반환한다. 이메일 자동 병합과 미연결 구글 가입은 거부한다.

세션은 가장 오래된 조상부터 잠근다. 조상 로그아웃은 자손까지 취소하며 별도 기기의 세션은 유지한다. 잠금 대기 후 현재 시각으로 만료를 다시 검사하고 쓰기 후에도 자격을 확인한다. state/nonce/서명/CSRF 오류, 콜백 도중 취소, 서로 다른 계정 연결과 동시 재시도는 실패 시 계정·identity·세션 일부만 남기지 않는다. SQL001~005는 checksum journal로 관리하며 이미 적용한 SQL을 고치지 않는다.

[실제 DB·HTTP 통합 및 scoped coverage](evidence/native-resume-2026-10-15/auth-service/integration-final-coverage.log)는13파일206검사 통과, statements94.4/branches93.12/functions99.29/lines99.81%다. PostgreSQL·HTTP listener·RSA JWT/JWKS는 실제이며 외부 제공자 응답 transport만 모의다. 이 수치는 해당 시점 서버 모듈 범위이며 전체 제품 coverage나 실제 카카오·구글 로그인 완료를 뜻하지 않는다. 만료 잠금 경합 RED와 이전 실패 로그도 보존한다.

Next 전용 API Docker는 host loopback15400에서 실행한다. [HTTP smoke](evidence/native-resume-2026-10-15/auth-api/http-smoke.json)는 live/config200, 실제 DB·journal 확인 후 ready503 `AUTH_PROVIDER_NOT_CONFIGURED`, 카카오 시작503을 확인했다. 현재 provider 비밀값을 연결하지 않았으며 기존 운영 서비스·자격증명·터널을 변경하지 않았다. 설정/패키징은 `server/README.md`가 안내한다. 후속 설정·유휴 DB 연결 오류 회귀 및 Web용 연결 시작 JSON 응답을 포함한 [통합 검증](evidence/native-resume-2026-10-15/auth-api/integrated-coverage.log)은15파일226검사 통과, scoped statements94.18/branches92.86/functions98.65/lines99.65%다. main/Compose/게이트웨이는 이 coverage에 포함하지 않는다. [소스 checkpoint](evidence/native-resume-2026-10-15/auth-api/integrated-checkpoint.json)로 해당 후보를 식별한다. Google 연결 시작 POST는 CSRF 검증 후200 JSON authorizationUrl, 로그인 시작 GET은302다. Web 계정 UI·문서 API/실제 소유권·catalog·동기화/삭제복구와 live OAuth·운영 백업복원은 남아 있다.


## Web 계정 동선과 기기 원고 보존 (2026-10-16)

서재의 접힌 계정 메뉴만 로그인 입구를 소유한다. 상대 `/api/v1/*` 요청으로 설정/세션을 확인하고, 카카오 가입·로그인, 연결한 Google 로그인, 명시적 Google 연결과 로그아웃을 제공한다. 계정 ID/CSRF는 메모리에만 두며 StoryDocument·workspace 원고·파일/export에 넣지 않는다. 로그인했다고 기기 작품을 자동 업로드하거나 다른 계정에 귀속/삭제하지 않는다. 세션401과 공급자 미설정/서비스 장애를 구분한다.

외부 인증 화면으로 이동하기 전에 기존 workspace 저장을 실제로 통과해야 한다. 한글 조합·저장 실패·다른 탭 writer 충돌은 이동을 차단하고 현재 원고를 유지한다. callback 복귀 의도는 별도 sessionStorage의 `knolstory-account-return-v1` 한 번용 값으로 보관한다. query만으로 인증을 인정하지 않고 `/me`를 다시 확인한다. 지연된 연결 응답은 메뉴 언마운트 후 이전 workspace를 쓰거나 이동할 수 없으며, 마운트 중에는 최신 저장 가드를 사용한다. 같은 화면에서 계정 상태 재확인 이벤트가 오면 이전 Google 연결 요청을 즉시 무효화한다. 포커스 재조회로 계정/CSRF가 달라진 경우도 이전 연결 주소를 사용하지 않는다. 오래된 요청의 성공·실패·종료 처리는 새 요청의 이동·재조회·대기 상태를 바꾸지 않는다. [지연 연결 검증](evidence/account-link-stale-2026-10-20/checkpoint.json). 로그아웃은 account 메모리만 갱신하고 기기 원고/읽기/복구 자료를 지우지 않는다. 로그아웃 중 focus 재조회는 직렬화한다.

[Web 소스·검증 manifest](evidence/account-web-2026-10-16/source-and-verification.json)에12단위 검사와 네 지표80% 이상인 순수 모듈 coverage, 타입/린트,8브라우저 검사와 이후 영향받은4집중 검사의 각 범위를 기록했다. 브라우저 계정 API는 모의이며 실제 작품 생성/수정/재열기/보존과 저장 거부·지연 응답·CSRF 요청을 확인한다. [배포용 빌드](evidence/account-web-2026-10-16/build.log)도 통과했다. 기존 원고/native 검증을 이번 실행으로 다시 집계하지 않는다. 실제 provider OAuth와 문서 API/동기화는 별도 잔여다.


동일 origin 후보는 `server/operations/web-api-proxy.mjs`가 loopback에서 정적 Web과 `/api/*`를 연결한다. incoming Host를 정확히 확인하며 개발 HMR upgrade는 동일 Host/Origin의 `/_next/hmr`에만 허용한다. 개발 브라우저의 초기화 정지를 재현한 뒤 이 연결을 보완했고, upgrade 대기 중 socket 오류도 즉시 처리한다. 실제 HTTP/101/양방향 연결·대용량 스트리밍·오류/타임아웃·host 거부6검사를 통과했다. 개발 검증의 별도404와 최초 실패는 기록에 남긴다.

[최종 정적 Web + 실제 Docker API 브라우저](evidence/native-resume-2026-10-15/auth-api/gateway-production-browser.json)는 계정 메뉴 초기화·설정200·세션401·공급자 disabled 버튼과 pageerror0을 확인했다. 새 정적 빌드·개발 Web·gateway·API는 별개 실행 대상이며 실제 provider OAuth는 수행하지 않았다. [최종 checkpoint](evidence/account-web-2026-10-16/final-checkpoint.json)는 새 빌드/서버/gateway 근거와 보호 artifact483개 변경0을 연결한다. 이 로컬 후보는 외부 도메인 배포나 운영 서비스 전환이 아니다.


## 소유자 전용 작품 API (2026-10-16)

`server/documents/service.ts`는 계정 작품의 생성·목록·읽기·기존 수정을 구현한다. 서버 UUID record ID·소유자·시각은 작품 파일 밖에 둔다. 006 전진 migration은 기존 records에 연결되는 private_documents/생성 receipt를 추가하며 무소유 레코드를 자동 귀속하지 않는다. 소유자는 현재 세션에서 도출한다. 생성은 revision1, 수정은 같은 형식/client project ID를 유지하며 다른 identity 덮기는409다.

| HTTP | 계약 |
|---|---|
| POST `/api/v1/documents` | `{payloadVersion:1,snapshot}`와 Idempotency-Key; 신규201/동일 재시도200 |
| GET `/api/v1/documents` | owner metadata 목록; limit1~50, cursor256자 이하, updatedAt/recordId 내림차순 keyset |
| GET `/api/v1/documents/:uuid` | 같은 트랜잭션의 metadata/revision/snapshot |
| PUT `/api/v1/documents/:uuid` | `{payloadVersion:1,expectedRevision,snapshot}`와 Idempotency-Key; 저장/receipt 재생200 |

모든 경로는 현재 세션을 요구한다. 쓰기는 body 읽기 전에 exact Origin/CSRF를 검증하고 중복 header/query/cookie·미지원 key/type·body 초과/중단/시간 초과를 거부한다. 멱등 키는 ASCII 영숫자/밑줄/하이픈1~128자다. 생성 receipt는 소유자+키에 묶고 전체 요청 hash를 확인한다. 수정은 기존 saveExisting의 receipt-first/revision/원자 저장을 재사용한다. 타인과 없는 ID는 같은404이며 revision을 노출하지 않는다.

트랜잭션 잠금은 가장 오래된 세션 조상, 현재 세션/계정 SHARE, 대상 advisory, 소유/레코드 순서다. DB 안의 세션/소유 검증과 COMMIT 직전 현재 시각 만료 검사를 통과해야 한다. 생성 records/소유/receipt, 수정 projection/bytes/receipt/metadata는 함께 commit 또는 rollback한다. loadStoredRecordOnClient는 revision/snapshot을 함께 읽고 기존 loadStoredSnapshot wrapper를 유지한다.

등록 자료 검사는 asset-registry의 단일 assertCatalogOnlyMedia가 소유하며 Web은 재수출한다. 새 생성/수정은 archive/hash 뒤 같은 gate를 통과한다. 읽기는 신규 반입 gate를 적용하지 않아 기존 소유 작품 private bytes/metadata를 보존한다. 소유 이전·guest 자동 업로드·공유·학급 접근·삭제/보관 기본값은 추가하지 않았다.

[실제 Docker DB·HTTP](evidence/document-api-2026-10-16/integration-final.log)22파일337검사 통과, scoped statements93.86/branches92.62/functions99.06/lines99.74%. 권한·동시 수정·재시도·두 형식 전체 왕복·private 읽기/신규 거부·만료 롤백을 포함한다. 첫 실행의 migration 개수 고정 실패를 보존하고 전체 목록 checksum 검사로 수정했다. 이후 pagination 경계를 서비스와 맞춘 RED 뒤 [35개 집중 검사](evidence/document-api-2026-10-16/http/bounds-green-coverage.log)를 통과했으며337과 합산하지 않는다. [공용 catalog](evidence/document-api-2026-10-16/catalog/coverage.log)와 [실제 API gateway 인증 거부](evidence/document-api-2026-10-16/docker-api-smoke.json)는 별도 근거다. live OAuth·Web 동기화/삭제복구·운영 백업/복원은 남아 있다.


## Web 온라인 업로드·독립 사본과 재시도 (2026-10-16)

서재의 온라인 작품 메뉴는 개인 기기 작품의 명시적 업로드·목록·독립 사본 열기를 제공한다. 로그인만으로 업로드하지 않는다. `document-api.ts`는 고정 상대 경로·현재 CSRF·엄격한 metadata와 snapshot/hash/형식/project ID 검증을 사용한다. 오류 응답의 임의 서버 문자열을 UI에 전달하지 않는다.

`online-work-bindings.ts`는 계정+기기 작품별 별도 knolstory-online-work-v1 namespace에 서버 record/project ID·revision·확인한 내용 hash 및 전송 대기 요청을 둔다. StoryDocument/공식 파일/workspace 원고에 계정/동기화 필드를 넣지 않는다. 전송 전 전체 snapshot과 멱등 키를 기기에 기록해야 하며 실패하면 HTTP를 보내지 않는다. 저장 응답 유실·기기 acknowledgment 실패 시 다음 실행은 정확히 같은 요청을 재생한다. 그 뒤의 새 원고까지 보관됐다고 표시하지 않고 필요하면 다시 저장하도록 안내한다.

서버가422 CATALOG_MEDIA_REQUIRED 또는400 INVALID_SNAPSHOT으로 쓰기 전 검증 거부를 확정한 경우에만 해당 대기 요청을 CAS로 해제하여 수정 후 재시도를 허용한다. 네트워크 실패·불명확한 응답·revision 충돌은 대기 요청을 보존한다. 기록 손상/다른 창 변경/쓰기 권한·용량 실패는 원고나 기록을 초기화하지 않는다.

원격 작품은 전체 검증 후 항상 새 기기 project ID로 복사한다. 원본 저작 내용·Asset ID·Flow·StageComposition·첨부는 보존하며 다른 기기 원고를 덮지 않는다. 연결 사본의 다음 업로드 snapshot에서 project ID만 원래 서버 project ID로 되돌려 기존 서버 레코드의 identity를 유지한다. 단순 기기 사본 만들기는 연결을 승계하지 않으므로 새 온라인 작품으로 업로드할 수 있다. 다른 계정으로 바꾸면 같은 기기 작품의 연결 정보도 별도다.

한글 조합·손상 hydration·writer 충돌·기기 저장 실패는 이동/가져오기 적용을 막는다. 비동기 작업은 패널 수명/계정/요청 순서뿐 아니라 원고·삭제 복구 상태 generation을 확인한다. 온라인 복원 도중 같은 서재에서 삭제·복구를 해도 과거 closure가 원고/checkpoint를 되돌릴 수 없다. 로그아웃은 같은 화면의 계정 상태를 알리고 지연된 읽기를 무효화한다.

[순수 client/journal13검사](evidence/online-works-2026-10-16/unit-final-coverage.log)의 한정 coverage는 statements89.79/branches89.1/functions100/lines100%다. [Web 최종8검사](evidence/online-works-web-2026-10-16/browser-final.log)는 모의 API와 실제 기기 원고/클릭 경계를 확인한다. 삭제 경합과 로그아웃 경합의 RED/수정 결과는 같은 evidence에 보존한다. [실제 배포용 Web·Docker API·PostgreSQL 브라우저](evidence/online-works-2026-10-16/actual-browser.json)는 모의 HTTP 없이 신규201·독립 사본·연결 수정200/revision2·원본/서버 identity 보존과 pageerror0을 확인했다. 검사용 합성 세션을 사용했고 종료 후 취소/비활성화했으며 live Kakao/Google 로그인은 아니다. 서버/API의 이전337검사를 이번 Web 검사로 다시 집계하지 않는다.

현재 온라인 Web 연결은 KnolStory 서재 범위다. ShortStory 연결·실제 별도 기기/오프라인 장기 복구·온라인 삭제/복구/보관·학급/공유·live OAuth 및 운영 백업/복원은 남아 있다. 기록의 localStorage 용량 부족은 기기 원고를 보존한 채 전송을 중단하며 대형 작품 전송 성공으로 처리하지 않는다.


목록은 불러온 계정 ID를 함께 보관하고, 세션 확인 완료 및 현재 계정 일치 때만 렌더링한다. 계정 전환 첫 활성 프레임에서 이전 계정 제목이 노출되던 MutationObserver RED 후 [집중1검사](evidence/online-works-web-2026-10-16/account-isolation-green.log)로 수정했다. 이전8실행과 합산하지 않는다. 이 변경을 포함한 [최종 빌드](evidence/online-works-2026-10-16/build-final.log)와 [실제 DB 브라우저 재확인](evidence/online-works-2026-10-16/actual-browser-final.log)도 통과했다. `server/operations/verify-online-browser.mjs`는 전용 Next 테스트 DB와 합성 세션만 사용하며, 이후 실행 증거에는 서로 다른 run 이름을 사용한다.


## ShortStory 온라인 연결과 분리 저장소 검사 (2026-10-16)

그림책 화면도 공용 온라인 메뉴·API client·계정별 재시도 journal을 사용한다. 기기 연결 key는 shortstory:bookId로 구분하며 저작 파일에는 넣지 않는다. 새 온라인 사본은 그림책 ID만 새로 발급하고 쪽 ID/순서·표지·글·메타데이터는 그대로 보존한다. 연결 사본의 서버 갱신 snapshot에서는 원래 서버 project ID를 복원한다. 다른 형식의 작품은 해당 화면에서 열도록 안내하며 잘못된 형식 importer를 호출하지 않는다.

그림책 원고와 library/deleted/쪽 위치의 generation을 비동기 작업 전후에 확인한다. 조합 입력·손상 저장·writer 충돌·용량 실패는 저장이나 사본 적용을 차단한다. 별도 표지 편집 초안이 열린 동안 계정/온라인 메뉴를 마운트하지 않는다. 로그인 이동 전 최신 그림책 보관함을 저장하고, 고정된 return target을 통해 그림책으로 돌아온다. 한 번용 UI 기록은 기기 sessionStorage에 읽기/쓰기 모드를 보관하며, 기존 쪽 위치와 함께 복원한다. OAuth query 자체는 인증 증거로 사용하지 않는다. 이 복귀가 KnolStory workspace를 쓰지 않는지 검사한다.

서버 응답을 기다리는 동안 그림책을 더 고치면, 완료 안내는 이후 수정까지 저장됐다고 주장하지 않는다. 응답 후 generation이 달라졌으면 다시 저장하도록 알리고 현재 기기 원고를 유지한다. 이 알림의 [RED](evidence/shortstory-online-2026-10-16/in-flight-edit-red.log) 후 [집중 GREEN](evidence/shortstory-online-2026-10-16/in-flight-edit-green.log)을 확인했다.

[모의 API Web6검사](evidence/shortstory-online-2026-10-16/browser-with-reading.log)는 PC/phone 전체 그림책 보존·독립 사본·연결 수정·IME/표지/저장 실패·삭제 지연 경합·로그인 쪽/모드 복귀를 확인한다. 이후 위 저장 중 편집 안내1개를 집중 검증했고 합산하지 않는다. [UI 복귀 순수8검사](evidence/shortstory-online-2026-10-16/view-green-coverage.log)의 scoped coverage는 statements90.69/branches92.3/functions100/lines100%다. 공유 복귀 경로 변경의 [기존 KnolStory 로그인 집중 검사](evidence/shortstory-online-2026-10-16/knol-callback-impact.log)도 통과했다.

실제 API 검사는 `server/operations/verify-shortstory-browser.mjs`가 전용 Next DB·합성 세션을 사용한다. 한 Mac의 분리된 두 browser context에서 실제 생성/사본/갱신·오래된 revision409·로컬 충돌 원고와 서버 새 원고 보존을 확인한다. 응답 유실은 실제 서버가 commit한 응답만 끊어 주입하며, reload 후 같은 key와 body가200 replay되고 같은 제목 작품이 한 개만 남는지 검사한다. 이는 실물 기기나 live OAuth 증거가 아니다. 테스트 세션은 취소하고 계정은 비활성화하며 테스트 문서를 자동 삭제하지 않는다.


[최종 배포용 빌드](evidence/shortstory-online-2026-10-16/build-final.log)와 [실제 두 context 결과](evidence/shortstory-online-2026-10-16/actual-two-context-final.json)가 통과했다. 최초 실제 검사 실패는 동적 textarea의 label 선택, 초기 hydration 전 library 접근, 열린 메뉴 overlay를 닫지 않은 검사 동선 문제였다. 실제 library/화면 진단을 남겨 원고/사본은 보존됐음을 확인하고 role 선택·hydration 대기·실제 Esc 동선으로 검사 도구를 고쳤다. 원래 실패 로그와 진단은 보존하며 제품 성공 검사와 합산하지 않는다. 로그인 읽기 모드와 저장 중 편집 안내는 별도 제품 RED→GREEN 수정으로 구분한다.


## 온라인 삭제·복구의 결정 경계 (2026-10-16)

[ADR0024](../decisions/0024-private-document-api.md)는 현재 API를 생성/목록/읽기/갱신으로 한정한다. 보관 기간 미지정은 무기한 보관·즉시 삭제 중 어느 쪽의 승인도 아니다. 삭제 후 숨김/tombstone·삭제 직전 고정본·기존 record 복원 또는 새 사본 생성·receipt 제거/만료도 삭제 의미를 결정하므로 답변 전에 활성 route/migration으로 추가하지 않는다. 서버 삭제가 기기 원고를 지우는 기능도 현재 구현하지 않는다.

사용자에게 제시한 추가 선택은 온라인 휴지통 이동 후 같은 온라인 작품 복구(추천) 또는 새 독립 작품 복구다. 이는 보관 기간 질문과 별개이며 현재 어느 쪽도 확정되지 않았다. 확정 후 구현할 때에는 기존 세션 가족/root→현재 세션·계정→target→소유권/작품 잠금 순서를 공유하고, 삭제와 동시 저장·생성 응답 유실 후 replay·삭제 후 늦은 저장·복구 후 오래된 revision을 실제 DB에서 검증해야 한다. 현재 authored document와 ID/Flow/StageComposition을 임의로 변환하지 않는다.

잠금 helper/소유자 transaction 추출은 가능하지만 현재 호출이 이미 공통 경계를 사용하므로, 미확정 기능을 위한 추상화만 추가하지 않았다. 이번 대조는 삭제·복구 구현이나 새로운 제품 회귀 검증으로 집계하지 않는다. 미결 선택과 해제 후 다음 작업은 [단일 실행 계획](product-completion-plan.md)이 소유한다.

## 계정 경계의 로컬 API 후보 연결 (2026-10-16)

기대 계정 대조가 포함된 API 이미지를 재빌드하고 `knolstory-next-api-dev`의 API 서비스만 교체했다. 전용 PostgreSQL/볼륨·gateway15401·정적 Web3126은 유지했다. bind는127.0.0.1:15400이며 공개 도메인이나 기존 서비스 전환은 하지 않았다. [활성 후보 식별자](evidence/account-api-candidate-2026-10-16/api-after.json), [빌드](evidence/account-api-candidate-2026-10-16/build-api.log)를 보관한다. [제공자 설정](evidence/account-api-candidate-2026-10-16/provider-config.json)은 계속 비활성이며 ready503 `AUTH_PROVIDER_NOT_CONFIGURED`는 예상된 제한이다. 실제 제공자 로그인/출시 준비 완료로 주장하지 않는다.

`server/operations/verify-account-candidate.mjs`는 실제 정적 ShortStory Web→gateway→API→PostgreSQL을 사용한다. [실제 결과](evidence/account-api-candidate-2026-10-16/actual-409b8504-9682-41f3-a34a-8d7d72a68f83.json)는 쿠키만 A→B로 바꾼 뒤 stale 기대 계정의 목록/읽기/쓰기409, B의 유효한 CSRF를 사용해도 A 기대 계정 쓰기 거부, 명시적 계정 재확인 뒤 독립 binding 생성, A로 돌아와 revision2 갱신을 확인한다. 실제 세션을 DB에서 폐기한 뒤401→새 합성 세션·갱신 CSRF→같은 pending key/body로 revision3 저장, B의 revision1 원고 보존과 로그아웃 전파·기기 원고 보존도 확인한다. HTTP 모의나 실제 OAuth는 사용하지 않았다. 같은 후보에서 [놀스토리 생성/독립 사본/연결 갱신](evidence/online-works-2026-10-16/actual-browser-account-bound-candidate-06db0473-4cee-4af0-a5fa-018c7771c7fb.json)도 실제 Web/API/DB로 확인했다. 기존 검사를 반복한 이유는 기대 계정 헤더가 추가된 새 클라이언트와 새 API 이미지의 통합 경계가 바뀌었기 때문이다.

초기화/브라우저 실행 실패도 cleanup 범위에 포함하며, 브라우저 종료와 각 계정/세션 정리는 독립적으로 시도한 뒤 오류를 모은다. 독립 검토에서 지적한 초기화 실패·cleanup 중단 P2를 보완한 뒤 실행했다. [실제 cleanup 확인](evidence/account-api-candidate-2026-10-16/cleanup.json)은 합성 계정2개 비활성·세션3개 폐기를 DB에서 확인한다. 검증 문서는 유지하며 기존 원고 전체의 전후 hash 검사를 수행했다고 주장하지 않는다.

[기존23컨테이너 메타데이터](evidence/account-api-candidate-2026-10-16/legacy-preservation-normalized.json)는 ID/image/start/restart/ports/mount identity가 기존 기준과 일치한다. 첫 raw 비교의 두 차이는 Docker가 반환한 mount 순서이며 별도 기록을 보존했다. 기존 DB의 내용이나 비밀 값은 읽지 않았다. [checkpoint](evidence/account-api-candidate-2026-10-16/checkpoint.json)가 source와 남은 운영 범위를 연결한다.

## 계정 재확인 전파와 저장 재시도 (2026-10-16)

계정 메뉴와 온라인 작품 메뉴는 각각 세션을 조회하지만, 사용자가 명시적으로 재확인하면 기존 `knolstory-account-session-changed` 이벤트로 모든 현재 화면의 소비자를 무효화하고 다시 조회한다. 초기 로딩과 focus 조회는 로컬로 실행하며 재방송하지 않는다. 온라인 작품 메뉴에도 재확인 버튼을 제공해 서비스 오류·세션 만료 후 같은 화면에서 재시도할 수 있다. 원고·온라인 binding/pending은 수정하지 않는다. 다른 브라우저나 탭으로의 실시간 통지는 이번 범위가 아니며, 요청의 기대 계정/서버 권한 검사는 계속 적용한다.

로그아웃 완료는 조회 generation과 별도로 처리한다. 중간에 재확인이 발생하거나 요청을 시작한 hook이 unmount돼도 성공·불확실한 실패 모두 현재 소비자에게 상태 변경을 알린다. hook 자체의 상태 변경만 mounted 조건으로 보호한다. 실패 시 실제 세션 상태를 다시 읽고 실패 안내를 남긴다. 오래된 `finally`가 새 재조회의 loading을 종료하지 않는다.

[계정 메뉴 재확인 RED](evidence/account-refresh-2026-10-16/menu-refresh-red.log), [숏스토리 재시도 RED](evidence/account-refresh-2026-10-16/short-retry-red.log), [로그아웃 경쟁 RED](evidence/account-refresh-2026-10-16/logout-race-red.log), [응답 실패 경쟁 RED](evidence/account-refresh-2026-10-16/logout-ambiguous-red.log)를 보존했다. 수정 후 [메뉴/로그아웃 집중4검사](evidence/account-refresh-2026-10-16/final-menu-logout-green.log), [숏스토리 집중1검사](evidence/account-refresh-2026-10-16/final-short-green.log), [재마운트 집중1검사](evidence/account-refresh-2026-10-16/unmount-final-green.log)가 dev Web에서 통과했다. [새 정적 빌드](evidence/account-refresh-2026-10-16/build.log)의 [집중6검사](evidence/account-refresh-2026-10-16/production-browser.log)도 통과했다. 숏스토리는401 뒤 동일한 요청 key/body와 갱신된 CSRF로 저장을 재시도하고 원고가 보존되는지 확인한다. API는 모의이며 live OAuth/기기 전환/서버 통합 완료로 집계하지 않는다.

재마운트의 첫 검사는 자동 저장의 `savedAt` 차이를 원고 변경으로 비교해 실패했다. 실패 log/trace를 보존하고 작품 key·모든 project·활성 project를 비교하도록 수정했다. 제품 저장 의미를 바꾸지 않았다. [checkpoint](evidence/account-refresh-2026-10-16/checkpoint.json)에 최종 source와 검증 범위를 연결한다.

## 온라인 요청의 기대 계정과 작업 수명 (2026-10-16)

다른 탭의 로그인 전환으로 화면이 기억한 계정과 쿠키의 실제 계정이 달라질 수 있다. Web의 목록/페이지 추가/읽기/생성/저장은 `X-Knolstory-Account-Id`에 작업 시작 당시의 기대 계정을 전달한다. 서버는 쿠키로 인증한 계정만 권한 문맥으로 사용하며, 기대 계정이 다르면 body 처리/작품 service 호출 전에409 `ACCOUNT_SESSION_CHANGED`로 거부한다. 헤더는 권한을 부여하지 않는다. malformed/중복/빈 헤더는400, 세션이 없으면401이다. 헤더 없는 기존 API는 유지한다. 해당 헤더를 무시하는 이전 서버와 새 클라이언트의 조합은 이 보호를 증명하지 않는다.

이 오류는 원고나 pending 요청을 지우지 않는다. 현재 클라이언트는 안전한 오류를 표시하고 기기 원고를 유지한다. 실시간 탭 간 로그인 상태 전파나 자동 재인증까지 구현된 것은 아니다. 쓰기에는 기존 세션 결합 CSRF도 유지되며, 이 변경의 핵심은 GET 결과를 잘못된 계정 연결 기록에 붙이지 않는 것이다.

KnolStory 저장 준비 중 삭제/작업 변경은 workspace generation으로 검사한다. 두 제작 모드 모두 pending 준비·검증·hash의 마지막 await 이후 HTTP 직전까지 현재 작업인지를 다시 확인한다. 취소 시 정확한 pending 기록을 보존하고 전송을 멈춘다. 전송 후 편집이 발생하면 이전 snapshot의 acknowledgment를 최신 내용 저장으로 안내하지 않는다.

[서버45검사](evidence/account-bound-documents-2026-10-16/backend-green.log), [클라이언트15검사와 scoped coverage](evidence/account-bound-documents-2026-10-16/final-client-coverage.log), [실제 PostgreSQL/HTTP 집중1검사](evidence/account-bound-documents-2026-10-16/actual-db.log), [브라우저 집중2검사](evidence/account-bound-documents-2026-10-16/final-browser.log)로 검증했다. [새 정적 빌드](evidence/account-bound-documents-2026-10-16/build.log)의 [같은 두 검사](evidence/account-bound-documents-2026-10-16/production-browser.log)도 통과했다. 브라우저 검사는 모의 API이며 실제 제공자 로그인/물리 기기 검사로 집계하지 않는다. 현재 Docker API의 활성화 완료로도 주장하지 않는다. 실제 DB 검사는 새 합성 계정 둘과 문서를 만들고 세션을 취소했으며 기존 원고를 수정하지 않는다. [checkpoint](evidence/account-bound-documents-2026-10-16/checkpoint.json)에 source 식별자와 남은 범위를 기록한다.

## 정적 Web·자료·runtime의 비활성 복원 (2026-10-16)

`server/operations/static_release.py`는 현재 `apps/web/out`을 새 private backup과 restore 디렉터리에 복사한다. source 전후·backup·restore의 파일별 bytes/SHA256을 비교한다. 기존 경로 덮기·삭제·압축 해제·트래픽 활성화는 제공하지 않는다. 경로/중복 JSON key/개수·크기 제한, secret 파일명, symlink/hardlink/special file과 부모 symlink를 검증한다. 생성 디렉터리는0700, 파일은0600이다. 같은 사용자 권한의 동시 공격까지 방어하거나 서명된 배포물임을 보장하지 않는다.

[실제 복사/복원](evidence/static-restore-2026-10-16/actual-copy.json)은1,479파일/807,636,285bytes다. 사본은 checkout 밖 사용자 전용 경로에 유지한다. 공통 catalog/runtime도 내부 유지보수 사본에 포함되지만 음원 원본 다운로드 기능·외부 배포·새 미디어 확보를 추가한 것은 아니다.

`serve_static_restore.py`는 manifest 전체를 확인한 뒤 loopback에서 복원본만 제공한다. 매 요청에서 allowlist와 동일 FD의 SHA/크기/권한/regular file 여부를 검사한200 응답에만 manifest/run 헤더를 붙인다. 시작 후 변경은409, 미등록 파일은404, 디렉터리 목록은403이다. 독립 검토의 부모 symlink·시작 후 변경 파일 제공·trailing slash P2를 보완했다. [복사 모듈12검사](evidence/static-restore-2026-10-16/python-unit.log)와 [HTTP3검사](evidence/static-restore-2026-10-16/preview-trailing-green.log)가 통과했다. 복사 모듈 line coverage96%, branch coverage 미측정이다.

[실제 복원 browser 결과](evidence/static-restore-2026-10-16/browser-result.json)는 별도 origin의 서재, 실제 Ren’Py WASM/장면 acknowledgment·다음 컷, ShortStory 이미지 bytes/다음 쪽을 확인했다. 외부 HTTP 요청·누락 정적 파일·pageerror는0이다. API proxy 없는 preview이므로 계정 API404는 허용하며 live OAuth/온라인 서비스 복원으로 집계하지 않는다. 첫 실패는 표지의 읽기 시작 누락, 다음 실패는 브라우저 최초 소리 시작 동작 누락이었다. 제품/복원 파일 수정 없이 테스트에 실제 사용자 동작을 추가해 통과했고 두 실패 log/trace는 보존한다.

이는 같은 Mac의 로컬 파일 복원 및 실행 확인이다. 외부 보관 매체/암호화·secret/cluster권한·실물 장애·실제 운영 전환·통합 복구는 남아 있다. 명령은 [서버 README](../../server/README.md#private-static-release-rehearsal), 식별자는 [checkpoint](evidence/static-restore-2026-10-16/checkpoint.json)가 소유한다.

2026-10-17 현재 키보드 입력 후보는 별도 새 private backup/restore로 보관했다. 원본/백업/복원1,479파일·807,646,312bytes의 manifest SHA256이 일치하며 과거 백업/복원도 기존 manifest로 다시 일치 확인했다. 별도3143 origin의 복원 파일만으로 실제 WASM·키보드 소리 시작·다음 컷·ShortStory 이미지/다음 쪽을 확인했다. browser 산출물은 실행별 출력으로 이동해 과거 evidence를 덮지 않는다. [현재 후보 checkpoint](evidence/static-restore-keyboard-2026-10-17/checkpoint.json)가 새 식별자·파일 hash·실행·한계를 소유한다. 같은 Mac 사본의 범위이며 외부/전체 운영 복구의 완료로 확대하지 않는다.

## Next 전용 DB 논리 백업·복원 (2026-10-16)

`server/operations/backup-restore.mjs`는 고정 Next 테스트 컨테이너/DB만 백업한다. repeatable-read transaction에서 export한 snapshot을 pg_dump와 source inventory가 함께 사용하므로 동시 변경 시점이 달라진 비교를 하지 않는다. custom archive는 새로 발급한 restore DB에만 single-transaction/exit-on-error로 복원한다. source 덮기·DROP·clean·기존 DB 재사용은 제공하지 않는다. [PostgreSQL16 pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html)의 동작을 확인했다.

백업 파일과 상세 inventory는 checkout 밖 사용자 전용 디렉터리에0700/0600으로 보관한다. 원고/bytes/세션 자료·자격증명을 공개 evidence에 복사하지 않는다. 공개 결과는 archive SHA256/크기·테이블별 행 수/내용 SHA256·스키마 객체 수만 보관한다. 보관 기간·자동 삭제·백업 주기·외부 전송은 정하지 않았다.

[검토 보완 후 실제 backup/restore 및 단위12검사](evidence/backup-restore-2026-10-16/actual-reviewed-coverage.tap)는 통과했고 해당 운영 모듈 Node coverage는 lines97.25/branches91.89/functions87.88%다. [최종 복원 비교](evidence/backup-restore-2026-10-16/restore-2026-10-16T08-46-18-291Z-6756e9b6.json)는10테이블 전체 row count/hash와 column/constraint/index/function/trigger/view/sequence inventory 일치를 확인한다. 기존 DB·볼륨·journal을 초기화하지 않았다.

[복원 전용 공용 검증3개](evidence/backup-restore-2026-10-16/restored-reviewed-source-comparison.log)는 migration6 체크섬, 실제 문서 복원/자산 검증, blob 불변 trigger를 확인한다.181행 중171개가 공용 검증을 통과했고126 KnolStory/45 ShortStory 및 기존 개인 첨부11개를 읽었다.10개 행은 검증에서 거부됐으며 그대로 보존한다. 동일 snapshot row hash가 원문 보존을 증명하며, 거부 행을 정상 문서로 보정하거나 전체 데이터가 유효하다고 주장하지 않는다.

최초 probe 설정은 mergeConfig의 include 배열 결합으로 검증용 복원 DB에서 기존 서버 fixture suite도 실행했다([기록](evidence/backup-restore-2026-10-16/restored-content.log)). 원본 DB에는 실행하지 않았고 과거 로그/검증용 DB는 보존했다. config를 단일 include로 바꾼 뒤 새 restore DB에서3개만 실행한 결과를 최종 근거로 사용한다.342개 실행을 이번 복원 성과로 집계하지 않는다.

현재 범위는 같은 Mac mini/PostgreSQL16의 비활성 논리 복원 사본이다. cluster role/grant, 외부 service secret, 정적 catalog/runtime 파일, 외부 백업 위치/암호화, 실물 장애 및 운영 트래픽 전환은 별도 gate다. 과거 backup의 session/flow를 운영에 활성화할 때 이후 취소를 되살리지 않는 운영 절차도 필요하다. 이 검사는 복원 credential이나 traffic을 활성화하지 않았다.


독립 검토에서 발견한 검사/운영 P2를 수정했다. 복원 read 결과는 현재 source의 레코드별 raw hash·valid content hash 또는 validator error fingerprint와 정확히 비교하고, DB 오류·TypeError·누락 레코드는 손상 행 집계로 숨기지 않는다. 트리거 검사는 정확한 P0001/code와 Stored audio blobs are immutable 메시지를 요구한다. 같은 현재 검증기의 원본/복원 동등성 검사이며 과거 검증기 버전 대비 회귀 전체를 증명하지는 않는다.

snapshot exporter는 정상 ROLLBACK 뒤 close를 기다리고, grace 기한 후 SIGTERM/SIGKILL/reap deadline으로 종료를 제한한다. 반복 pipe 오류가 deadline을 연장하지 않으며 late error도 실제 reap까지 처리한다. 서버의 idle-in-transaction timeout도5분으로 제한한다. fake child RED→GREEN과 실제 backup을 함께 검증했다. 이전 검토 전 결과는 보존하고 최종12+3의 범위를 별도로 집계한다.


## 복원본의 과거 인증 무효화 (2026-10-16)

이전 backup 이후 취소된 쿠키/진행 중인 로그인 요청을 역사적 snapshot 복원으로 되살리지 않도록, 별도 오프라인 유지보수 명령을 구현했다. `restore-session-fence.mjs`는 새 restore UUID 이름과 실제 current_database의 정확한 일치를 쓰기 전에 확인한다. 다른 client backend가 있으면 거부하며, sessions/flows 잠금을 제한 시간 안에 얻어 기존 세션을 전부 revoked 처리하고 진행 flow를 한 트랜잭션에서 제거한다. 계정·identity 연결·문서·자산·receipt·journal 및 세션 조상 행을 삭제하지 않는다.

일반 API·서버 시작·migration에 자동 연결하지 않았다. CLI는 명시적 확인값과 Next 전용 host/user/port·비밀 파일을 요구한다. 운영 후보 프로세스와 트래픽이 멈춘 새 복원본에서만 사용한다. 다른 클라이언트 확인은 이후 새 접속을 차단하지 않으므로 트래픽 격리 장치라고 주장하지 않는다. 원본/현재 서비스/과거의 정확한 비교 복원본은 건드리지 않고, 검증된 private archive에서 별도 [rehearsal copy](evidence/restore-auth-2026-10-16/rehearsal-copy.json)를 만들었다.

[단위5검사](evidence/restore-auth-2026-10-16/coverage.tap)는 DB명/활성 client 거부·원자 commit/rollback·rollback 실패 연결 폐기를 확인하며 scoped Node coverage는 lines100/branches95.83/functions100%다. [실제 HTTP/DB](evidence/restore-auth-2026-10-16/actual.log)는 유효했던 합성 쿠키200→401, 이전 flow 거부·미폐기 세션/flow0·계정/identity/문서/blob/receipt/journal8테이블 hash 보존·멱등 재실행을 확인한다. [실제 다른 client 연결 거부](evidence/restore-auth-2026-10-16/actual-activity-check.log), [실제 flow 삭제 실패 시 세션까지 rollback](evidence/restore-auth-2026-10-16/actual-rollback-check.log)은 추가 집중 실행으로 각각 확인했고 같은 전체 실행으로 합산하지 않는다. [운영 CLI](evidence/restore-auth-2026-10-16/cli.log)도 해당 비활성 copy에서0/0 멱등 결과를 확인했다.

이는 로컬 비활성 복원본의 인증 정리와 원고 보존 검사다. 새 provider secret 발급/회전, 실제 OAuth, 외부 라우팅/운영 전환, cluster 권한과 정적 파일 복구는 수행하지 않았다. 진행 flow는 임시 인증 상태이며 작품/제출/탈퇴/백업의 보관 기간을 결정하거나 자동 삭제하는 정책이 아니다.

## 읽기 설정과 컷 내부 위치 — 2026-10-18

[읽기 개편](reading-interface-design.md)의 글씨 크기와 자동 대기는 원고와 별개인 `knolstory-reader-preferences-v1`에 보관한다. textScale은0.9/1/1.15/1.3만, autoDelaySeconds는유한한1–30초만 허용한다. format은auto/landscape/portrait를 허용하고 예전설정에 없으면auto로 해석한다. 폐기된classic은읽을때landscape로해석하며다른설정을유지하고읽기만으로저장원본을쓰지않는다. 편집preview의classic도같이landscape로해석한다. 화면 비율 선호도 이 기기에 보관하며 원고 구도를 수정하지 않는다. 읽기 때는 저장하지 않고 사용자의 변경/기본값 복원에서만 기록한다. 손상 값은 기본값으로 해석하며, 읽기만으로 원래 bytes를 덮어쓰지 않는다. 저장 실패는 현재 화면 적용과 기기 보관 실패를 구분한다.

기존 `knolstory-player-v1`의v3슬롯은 선택적인 `dialoguePosition:{lineId,offset}`을 추가로 가질 수 있다. offset은Unicode code-point 개수 기준이며 UTF-16 index가 아니다. 저장하는 컷과 일치하는 값만 보관하고 본문 길이로 제한한다. 작품 fingerprint변경·컷 불일치·종료 상태에서는 위치를 적용하지 않는다. 필드없는 기존v1/v2/v3기록을 읽을 수 있고 원래 저장은 자동 삭제/초기화하지 않는다. 경로·점수는 기존Core복원, 음원 초 위치 미복원 규칙을 유지한다.

## 온라인 휴지통·복구 연결 — 2026-10-18 사용자 확정

PC-04의 Q-04에서 사용자는 기기 원고 유지·온라인 휴지통·같은 작품 ID와 이력 복구를 확정했다. 이 절은 해당 구현 경계다. 카카오·호스팅의 기존 결정과 별개이며, 실제 결정 상태는 [단일 실행 계획](product-completion-plan.md#미결-질문과-결정)이 소유한다.

- 기기 원고·개인 사본·파일·첨부와 온라인 레코드의 삭제 상태를 분리한다. 온라인 휴지통 요청은 기기 원고를 지우지 않는다.
- 확정한 방식은 서버 record ID·client project ID와 원고 snapshot을 유지한 채 온라인 레코드의 활성/휴지통 상태만 전환한다. 같은 작품 복구는 기존 연결을 유지한다. 새 독립 작품 복구를 선택하면 이 부분은 다른 계약이 필요하다.
- 콘텐츠 revision과 휴지통 상태 변경의 경쟁을 구분해야 한다. 휴지통 이동/복구와 저장이 겹쳐 삭제한 원고가 자동으로 살아나거나 오래된 저장이 현재 원고를 덮지 않도록, 서버 상태 확인과 대상 잠금을 같은 트랜잭션 안에 둔다. 동시 상태 변경 검출 수단은 구현 때 명시한다.
- 삭제·복구도 소유자와 유효 세션·CSRF를 확인한다. 다른 계정에는 레코드 존재 여부를 노출하지 않는다. 목록은 활성/휴지통 범위를 명시하고 페이지 커서와 조회 조건을 같은 범위에 맞춘다.
- 요청·응답 유실 시 같은 명령을 재시도할 수 있어야 한다. 기존 콘텐츠 저장의 멱등 키/receipt와 상태 변경 명령을 혼동하지 않는다. 휴지통 안에서 일반 저장/읽기 요청을 어떻게 거부할지는 동일 서비스 경계와 Web 오류 안내에 연결한다.
- 기존 저장 migration 파일의 checksum을 바꾸지 않는다. 필요한 DB 변경은 새 전진 migration으로 추가한다. 기존 records/snapshots/creation receipts/blob 자료는 보존한다.
- Web에서는 온라인 목록/휴지통 상태와 기기 작품을 구분해 표시한다. 실패·권한 거부·상태 충돌·응답 유실에서도 기기 원고와 재시도 기록을 보존하고, 성공 확인 후에만 해당 온라인 목록 상태를 갱신한다. ShortStory와 KnolStory의 같은 의미를 확인한다.
- 인수 검사는 실제 독립 Docker DB/HTTP에서 소유권·동시 저장/삭제/복구·멱등 재시도·migration 보존을, Web에서 취소·오류·재열기·두 제작 모드의 전체 원고 보존을 확인한다. 실제 운영 DB 변경/배포·다중 실물 기기는 별도 경계다.

휴지통 보관 기간·자동 영구삭제·제출/계정/백업 보관은 이 검토안으로 결정하지 않는다. 보관/자동 영구삭제는 구현하지 않는다. 로컬 구현·테스트를 실제 운영 DB 변경·배포 승인으로 확대하지 않는다.


### 휴지통 구현·집중 검증

[현재 증거](evidence/online-trash-2026-10-18/checkpoint.json). migration007은 서비스 메타데이터에 `deleted_at`, `state_version`(초기1)과 상태 명령 receipt를 추가한다. 원고 content revision과 상태 version은 별개다. `POST /api/v1/documents/:id/trash` 및 `/restore`는 `{payloadVersion:1,expectedRevision,expectedStateVersion}`과 멱등 키를 받아 소유자·세션·CSRF 확인 후 같은 대상 잠금 안에서 전이한다. 보통 목록은 활성 작품, `?state=trash`는 휴지통만 반환한다. 페이지 커서도 범위가 다르면 거부한다.

휴지통에서는 일반 읽기·저장·과거 저장 응답 재생을 거부한다. 동일 상태 명령의 재생은 원래 영수증만 돌려주며 이후 반대 전이를 취소하지 않는다. Web은 재생 영수증을 현재 상태 변화로 단정하지 않고 과거 요청 확인과 새 목록 조회로 안내한다. 복구는 record/project ID·전체 snapshot·content revision을 유지한다. 기존 기기 연결도 같은 온라인 작품을 가리킨다.

실제 독립 Docker DB/HTTP75검사와 두 형식 전체 snapshot 복구를 확인했다. Web은1440/390 두 폭·두 제작 모드의 확인취소/응답유실 재시도/복구/기기전체내용 보존4동선을 별도 모의HTTP로 확인했다. 운영 migration·API배포 및 실제 브라우저→실DB 결합 검증은 아직 수행하지 않았다. pending 상태 명령은 현재 컴포넌트의 재시도 범위이며 새로고침 후에는 서버 목록/상태version으로 재확인한다. 내용 저장의 durable journal과 같은 범위로 주장하지 않는다. 보관 기간·영구삭제를 추가하지 않았다.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.

## 지난기록과 실제 표시 범위 — 2026-10-20

작품 파일과 진행 저장 형식은 변경하지 않는다. `dialoguePosition.offset`은 저장·이어읽기 기준점이며, runtime의 선택 필드 `dialoguePage.endOffset`은 현재 실제로 표시한 페이지 끝을 알리는 별도 일시 증거다. 이 값은 파일·플레이 저장에 새 필드로 쓰지 않는다. Core는 최신 표시 증거가 없으면 현재 컷의 본문을 공개하지 않는다. [읽기 의미와 검증](reading-interface-design.md#지난기록의-표시-범위--2026-10-20-수정).

## 장 기본 설정의 현재 편집 연결 — 2026-10-20

현재 설정 메뉴에서 기존 Chapter의 title/summary/backgroundId 및 선택적 leftAssetId/rightAssetId/audio를 수정한다. 기존 updateStoryChapter를 사용하며 새 문서·양식 필드는 추가하지 않는다. 기본 이미지 선택은 장의 자료 ID 목록에 중복 없이 추가하고, 기본값 비우기는 자료 목록/컷 override를 삭제하지 않는다. 편집 기능을 닫아도 저장된 장 설정은 보존한다. [UI 의미](../../DESIGN.md#현재-컷의-장-기본-설정--2026-10-20), [파일 왕복 검증](evidence/chapter-settings-access-2026-10-20/checkpoint.json).

## 원본 음원 사용 구간 — 2026-10-21

StoryMusicCue의 `action:play`(배경음·주변 소리)와 StorySoundCue는 선택적 `sourceStartMs`·`sourceEndMs`를 갖는다. 원본 파일의 시간 위치이며 컷 진입 후 기다리는 `delayMs`와 다르다. 정수 밀리초 0~86,400,000 범위, 끝은 시작(미설정이면0)보다 커야 한다. 시작 미설정은0, 끝 미설정은 원본 끝이다. `maintain`·`stop`에는 작성하지 않는다. 미설정과 명시0을 구분하고 기존 ID·조건·범위·원본 자료를 보존한다.

현재 document schema8·archive2에 선택 필드를 추가한다. 기존 파일의 누락은 그대로 미설정이며 값을 채우는 변환은 하지 않는다. 새 필드를 모르는 이전 앱으로의 역호환은 보장하지 않는다. 화면은 알려진 자료 길이 안에서 입력을 제한하고 자료를 교체하면 이전 자료의 사용 구간을 해제한다. 길이 정보가 없는 자료는 형식 상한만 검증하며 원본 길이를 추측하지 않는다. 실제 원본 파일을 자르거나 변경하지 않는다. [재생 의미](responsive-audio-authoring.md#원본-음원-사용-구간--2026-10-21), [양식](authoring-workbook-v2.md#음원-사용-구간-열--2026-10-21), [집중 검증](evidence/audio-source-range-2026-10-21/checkpoint.json).


효과음 나누기는 기존 두 StorySoundCue의 사용 구간·대기 값으로 기록하며 새 분할 전용 필드를 추가하지 않는다. 앞 ID 보존·새 뒤 ID·정확한 조건·빈 값 보존 및 재생 의미는 [분할 계약](responsive-audio-authoring.md#효과음-사용-구간-분할--2026-10-21)을 따른다. 분할 후에도 현재 작품 파일·양식·JSONB의 전체 문서 왕복 검증을 적용한다.

## 음원 순서 묶음의 파일 보존 -- 2026-10-22

StoryDocument8에서 `StoryMusicCue.action:sequence`와 묶음 `id`, `clips`, 선택적 `branchCondition/endLineId`를 지원한다. 조각은 고유 `id`, `assetId`, 필수 정수 `sourceEndMs`, 선택적 `sourceStartMs/volume/fadeInMs/fadeOutMs`로 저장한다. 시간은 기존 문서 밀리초이며 원본24시간 이내의 엄격한 증가 범위를 검증한다. 빈 목록·16개 초과·중복 ID·모르는 키·무한 반복·지연 필드는 거부한다. 이전 문서1~7에 새 순서 설정을 섞어 받지 않으며 현재 파일을 과거 형식으로 손실 변환하지 않는다. archive2/JSONB와 문서8의 외피 버전은 유지하고 모든 조각의 첨부 음원 참조를 수집한다. 기존 스칼라 설정을 묶음으로 자동 변환하지 않는다.

워크북8의 기존 소리 행에 선택적 묶음 ID를 추가하고 [양식](authoring-workbook-v2.md)의 별도 ‘이어 재생 음원’ 표로 실제 조각을 편집한다. 예전 스칼라 양식의 새 열/표 누락만 명시적으로 미설정·빈 표로 해석한다. 묶음이 있는데 조각 표가 없거나 부모·순서·필수 값이 틀리면 가져오기를 거부한다. 파일·양식·XLSX 바이트·JSONB의 전체 원고 왕복을 확인하며 실제 Excel/Google 앱 조작 검증은 구분한다. [재생·편집 계약](responsive-audio-authoring.md#여러-음원의-순서-재생--2026-10-22).


## Android 파일 제공자의 저장 직후 읽기 -- 2026-10-23

실제 S25 Ultra에서 파일 쓰기를 닫은 직후 `getFile()`이 쓰기 전 빈 내용을 돌려주고, 조금 뒤 정상 저장 내용을 돌려주는 경우를 확인했다. 저장 성공 기준은 계속 같은 파일의 전체 문자열 일치다. 닫기 뒤 최초 읽기와100/250/500/1000ms 간격의 추가 읽기까지만 허용하며, 쓰기 자체를 다시 실행하지 않는다. 최대 다섯 번의 읽기에도 다르거나 읽기 오류가 나면 저장 성공을 알리지 않고 원고를 유지한다. 파일을 쓰기 전 외부 변경 확인·작품별 연결·동시 저장 차단은 유지한다. [실제 재현·수정·남은 재열기](evidence/android-file-readback-2026-10-23/checkpoint.json).

후속 실제 재열기: 같은 휴대폰의 다운로드 파일 선택기에서 저장본을 검색·선택하고 가져오기 확인을 거쳐 독립 사본으로 열었다. 임시 보관 완료 뒤 비교해 새 project ID 외 전체 작품 일치를 확인했다. Android 파일 제공자는 검사 파일 이름에 `.json`을 덧붙였고, 해당 실제 파일도 내용 검증 후 정상 가져왔다. [실제 파일 선택·보존](evidence/android-file-readback-2026-10-23/native-reopen.json). 실제 회전·다른 Android 제공자의 검증으로 확대하지 않는다.

## Android 작품 파일의 확장자 -- 2026-10-27

작품 파일의 직접 저장 선택기와 다운로드·내보내기는 지정 확장자 `.knolstory`/`.shortstory`를 보존하도록 작품 전용 MIME을 사용한다. 내부 내용은 기존 검증된 JSON archive 그대로이며 이전에 Android가 덧붙인 `.knolstory.json`/`.shortstory.json`도 계속 연다. JSON 복구 원본과 Excel·TSV는 기존 형식을 유지한다. [S25 실제 저장·내보내기·선택기 재열기와 범위](evidence/android-file-extension-2026-10-27/checkpoint.json).
