# 모바일·분기 저작·게임 읽기·파일 형식 검증

## 완료 범위

이 문서는 사용자 요구6개와 완료 기준A–F의 현재 구현 근거를 연결한다. 최종 Stage는 Runtime Core에서 해석하고 Ren’Py만 렌더한다. 재생 상태·저장·불러오기·로그는 Web host/Core가 소유한다.

| 요구 | 구현 및 근거 |
|---|---|
| 세로 주화자 단독 | 실제 표시 영역이 세로일 때 Core는 activeStageSpeaker에 대응하는 인물만 남기고 중앙에 배치한다. 다른 인물을 작게 축소해 남기지 않는다. 주화자가 없는 해설·무인물·나 시점은 인물0명이다. 원본StageComposition은 수정하지 않으므로 가로에 돌아오면 전체 구도가 복원된다. 가로 읽기 권장 안내를 제공한다. `portrait-speaker.test.ts`, native `vn-workflow.spec.ts`와 실제 캡처를 검증했다. 손잡이는 Core가 실제 불투명 그림의 상단 좌표를 제공해 투명 캔버스 위로 벗어나지 않는다. |
| 분기·장·컷 | chapterNumber/branchLabel을 order와 분리해1장/2장/3장A/3장B를 표시하고, 컷 번호는 각 장 안에서 별도로 표시한다. 기존 숫자 제목을 중복 표기하지 않는다. 전체 흐름 지도는 분기·합류·미연결·도달불가·순환을 표시한다. 감사에서 발견한2가지 결함—엔딩을 복제해 선택지가 무시되는 문제와 새 컷을 넣어도 기존goto가 새 컷을 건너뛰는 문제—를 수정했다. 끝/이동 뒤 삽입은 종료/연결을 새 컷으로 옮겨 해당 갈래를 확장한다. UI에 이 의미를 설명한다. Branch identity 단위/host 검증과 실제1→2→3A/B→4의native재생을 확인했다. |
| 게임 저장·불러오기·지난 기록 |9개 수동 슬롯과 작품별 자동 저장을 `knolstory-player-v1`에 보관한다. 기존 작품 자동저장과 별개다. 실제 방문 경로와 정확한 선택ID를 저장하므로 같은 목적지를 가진 두 선택지도 구분된다. 슬롯은 저장 당시 장/컷·화자·글 요약을 보여준다. 내용 fingerprint가 다르면 명시적 호환 복원을 요구하고 경로·선택 연결을 다시 검사한다. 손상된 저장을 덮어쓰지 않는다. 지난 기록은 읽은 순서만 보여주며 돌아가면 이후 경로/선택을 지워 다시 고르게 한다. 단위 테스트, native 슬롯 복원·reload·로그 재선택·변경 작품 경고를 검증했다. |
| 연출 대상·반복·범위 | effect.target은 screen/background/actor를 구분하고, scope cut/following, repeat once/loop, periodMs와 clearFollowingEffects를 저장한다. Core는 실제 방문 경로에서 이어지는 효과를 해석해 RuntimePresentation.version2로 전달한다. Ren’Py는 화면(글상자 포함), 배경, 알파 실루엣의 개별 인물에만 효과를 적용한다. 같은 컷 수정은 시계를 다시 시작하지 않고, 지속 효과는 일반 컷 이동에서도 시계를 유지한다. 저장 복원/재시작은 새 session에서 시계를 시작한다. reduced motion은 반복 섬광을 억제한다. 실제 native pixel verifier에서 대상 분리·다음 컷 지속·반복·해제·복원·줄인 동작을 확인했다. |
| 파일/표 | .knolstory의 신규 메타데이터와 음원 첨부를 그대로 유지한다. 오타 .knolsotry도 JSON 작품 가져오기로 허용한다. 실제 .xlsx와 TSV/CSV의Next 단일 시트는 편집 가능한 작품·장·컷 행과 분기/음악/연출/구도 JSON, 장 번호·갈래 열, 전체 자료 보존 행을 함께 담는다. 보존 JSON은 Excel30k셀 제한에 맞춰 청크로 나누고 안전한prefix로 수식/문자손실을 피한다. 실제 xlsx bytes 왕복·편집·수식 거부·ZIP 확장 크기 검사·TSV/CSV 다중행과 공식 Google 공개주소 변환을 단위 검증했다. Browser에서xlsx 및 Google TSV 응답으로 가져와 project와 음원 첨부가 그대로인 것을 확인했다. |
| 숏스토리 | /shortstory의 독립 그림책 편집·읽기·A4 CSS 인쇄·기기 저장·.shortstory v1과 Next Excel/TSV를 제공한다. 고정 레거시 v1 페이지 모델을 계승하며 음악/연출 필드는 거부한다. KnolStory를 숏스토리로 조용히 축소하지 않는다. 실제 그림과 글, 페이지 이동, 파일/Excel 복원, phone UI, print media를 E2E로 확인했다. |

## 예제와 화면

[1장·2장·3장A/B·4장 실제 자산 예제](evidence/vn-workflow/branch-chapters-demo.knolstory)는 실제 그림과 두 음원 첨부, 배경 지속 연출, 선택에 따른 다른 갈래와 합류를 포함한다. 별도 native E2E에서 양쪽 갈래가 서로 섞이지 않고 합류/종료하는 것을 확인했다.

- [세로 주화자 단독](evidence/vn-workflow/portrait-speaker.png)
- [인물만의 연출](evidence/vn-workflow/actor-target.png)
- [배경만의 연출](evidence/vn-workflow/background-target.png)
- [글상자를 포함한 화면 연출](evidence/vn-workflow/screen-target.png)
- [반복 첫 주기](evidence/vn-workflow/loop-first.png), [이후 주기](evidence/vn-workflow/loop-second.png)

## 형식 및 호환 정책

- StoryDocument v5는 content SSOT이며 새로운장식별/연출 필드는 선택적 확장이다. 기존ID/Flow/구도는 유지한다. 새로운확장을 모르는 구형 편집기로 재저장할 때 보존을 보장하지 않는다.
- RuntimeScene contract1에 선택적 RuntimePresentation.version2 및 Core handle 좌표를 추가했다. 새 host/presenter는 함께 배포한다.
- Next 표 버전1의 전체 보존행은 삭제하지 않는다. 오래된 raw JSON청크도 읽고 새청크는 안전한prefix/encoding marker를 사용한다. 8탭/4탭 구형표는 지원 대상으로 묵시변환하지 않고 명확히 거부한다.
- ExcelJS는 .xlsx만 지원한다. 셀 수식은 거부한다. Google은 공개/게시된 한 탭의Next TSV를 읽는다. 비공개OAuth나 Google 계정에 직접 쓰기는 제공하지 않는다. Google 네트워크 E2E는 실제 URL 요청을 테스트 응답으로 검증했고, 계정상의 원격 시트 저장을 수행했다고 주장하지 않는다. [Google 공식 공개 시트 접근 정책](https://developers.google.com/chart/interactive/docs/spreadsheets).
- 숏스토리는 .shortstory v1(Web/CSS/A4)이며 음악·연출 없이 그림책 페이지를 보관한다. 놀스토리의 분기·음악을 숏스토리로 자동 변환하지 않는다.
- 실제 Android 하드웨어 성능/스피커와 Safari 검증, 클라우드 저장은 별도 서비스/기기 마일스톤이다. 음원의 초 단위 위치는 저장하지 않는다.

## 검증 명령

`pnpm test:coverage`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm exec playwright test --project=host --project=stories-runtime`, `node spikes/renpy-web/verify-presentation-scopes.mjs`, pinned Ren’Py Web build, `python3 spikes/renpy-web/presenter-unit-test.py`, `git diff --check`를 실행했다. 최종 집계: 단위/계약/통합703개, coverage lines98.02%, statements93.62%, branches91.18%, functions95.35%. 전체 host34/native16 회귀와 추가 번호 장 분기 native1개가 통과했다(native총17). Python helper7개, native target/scope/repeat/restore/reduced pixel 검증 및 타입/린트/빌드/diff 검사가 통과했다.

## 2026-10-07 창작 → 파일 보관 → 게임 읽기 UX 감사

현재 소스와 실제 화면을 기준으로 기존 장 대본·이미지 자료실·분기·구도·연출·오디오·읽기 저장 구현을 재사용했다. 새 렌더러·파일 형식·계정/온라인 서비스·숏스토리 확장은 추가하지 않았다. 읽기는 영속 Ren’Py iframe을 유지하면서 편집 도구를 숨기고 무대 전체 폭을 사용한다. 다음·읽기 저장/불러오기·지난 기록·처음부터·동작 줄이기·전체 화면·편집 복귀는 읽기 메뉴에 모았다. 선택은 실제 Ren’Py와 같은 의미를 제공하는 접근 가능한 버튼으로도 가능하다.

### 발견한 문제와 수정 근거

[문제 목록](evidence/creative-reading/issues.json)에 수정 전/후와 재현 검사를 기록했다. 읽기 도구 노출/준비 중 복귀, 장 내부 번호, 나가는 연결, 선택지에서 새 갈래 생성의 A/B 누락과 휴대폰 가로 잘림을 먼저 실패하는 E2E로 확인했다. 화면 취향으로 범위를 확장하지 않았다.

- 읽기에서 작품 관리·대본/꾸미기 전환·컷 목록이 노출돼 무대가 편집 grid 한 칸에 갇혔다. 읽기에서는 숨기고 편집 복귀 시 같은 현재 컷으로 돌아온다.
- 선택지의 새 장 연결은 이미 존재하는 `createStoryChoiceChapter`를 사용하지 않았다. 이를 연결해 2장의 첫/둘째 선택지에서 3장A/3장B가 즉시 생성된다. 별도로 번호를 고쳐 성공했다고 기록하지 않는다.
- 도착 컷 선택은 장 제목만 표시했고 하단 번호는 전체 작품 순서였다. 장 번호·갈래·장 안 컷 번호를 표시하며 이전/다음 컷도 해당 장 안에서 이동한다. 장 간 이동은 작품 구성/대본 장 선택으로 수행한다.
- 현재 컷 연결은 들어오는 연결만 보였다. 나가는 연결의 도착 위치/엔딩/연결 대기·도착 컷 없음과 수정 이동을 추가했다.
- 연출 대상의 내부 actor key는 그림 자료실의 표시 이름으로 바꿨다. 문서 actor key와 직접 배치는 유지한다.
- 런타임/음원 오류는 내부 문구를 화면에 노출했다. 상세 진단은 console에 남기고 사용자는 편집 복귀·그림/음원 확인·재읽기 안내를 본다. 늦은 ready/wait가 실패 안내를 덮지 않고 실제 현재 컷 렌더 확인으로 복구한다. 준비 중에도 편집 복귀는 가능하다.
- 844×390 화면에서 무대 하단이 화면 밖 y419.7까지 나가 실제 대사가 잘렸다. 가로 읽기는 미리보기 toolbar를 접고 메뉴를 한 줄로 만들어 전체 viewport를 화면 안에 확보했다. 세로390×844도 여러 줄 메뉴/toolbar 때문에 viewport가 y1001.2까지 나가던 문제를 같은 원칙으로 수정했다. 가로 권장 문구는 세로의 현재 위치 아래에서 유지한다. [수정 후 실제 Ren’Py 가로 화면](evidence/creative-reading/reading-phone-landscape.png)을 직접 확인했다.

### A–E 실제 대표 작품과 화면

[숲의 약속 · 두 길에서 만나는 친구 (.knolstory)](evidence/creative-reading/forest-promise.knolstory)는 **빈 작품에서 UI로 작성한 12컷**이다. 1장 3컷 → 2장 3컷 → 3장A/3장B 각각 2컷 → 4장 2컷 합류/엔딩을 포함한다. 실제 숲 배경·흥부 그림·음악·종 효과음, 직접 가로 위치32/배율0.9, 배경 대상의 이후 컷 연출과 해제를 작성했다. 사용자 음원 두 개의 bytes도 파일 안에 보관한다. 작품 데이터를 IDB/fixture로 심어 UI 작성으로 주장하지 않는다.

`creative-reading-journey.spec.ts`는 실제 설치된 Chrome(`channel: chrome`)에서 작성·기기 저장·새로고침·내보내기·별도 browser context 가져오기를 수행하고 project 전체와 음원 첨부 동일성을 확인한다. 실제 Ren’Py에서 양쪽 갈래 → 합류 → 엔딩, 수동 슬롯 저장/불러오기, 지난 기록의 실제 방문/선택과 반대 갈래 부재, 지난 기록에서 돌아가 재선택, 재시작, 편집 복귀 후 글 수정/재읽기를 확인한다. Chrome context의 터치 입력으로 첫 오디오를 시작하고 키보드 Enter로 다음 컷을 진행한다. 전체 화면 실제 API 진입/해제와 PC/가로/세로 변경에서 동일 iframe marker를 유지한다. 메뉴를 열고 닫을 때 음악 시작·효과음 횟수도 동일하다.

- [작품 전체 흐름](evidence/creative-reading/authored-flow.png), [선택지 도착 위치](evidence/creative-reading/authoring-choice-links.png), [연출 적용 범위](evidence/creative-reading/authoring-scope.png)
- [PC 읽기](evidence/creative-reading/reading-desktop.png), [휴대폰 가로](evidence/creative-reading/reading-phone-landscape.png), [휴대폰 세로 해설](evidence/creative-reading/reading-phone-portrait.png), [세로 주화자 한 명](evidence/creative-reading/reading-phone-portrait-speaker.png)
- [실제 선택지 PC](evidence/creative-reading/reading-choice-desktop.png), [선택지 가로](evidence/creative-reading/reading-choice-landscape.png), [선택지 세로](evidence/creative-reading/reading-choice-portrait.png)
- [슬롯 날짜·장/컷·화자·요약](evidence/creative-reading/reading-save.png), [A 실제 기록](evidence/creative-reading/read-path-A.png), [B 실제 기록](evidence/creative-reading/read-path-B.png), [수정 후 재읽기](evidence/creative-reading/edited-native-reading.png)
- [Chrome 실행/범위 보고](evidence/creative-reading/run-summary.json)

레거시 비교는 `story-maker@18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`의 `app/components/StoryPlayer.tsx`와 기존 [저작 UX 분류표](legacy-authoring-workspace.md)를 읽기 전용으로 참조했다. 장 대본/화자·자료/선택 경로·읽기 저장 동작은 PRESERVE/REFINE하고, Web 무대 렌더는 복사하지 않았다. 이번 개선은 현재 Next의 실제 혼동/잘림을 해결하며 픽셀 일치나 레거시 전체 서비스 실행으로 주장하지 않는다.

### 범위와 제한

브라우저의 PC1280×900/휴대폰844×390·390×844 조건이며 실제 Windows/Chromebook/Android 하드웨어·스피커·IME 성능 검증은 별도 목표다. 음악 초 위치 저장·클라우드·Safari는 포함하지 않는다. 구도/인물/효과/오디오 규칙은 기존 Core→Ren’Py 계약을 그대로 사용하고 새 렌더러를 만들지 않았다. 이미지 picker 취소·배치 초기화·장 기본값/현재 컷/이어지는 효과의 기존 경로는 관련 기존 회귀 검사로 확인한다. 숏스토리 그림책 편집/읽기/파일/A4 인쇄는 기존 분리 경로를 유지한다.

검증 캡처는 scene revision 일치뿐 아니라 현재 viewport 비율과 실제 engine 논리 크기까지 일치한 뒤 수행한다. 기존 native 선택지 클릭 검사는 고정 y155/210 대신 실제 Core textbox 위치에 따른 좌표를 사용해 같은 엔진 버튼을 클릭한다. 화면 변경으로 오래된 좌표가 다른 선택을 누르는 것을 제품 경로 실패로 혼동하지 않는다.

인물 꾸미기의 제목·삭제·기본값·이미지·입력 접근성 이름과 말하는 인물/연출 대상도 공통 위치 이름(왼쪽/오른쪽 N번 인물)과 자료실 그림 이름을 사용한다. UUID/key를 이해해야 꾸밀 수 있던 노출을 제거하고 문서 identity는 유지한다. `actor-label.test.ts`와 기존 구성/대본/오디오 저작 회귀가 해당 경로를 확인한다.

### 최종 감사와 검토 방식

완료 판단은 새 작품의 실제 UI 작성/파일 동일성/양쪽 native 경로, 현재 위치와 연결·범위 표시, PC/가로/세로 실제 화면, 슬롯·기록·편집 복귀, 기존 네 작품/숏스토리 회귀를 각각 대조했다. 선택 전뿐 아니라 A/B 선택 후에도 회전과 전체 화면 전후의 저장된 playback 전체를 비교한다. 독립 후속 리뷰 에이전트는 사용량 제한으로 중단됐다. 독립 리뷰 완료로 주장하지 않으며 주 작업자가 새 분기 연결·번호·화자/인물 표시·runtime 오류 상태·fullscreen·저장 경계를 직접 검토했다.

자체 평가(`agent-self-evaluation`): 정확성4/5(실제 Chrome/native와 테스트 근거, 독립 후속 리뷰 없음), 완결성4/5(A–F를 개별 근거로 연결하되 coverage는 TS domain/lib 범위), 명확성4/5(문제 목록과 전후 설명, workspace는 기존 대형 component 유지), 실행 가능성5/5(직접 가져올 작품과 재현 검사 제공), 간결성4/5(기존 문서에 근거를 모았고 과거 목표 기록은 유지). 평균4.2/5. 개선은 의미 있는 변경 때 독립 리뷰를 다시 수행하고 기존 큰 component를 필요 범위에서 정리하는 정도이며, 이번 완료 기준을 위해 추가 UI 재설계를 진행하지 않는다.


### 이번 목표의 최종 검사 집계

- 단위/계약/통합 **707개 통과**(37파일). `pnpm test:coverage --maxWorkers=1`: lines98.04%, statements93.66%, branches91.22%, functions95.38%. 설정된 TS package/web lib coverage이며 React/Python 전체 coverage로 주장하지 않는다.
- 최종 전체 host **39개**, 실제 Ren’Py stories-runtime **18개** 통과. host13/native16 skip은 반대 프로젝트 경로 제외이며 각 해당 프로젝트에서 실행했다. 수정 후 파일/경로 보존을 강화한 Chrome 대표 작품 E2E1개도 별도로 통과했다.
- 실제 runtime DPR1/1.5/2 **3개**, actual .rpy helper Python **7개**, native 효과 대상/지속/반복/해제/복원/줄인 동작 pixel verifier 통과.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, `git diff --check` 통과. presenter 소스/계약은 이번 UI 수정에서 바꾸지 않았다.
- 이전 실행의 고정 native 선택 좌표/인물 key selector 실패는 실제 Core 위치/사용자 표시 이름으로 수정하고 관련 회귀 및 최종 전체 native를 통과했다. 병렬 브라우저/coverage 실행의 기존 대표 작품 반복 검사 5초 timeout은 통과 근거로 쓰지 않았으며 최종 coverage 전체707개는 한 worker로 실행해 통과했다. 테스트를 제거하거나 제품 동작 검증을 생략하지 않았다.

[검사 결과](evidence/creative-reading/verification-results.json), [A–F 완료 감사](evidence/creative-reading/completion-audit.json), [수정 전 재현 실패](evidence/creative-reading/before-fix-regressions.json)를 함께 보관한다. 새로고침 후 내보낸 대표 파일의 project와 음원 bytes를 모두 비교한 뒤 그 파일 자체를 별도 context에서 가져와 재생했다.
