# 새 세션 인수인계와 목표 프롬프트 — 2026-10-13

현재 로컬 작업 파일을 이어서 사용한다. 많은 수정·추가 파일이 아직 커밋되지 않았으며, GitHub 기본 브랜치만 체크아웃하면 현재 개발 상태를 잃는다. 이번 세션은 커밋·push·배포를 하지 않는다. 아래 프롬프트는 기존 workspace에 새 세션을 열어 붙여 넣는다.

## 음원 작업 인수인계

[CC0 편입 계획](cc0-library-integration-plan.md), [검증](cc0-library-integration-validation.md), [manifest](../assets/cc0-staging/integration.json)를 읽는다. 고정 취득 Release를 로컬에 매핑했으며 기존61+추가469=530개다. 기존 중복21개와 취득 내부 중복2개는 별칭으로 해석하고 canonical 목록을 중복 표시하지 않는다. 출처·제작자·원본 이름·설명과 완전 디코딩을 대조했다. 현재 작품에 추천 cue를 자동 적용하지 않았다. 기존61 승인 행/bytes/ID/Pixabay14 조건은 보존했다.

큰 source package는 `.tools/audio-import-2026-10-13/package`에 있고, 신규 versioned public audio 폴더는 Git ignore다. 다른 기기의 재현은 편입 계획의 고정 Release 검증→mapper→runtime→Web 빌드를 따른다. 현재 기기에서는 자료를 다시 취득할 필요가 없다. 새469개를 공유 시작 ZIP에 통째로 넣지 않는다. StoryDocument cue 참조→Core→현재 장면의 등록파일 전송→Ren’Py native cache 경로를 유지한다. 물리 삼성기기·전문 청취·loop 연결부·최종 배포 환경은 별도 후속이며 로컬 기능 검증을 그 승인으로 확대하지 않는다.

## 이어갈 작업의 현황

현재 목표는 글 중심의 기본 편집과 목적에 맞는 단일 작품 메뉴·필요시 여는 추가 편집이다. 기본 화면은 현재 컷의 대사/해설, 배경·인물 배치, 간략한 이전/다음 컷과 이동, 필요시 창작 메모에 집중한다. 모호한 “작품 준비/관리”와 중복 도구, 과한 버튼·여백, 깊은 클릭 경로를 줄이는 방향은 유지한다. 최신 사용자 결정과 통과된 도안을 기준으로 구현하며 옛 UI를 테스트 통과 목적으로 복원하지 않는다.

이미 검증한 항목: 점수 전체 설정의 한 곳 관리와 편집 복귀 context, 추가 도구 이동/한글 IME 보호, 실제 배치된 인물 중심의 appearance controls 및 그룹 전체 opacity/emphasis/spectral 적용, compact 읽기 도구/슬롯/자동, 서비스 등록 미디어만 선택하는 Web 정책. 각 현재 검증 문서는 STATUS와 UX 계획에서 찾는다. 과거 test 수치를 새 전체 회귀의 성공으로 합산하지 않는다.

우선 남은 작업은 `tests/e2e/non-audio-direction-ui.spec.ts`의 오래된 경로를 현재 compact UI로 옮기는 것이다. RED 증거는 `evidence/deep-direction-current/red.log`다. 순서·시작/지속 시간·반복·범위·취소·인물 reset·오류 입력·전체 파일 보존·native 읽기 복귀 조건은 유지한다. 사라진 버튼을 복원하거나 `if(visible)`로 핵심 절차를 건너뛰지 않는다. `현재 장과 컷 이동`, `추가 편집`, `조정할 연출`, 작품 메뉴, `이 컷부터 재생`, 읽기 메뉴의 `이 컷 편집하기` 등 실제 현재 경로를 사용한다.

최초 설치 Chrome에서 나타난 과거 한 번의 오류는 최초 exception 증거가 없으므로 원인 미확정이다. 이후 instrumented 성공을 원인 해결로 쓰지 않는다. 삼성 가상 키보드는 실기기 자료/실측에 따라 판단하고 viewport 모의 검증과 구분한다. 외부 업로드 정책을 만족하도록 옛 custom upload 회귀는 거부/기존저장보존 조건으로 이관한다. 알려진 세션 agent 사용량 한계가 프로젝트 빌드 불가를 뜻하지 않는다.

## 붙여 넣을 프롬프트

```text
/goal 뉴놀스토리의 현재 로컬 개발판에서 승인된 편집·읽기 UI와 비음원 연출 개선 작업을 이어서 완성해줘.

먼저 AGENTS.md → STATUS.md → docs/architecture/development-blueprint.md → DESIGN.md와 관련 ADR·저장/연출/범위/점수 계약, 최신 UX 계획·검증 기록, docs/architecture/next-session-goal-2026-10-13.md를 읽어줘. 현재 작업 폴더의 미커밋 변경이 개발 상태의 원본이니 보존하고, GitHub 기본 브랜치로 덮거나 reset하지 마. 구 story-maker는 18da4fc 기준으로 읽기만 해줘.

음원 우선 작업은 docs/architecture/cc0-library-integration-plan.md와 cc0-library-integration-validation.md의 완료 범위·한계를 이어받아줘. 기존61개를 보존하고469개를 추가한 공용530개와 별칭23개, 현재 장면별 on-demand Ren’Py 전달을 유지해줘. 취득/전면 패키지 편입을 다시 시작하지 말고, 새 문제가 확인되면 해당 문제만 고쳐줘. 서비스에 등록된 이미지·음원만 선택할 수 있으며 외부 업로드는 열지 마. 기존 저장 작품의 private media/내보내기 보존과 Pixabay14개의 장면 결합 사용·원음 미첨부 제한은 유지해줘. 원본·출처·설명·Asset ID와 추천표는 기존 작품의 cue를 자동 변경하는 근거가 아니야.

기본 편집 화면은 글 상자 안의 대사·해설 입력/수정, 배경·인물 배치가 중심이어야 해. 이전/다음 컷의 글·정보는 간략히 함께 보이고 이동이 쉬워야 하며, 창작 메모는 필요할 때 열어 확인할 수 있게 해줘. 현재 작품·장·컷과 저장 상태를 작은 일관된 UI로 알 수 있게 하되, 불필요한 패널·중복 버튼·모호한 이름·과한 여백·긴 클릭 경로가 글쓰기를 방해하지 않게 해줘. 모든 기능을 기본 화면에 노출하거나 모든 Ren’Py 기능을 가져올 필요는 없어. 필요한 기능은 누락하지 말고 목적이 같은 설정/파일 기능은 단일 작품 메뉴에 모아줘. 클릭 가능한 항목은 작동 여부를 알 수 있게 경계·선택·펼침 상태가 보여야 해. 겹침·잘림은 일괄 여백 확대 대신 구조와 내용에 맞게 고쳐줘.

추가 편집은 연출·소리·선택지·점수의 실제 제작 작업을 최소 단계로 수행하게 구성해줘. 점수 없이 선택지만, 선택지 없이 점수만, 둘 다/둘 다 없는 작품을 모두 보존해줘. 장면/대상/적용 범위와 어느 컷부터 어느 컷까지, 시작 시점·지속 시간·순서·반복을 한글과 초 단위로 이해하고 수정·미리보기·취소할 수 있게 해줘. StoryDocument가 원본, Runtime Core가 해석, Ren’Py가 실제 재생하는 원칙을 지키고 별도 Web story player를 만들지 마. 원고·Asset ID·Flow·StageComposition·자유 배치를 보존하고 파일/Excel/Google 시트/JSONB 계약과 연결해줘.

통과된 이미지 도안과 최신 사용자 수정을 사용하고 미승인 도안을 구현 기준으로 섞지 마. 따뜻한 글 상자·화자/대사 디자인과 실제 Ren’Py 모습의 일치를 유지해줘. 읽기 도구 순서는 지난기록, 저장, 불러오기, 자동, 빠른 저장, 빠른 불러오기야. 휴대폰은 하단에 붙은 글 상자와 기본 접힌 작은 읽기 도구, 태블릿/PC는 방해되지 않는 도구를 유지해줘. PC·태블릿·휴대폰에서 긴 한국어, 한글 조합, 삼성 가상 키보드 유무와 물리 키보드 상황을 구분해 검증해줘.

먼저 현재 UI에 맞지 않는 tests/e2e/non-audio-direction-ui.spec.ts를 이관하고 실제 회귀를 통과시켜줘. 순서·시간·반복·취소·대상 reset·오류 입력·전체 문서/배치 보존·파일 왕복·읽기→편집 복귀 검증은 줄이지 마. 이후 최신 UX 계획과 STATUS의 남은 항목을 실제 코드/브라우저에 대조해 구현됨/부분 구현/누락/의도적 제외로 판단하고 작품 제작에 필요한 항목부터 구현해줘. 이전 성공이나 synthetic 오류 검증으로 최초 Chrome 오류 해결을 주장하지 마.

분석 문서·버튼 추가·디자인 변경만으로 완료 처리하지 말고, 실제 작품의 선택·편집·미리보기·저장·파일 왕복·재열기·읽기 복귀를 검증해줘. 상세 계획은 기존 문서 구조에서 관리하고 DESIGN·STATUS·계약·검증을 함께 갱신해줘. 각 후속 목표에는 상태·우선순위·의존성·완료 조건을 적어줘. 물리 기기·실제 외부 앱·배포·권리 승인과 모의/로컬 검증을 구분하고, 근거 없는 전체 완료 주장은 하지 마.
```

## 이 인수인계 이후의 로컬 실행

2026-10-13 이어가기에서 compact 비음원 연출/확인 전환/기존 Excel·Google 반출물 회귀를 이관했고, 작품별 편집 방문 복귀를 추가했다. 위 목표 프롬프트는 시작 당시의 인수인계로 보존한다. 다음 세션의 현재 상태·최종 실행·남은 완료 조건은 [이어가기 검증](current-ui-continuation-validation.md), STATUS와 승인 UI/계승 계획을 함께 읽는다. 음원 재취득·시작ZIP 전면 편입·외부 업로드 금지와 기존 원본/private/Pixabay 보존 규칙은 그대로다.

2026-10-14 새 사용자 결정: Excel 추가 기능을 통한 ChatGPT 연결은 이번 개발에서 제외한다. 추가 기능 설치/로그인/연결 요청을 반복하지 않는다. 로컬 구현·파일/표/JSONB 왕복·actual Ren’Py 검증을 계속하고, 별도의 실제 외부 앱/기기/배포 결과와 구분한다. 최신 범위는 STATUS와 [외부 범위 준비 기록](range-external-preparation-validation.md)을 따른다.

2026-10-14 후속: 선택 갈래별 cue 조건을 문서8/양식8·Core·compact 상세 편집에 연결했다. 최신 증거/미검증 범위는 [갈래 범위 실행](branch-scope-validation.md)과 STATUS를 읽는다. 기존7판 검증/manifest는 당시 기록으로 보존한다.

2026-10-14 current regression 후속: [현행 회귀 기록](current-regression-migration-validation.md)은 기준383의 미실행/실패와 현재384 collection, private/등록 자료·장 identity·구도 host8/native5 검증을 구분한다. 전체 success로 합산하거나 이전 private 업로드 기능을 복원하지 않는다. source dirty 상태와 Excel ChatGPT 제외·원본/미디어 정책을 유지한다.

2026-10-14 후속 인수인계: 대본/화자/이미지/복제 현재 경로와 원래 Flow 보존 결함 수정은 [최신 대본 검증](manuscript-authoring-continuation-validation.md)을 기준으로 이어간다. 새 복제의 자기 참조만 재연결하고 외부/원래 작품은 보존한다. 나머지 전체 회귀·선택 조정·실기기·최초 Chrome 원인 목표는 유지한다. Excel ChatGPT 연결은 사용자 결정으로 제외한다.

2026-10-14 추가 사용자 결정: 모든 옛 파일 양식을 지원하지 않아도 된다. 뉴놀스토리 현재 형식을 기준으로 하고 필요한 옛 내용은 현재 형식에 맞게 고친다. [ADR0016](../decisions/0016-authoring-format-contract-and-scope.md)의 재확인과 [최신 전체 회귀 후속](full-current-regression-validation.md)을 따른다. 원본/기존 Next/private 보존과 Excel ChatGPT 제외는 유지한다.

2026-10-14 나머지 후속: 최신 기준221개70통과/6실패/6제외/139미실행 및 확인된6동선 이행은 [나머지 현재 회귀](remaining-current-regression-validation.md)를 읽는다. 휴대폰 geometry는 현재 문서 스크롤을 따르며 두 실제 native 엔딩과 전체 작품/편집복귀 검사를 유지한다. 미커밋 작업·현행 양식 우선·등록 미디어/private/Pixabay·Excel ChatGPT 제외는 그대로다.

2026-10-14 연출 후속:139기준 구간을 확인된 첫 실패 후 의도중단하고 current presentation-polish를 이행했다. [최신 native구도/미리보기/복원 검증](presentation-current-regression-validation.md)과 현재 source를 기준으로 reading-surface·나머지126을 이어간다. 이전 full/분할 성공을 새 전체성공으로 취급하지 않는다.

2026-10-14 읽기후속: [current 읽기경계/native4화면](reader-current-regression-validation.md)에host5/native4와현재388 collection/다음121을기록했다. 원래모의실패검증을실제재생으로과장하지않는다. 현재미커밋·원본/미디어·현행양식우선·ExcelChatGPT제외를유지하며나머지full회귀를이어간다.

2026-10-14 작품 전환 후속: [current 서재/사본/파일/재개 회귀](work-switch-current-regression-validation.md)에실제122수집·초기probe3/stories12집중성공을기록했다. 나머지/full388은별도로이어간다. current양식우선·미커밋보존·등록자료/private/Pixabay·ExcelChatGPT제외를유지한다.

2026-10-14 공유 자료/배치 후속: [최신102개 기준과focused8성공](shared-media-staging-current-validation.md)을 읽고 남은65/full388을 이어간다. 기존 private 공유 metadata/dirty 초안과 bytes 보존, 신규 첨부 거부·현재 그림책picker/배치 동선을 검증했다. 미커밋·현재형식우선·530/23/Pixabay/on-demand·ExcelChatGPT제외는 유지한다.

2026-10-14 도구 경계 후속: [현재63개 기준과 compact UI 경계 이행](ui-clarity-current-regression-validation.md)을 읽고 남은 구간/full388을 이어간다. 필요한 옛 원고는 현재 생성기로 변환하고 원본·미커밋·자료 정책·ExcelChatGPT 제외를 유지한다.

2026-10-14 마지막 구간 후속: [현재 파일/공개 시트/native 읽기 검증](reader-file-current-regression-validation.md)에40개 기준34통과/3실패/3제외와focused host3/native3을 기록했다. 현재 전체388 실행은 별도 live handle로 이어간다. 이전 분할 성공을 전체 완료로 합산하지 않는다. 미커밋/원본/private·530/23/Pixabay/on-demand·current 양식 우선·ExcelChatGPT 제외를 유지한다.
