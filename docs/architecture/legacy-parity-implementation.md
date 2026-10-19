# 고정 legacy 비교와 실제 기능 보완 (2026-10-09)

기준은 `story-maker@18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`다. 현재 legacy checkout의 파일을 기준으로 삼지 않고 `git show`/`ls-tree`로 고정 객체를 조사했다. 기존 [네 작품 감사](four-work-library-audit.md), [검증](four-work-library-verification.md), STATUS·Blueprint·DESIGN·ADR 0009~0015와 실제 Next 소스를 함께 읽었다. 이전 검증 숫자는 이전 실행의 근거이며 이번 실행과 합산하지 않는다. 시작 시 있던 소개 유지·월넛 책장 변경은 보존하고 함께 회귀 검사한다.

## 실제 화면·버튼·데이터 비교

legacy의 경로 분리는 `app/page.tsx`, `app/classic/{seonnyeo,heungbu,onggojib,rabbit}/page.tsx`, `app/admin/page.tsx` 및 StoryStudio 내부 screen 전환에 있다. Next는 `/`의 소개·서재·책 선택·시작·편집·준비·표지 상태와 `/shortstory`로 재구성한다. 링크의 존재만으로 완료 판정하지 않는다. legacy/Next 소스 목록은 [고정 화면 목록](evidence/legacy-parity-implementation/legacy-surface-inventory.txt), [Next 목록](evidence/legacy-parity-implementation/next-surface-inventory.txt)에 남겼다.

| 영역/legacy 실제 동작 | 분류 / 현재 상태 | Next 실행 경로와 보존 범위 |
|---|---|---|
| 소개에서 서재·내 작품·책 읽기 선택 | REFINE / 구현됨 | BookIntroduction → LocalBookshelf 또는 BookStart. 서재 입장 선택까지 소개 유지. reload만 작업 화면 복원 |
| 네 작품과 원작/놀스토리/숏스토리 판본 | REFINE / 구현됨 | builtin-works의 고정 document ID 연결 → LibraryBookFocus → 실제 8원고 Ren’Py 또는 4 그림책 Web |
| 책 고른 뒤 읽기·편집·관리 | REFINE / 구현됨 | 책 밑 상시 관리버튼 없음. 집중 창에서 판본/읽기/사본/표지/파일 선택. 최소 두 선반·월넛·식물·양옆 공간 유지 |
| 작품 생성·사본·정보·기획 | PRESERVE/REFINE / 구현됨 | NewStoryForm → 작품 준비 → ChapterWriter. 기본작품 편집은 copyPersonalWork로 독립 project ID 생성 |
| 창작 메모, 사용자 항목·순서·삭제 복구·검색 | PRESERVE/REFINE / 구현됨 (이번 보완) | 기존 story-preparation의 원고/메모 모델 재사용. 항목 메타데이터와 장/컷 연결을 보존하며 작업 단위 확장 |
| 장 설정·대본·화자·기본 자료 | REFINE / 구현됨 | ChapterWriter의 장 제목/개요/번호/갈래/화자/자료/기본 구도/오디오. 컷 ↔ 대본 이동 |
| 컷 추가·복제·이동·다른 장으로 이동·삭제/undo | PRESERVE/REFINE / 구현됨 | runtime-core editor-authoring와 ChapterWriter/삭제 영향 확인 재사용 |
| ScriptScreen의 나누기·합치기 | PRESERVE/REFINE / 구현됨 (이번 보완) | 텍스트와 기존 연결의 의미를 보존하는 runtime-core 연산. 안전하지 않은 합치기 거부 |
| 전체 대본 펼치기·범위 복사/붙여넣기 | 부분 구현 | 장별 대본/전체 흐름은 있음. 범위 clipboard와 전체 대본 일괄 조작은 AU-01 후속 |
| 선택지·갈래 장·합류·엔딩·연결 대기 | PRESERVE / 구현됨 | Flow 지도/현재 연결 → runtime-core → 단일 Ren’Py presenter. 교사 승인은 표현 계약만, 서버 승인 제품은 미구현 |
| 자산 검색/분류/즐겨찾기/최근/화자·StageComposition | PRESERVE/REFINE / 구현됨 | AssetPicker/registry·canonical layout 재사용. 기존 Asset ID와 사용자 자유 좌표를 변경하지 않음 |
| 연출·음악·환경음·효과음·사용자 업로드 | PRESERVE/REBUILD / 구현됨 | 기존 audioResources/IDB·실제 Ren’Py 재생 재사용. 파일당5MB·base64 첨부합계20MB. 외부 생성 서비스 직접 연결은 별도 |
| 자동 저장·기기 저장·파일 이동 | PRESERVE/REFINE / 구현됨 | StoryDocument v1~v5, .knolstory/.nolstory, portableStory/audioResources. 원본과 중복 ID 보호 |
| 과거 원고 기록·복구 | PRESERVE/REFINE / 이번 보완 | 명시 기록·삭제 전 기록, 목록/파일 보관/독립 사본 열기. 현재 원고 덮어쓰기 없음 |
| 다중 탭의 저장 충돌 방지 | REFINE / 이번 보완 | 보관함별 단일 writer Web Lock + 저장 직전 raw 비교. 둘째 탭 초안 편집/파일 보관 후 명시 재열기 |
| 손상 저장 raw·복구 후 재시작 | PRESERVE/REFINE / 이번 보완 | 자동 저장 중지, raw 파일 보관, 정상 checkpoint 사본 열기, 명시 재시작 전 raw 별도 보존 |
| 읽기 기록·이어읽기·슬롯·선택 경로 | PRESERVE / 구현됨 | project ID별 독립 player-saves와 work contexts. 원작/놀스토리·사본 기록 분리 |
| 숏스토리 읽기·사본·쪽 편집·표지·보관함 | PRESERVE/REFINE / 구현됨 | four fixed packs → Web pages. 원본 보호·다중 사본·쪽 위치·삭제복구·cover editor 재사용 |
| 숏스토리 A4 인쇄 | PRESERVE / 구현됨 | DOM/CSS 전용 print surface. 놀스토리 Stage 인쇄/다른 Web Player로 확대하지 않음 |
| Excel/TSV/공개 Google 시트 읽기 | REFINE / 구현됨(Next 형식) | StoryTransferPanel/compatibility table, ShortStory table. 전체 payload 보존·지원하지 않는 버전 거부 |
| 구형 8탭/4탭·숏스토리 v2 학생 활동 파일 | 부분 구현/누락, 별도 호환 검토 | 구형 탭 유지 의무 없음. 어댑터와 question/answer/art revisions 보존은 X-01~02 후속 |
| 계정·온라인 저장·학급·과제·제출·공유 | 누락 / 서버·운영 결정 의존 | server ownership만 존재. SV-01~05 확정 계약 후 구현. 임의 인증/승인/게시 정책 없음 |
| 오프라인 단일 HTML·놀스토리 DOM player·legacy 자동 저장소 변경 | 의도적 변경·폐기 | ADR 0009/0010/0014. 복원하지 않음. 파일 보관과 향후 권한 있는 공유로 연결 |

legacy 근거: `app/components/ScriptScreen.tsx`의 split/merge/copyRange/pasteLine props 및 전체 펼치기, `app/StoryStudio.tsx`의 대본 명령과 creative memo add/reorder/delete/undo, `app/story-project-checkpoints.ts`의 10개 checkpoint와 restore 전 기록, `app/workspace/local-workspace-repository.ts`의 transaction/expected 값 비교. 정책/서버 화면은 `OnlineStoragePanel`, `StudentSpace`, `TeacherAssignments`, `SubmissionReader`가 존재하지만 Next의 결정 없는 정책을 복사하지 않는다.

## 저장 보호 계약

`knolstory-next-workspace-v1`의 버전2 envelope는 유지한다. `knolstory-shortstory-library-v1`도 형식을 바꾸지 않는다. 각 collection은 Chrome Web Locks의 독립 단일 writer를 가진다. 권한 없는 탭은 저장하지 않고 현재 초안을 내보낼 수 있다. 권한을 가진 탭도 읽은 raw와 실제 raw가 달라지면 덮어쓰기를 거부한다. 자동 병합/강제 takeover는 하지 않는다. Web Locks 미지원이나 실패는 저장 가능으로 가장하지 않고 파일 보관을 안내한다.

`knolstory-checkpoints-v1`은 StoryDocument만 담는 별도 보관함이다. 최근10개·UTF16 총2MB 한도이며 수동 기록과 컷 삭제 전에 생성한다. 자동 저장마다 큰 원고를 복제하지 않는다. 한 작품만으로 한도를 넘거나 quota/손상 기록이면 명시 오류를 보여주며 기존 raw를 보존한다. 오디오 bytes는 기존 IDB가 보관하고 checkpoint는 동일 audio ID를 유지한다. 다른 기기 이동은 기존 portableStory 파일로 실제 bytes를 포함한다. 원본 복구는 project ID를 새로 발급한 내 사본이며 Asset ID·장/컷·Flow·StageComposition·표지·기획·메모는 그대로다.

손상 workspace를 재시작하기 전 `knolstory-workspace-recovery-<uuid>`에 기존 raw를 먼저 보관한다. backup 저장 실패면 원래 key를 변경하지 않는다. 재시작은 현재 열린 작품을 새 보관함의 시작으로 삼으며, 읽을 수 없는 다른 작품은 보존 raw에 남는다. 다른 탭 변경은 손상으로 취급해 초기화하지 않는다.

## 검증과 후속 목표

이번 실행의 테스트·화면·실패 재현과 수정은 이 문서 아래 실행 결과에 기록한다. 실제 학교 기기를 연결한 시험은 할 수 없으므로 Chromium의 PC/태블릿/휴대폰 가로·세로 viewport 검증을 실기기 시험이라고 표현하지 않는다. 기존 전체 원고 native 경로 검증은 [네 작품 완료 근거](four-work-library-verification.md)를 따른다.

| ID | 상태/우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| AU-01 | 부분 구현/P2 | 안전한 cut range remap·clipboard 계약 | 전체 대본·범위 복사/붙여넣기에서 내부/외부 Flow·ID remap·오디오/연출·취소/파일 왕복을 실제 긴 작품으로 검사 |
| AU-02 | 부분 구현/P2 | 메모 원본/undo·복수 연결 계약 | 메모 전체 삭제 후 다른 메모의 추가 편집을 보존한 복구, 복수 장·컷 연결 직접 편집·검색·파일 왕복 검사 |
| ST-03 | 부분 구현/P2 | 보관함별 checkpoint 저장용량 설계 | 숏스토리의 임의 과거 revision 선택. 현재 쪽 삭제 undo·책 soft delete·파일 백업과 구분 |
| ST-04 | 부분 구현/P2 | 병합 정책/transaction 저장소 결정 | 다른 탭의 서로 다른 작품을 동시에 작성하여 안전 병합. 현재 단일 writer와 파일 보관으로 충돌 차단 |
| X-01~03 | 미구현/P2~3 | 실제 구형 fixture·v2 보존 계약·Google 인증/쓰기 승인 | legacy 탭/학생 활동 전체 필드 보존 및 승인한 원격 시트만 쓰기 |
| SV-01~05 | 미구현/P1/M8 | 소유자 서버·인증·가입/승인·제출/게시 정책 확정 | 인증/온라인 저장/학급/과제/제출/공유 실제 API·권한 거부·학생→교사 전체 동선 E2E |
| QA-01~02 | 미검증/P1 출시 gate | Windows/Chromebook/Android 실기기·스크린리더 | 한국어 IME·터치·오디오·키보드·NVDA/ChromeVox/TalkBack·성능 확인 |
| REL-01 | 미완료/P1/M9 | 권리 manifest·온라인 공유 계약·release gate | 허용 미디어만 최초 서비스 도메인 배포·실제 공개/비공개 권한 확인 |

후속 SV/X/QA/REL의 상세 조건은 [기존 감사](four-work-library-audit.md#확인된-후속-목표와-완료-조건)와 함께 유지한다. 비교에서 ‘구현됨’으로 표시한 기존 기능을 이번에 새로 만든 것으로 보고하지 않는다.

## 이번 실행 결과

- 신규 기능은 RED→GREEN으로 검사했다. 저장 writer5개, checkpoint10개, 대본 연산16개, 준비/메모12개, 원자적 삭제복구1개를 기존 회귀와 함께 실행했다. 현재 **886 TypeScript tests** 통과, 전체 coverage statements93.56%/branches90.76%/functions95.30%/lines97.69%다. [coverage](evidence/legacy-parity-implementation/coverage.log).
- **24 Python tests**, presenter protocol 검사, media provenance1351파일 검사 통과. typecheck/lint/build와 diff whitespace 검사도 실행했다. [스크립트](evidence/legacy-parity-implementation/script-tests.log), [presenter](evidence/legacy-parity-implementation/presenter.log), [media](evidence/legacy-parity-implementation/media-check.log), [타입](evidence/legacy-parity-implementation/typecheck.log), [린트](evidence/legacy-parity-implementation/lint.log), [빌드](evidence/legacy-parity-implementation/build.log).
- 첫 전체 host 실행은113pass/28skip/6fail이었다. 신규 대본 시험이 편집에서 서재 생성 helper를 부르거나 Mac에서 Control+Home으로 잘못된 caret을 선택한 검사 결함5개, 휴대폰 편집 패널 하단의 실제 viewport 초과1개를 확인했다. 생성 경로/플랫폼 키를 고쳤고, 복구 메뉴를 관리 안에 넣으며 세로 편집 panel max-height를52dvh로 조정했다. 실패 기록을 삭제하지 않았다. [첫 실행](evidence/legacy-parity-implementation/host.log).
- 최종 정적 build의 변경 경로는 **20pass/3skip/0fail**이다. PC1440×900/1000, 태블릿1024×768·768×1024, 휴대폰390×844·844×390에서 실제 클릭·한국어·커서 split/merge·잘못된 위치 오류·메모 fields/검색·저장/reload·파일→fresh context·삭제 quota 실패·두 탭·손상 raw·page restoration을 검사했다. skip3개는 host에 포함됐지만 native 전용으로 별도 프로젝트에서 실행하는 검사다. [정적 최종](evidence/legacy-parity-implementation/static-final.log).
- Ren’Py 정적 검사에서는 여덟 판본 시작·동일 영속 iframe·독립 읽기/슬롯·사본 원고 보존·표지/파일/터치와 portable custom audio 양 갈래를 실행했다. native 첫 묶음11pass/3skip/1fail의 실패는 fresh browser URL이 시험 서버와 다른3000으로 고정된 검사 설정이었다. 현재 시험 origin으로 바꾼 해당 검사는 **1pass**로 확인했다. 고유12개 native case가 통과했다. [native 묶음](evidence/legacy-parity-implementation/native-final.log), [오디오 수정 후](evidence/legacy-parity-implementation/native-audio-final.log).
- 여덟 source manuscript fixture를 HEAD bytes/SHA256과 대조해 모두 동일함을 확인했다. [8원고 보존](evidence/legacy-parity-implementation/manuscript-preservation.json). 실제 사본 파일인 [메모 파일](evidence/legacy-parity-implementation/memo-roundtrip.knolstory)과 최종 화면은 `evidence/legacy-parity-implementation/screens/`에 보관한다.

읽기/파일/화면 결과가 서버 구현·온라인 게시·실물 학교기기나 스크린리더 사용자 검증을 뜻하지 않는다. 현재 워크트리의 구현/검증 결과이고 원격 push/배포는 이번 작업에 포함하지 않는다.

검토에서 찾아 고친 데이터 보존 문제: 최근 삭제복구 key를 먼저 바꾼 뒤 workspace 저장이 실패하면 이전 복구본을 잃을 수 있었다. 새 삭제/복구는 workspace optional deletedWork StoryDocument와 함께 한 setItem으로 commit해 원자적으로 보존한다. 해당 quota 실패를 실제 두 작품/복구본으로 검사했다. 추가 side-key checkpoint/raw backup은 현재 collection WebLock을 보유하고 main raw가 같은지 확인한 상태에서만 쓴다. backup quota 실패 시 main workspace를 변경하지 않는다.

의도적 제한: merge는 설정/연출/오디오/외부진입/메모 참조가 다르면 거부하며, 반복 cues를 삭제하지 않는다. cursor split은 같은 무대/연출/오디오를 새 컷에 복제하므로 각 컷 진입에서 cues가 다시 실행될 수 있다고 UI에서 설명한다. 자동 문장별 다중 분할·범위 clipboard는 이번 완료 기능이 아니다. checkpoint는 사용자 음원 bytes의 별도 장기 archive가 아니며 다른 기기에는 .knolstory 파일을 사용한다. 메모 undo는 항목 삭제 단위이고 메모 전체 삭제/복수 링크 직접 수정은 AU-02다.

최종 전체 정적 호스트 검사는 **121pass/28skip/0fail**이다. [전체 재검사](evidence/legacy-parity-implementation/host-final.log). skip은 프로젝트별 host/native 분리로 인한 명시적 미실행이며, 실패를 skip으로 바꾸지 않았다.

완료 점검에서 실제 가장 긴 선녀 원고가 checkpoint2MB를 넘는 것을 확인했다. 그 한도 때문에 기존 컷 삭제가 막히지 않도록 **초과 원고만** 기존 삭제/undo를 유지하고, 별도 복구 기록 미생성과 파일 보관 필요성을 명시한다. 손상/읽기 실패/quota 오류는 그대로 표시하고 기록을 덮지 않는다. 실제 선녀 내 사본의 1,000개 이상 컷에서 삭제→undo→전체 문서 일치→저장/reload를 추가 검사해 통과했다. 마지막 저장/대본 회귀10pass/1skip/0fail이다. [용량 RED](evidence/legacy-parity-implementation/large-checkpoint-red.log), [GREEN](evidence/legacy-parity-implementation/large-checkpoint-green.log), [실제 긴 원고와 저장/대본 회귀](evidence/legacy-parity-implementation/long-story-final.log).

최종 requirement별 판정·현재 소스 hash·검사 결과는 [완료 감사 JSON](evidence/legacy-parity-implementation/completion-audit.json)에 기록했다. 소유자의 서버/운영 결정 범위와 후속 목표를 제품 전체 완료로 승격하지 않는다.

## 2026-10-10 공식 편집 형식의 후속 보완

기존 story-maker 파일 호환은 사용자 결정에 따라 이번 형식 목표에서 제외했다. 현재 Next 작품 의미를 보호하면서 공식v2 작품 파일과 다중 탭 Excel/Google 편집을 구현했다. 단일 TSV/payload 보존을 전체 요소의 직접 편집 완료로 보지 않는다. 실제 외부 앱, 전체 필드, 실제 원고12종, Core/Ren’Py·숏스토리 인쇄 검증과 남은 서버 범위는 [공식 형식 계획·판정](authoring-format-development-plan.md)을 기준으로 한다.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
