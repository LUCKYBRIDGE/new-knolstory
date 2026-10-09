# 대표 작품 읽기·편집 — 구현과 검증

검증일: 2026-10-06. 기준: `story-maker@18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`.

## 목표

선녀·흥부·옹고집·별주부의 기존 작품 데이터를 새 놀스토리에서 읽고 편집하며, 파일 호환성·실제 자산·분기·연출을 검증한다. 서비스 전체 1.0, 서버·수업 운영·숏스토리·Excel 승계 완료 판정과는 별개다.

## 실제 작품

| 작품 | 장 | 컷 | 선택 컷 |
|---|---:|---:|---:|
| 선녀와 나무꾼 | 166 | 1,613 | 25 |
| 흥부와 놀부 | 14 | 277 | 2 |
| 옹고집전 | 28 | 453 | 8 |
| 별주부전 | 10 | 292 | 3 |

레거시 `getExampleProject()`가 제공하는 전체 분기 원고를 추출했다. 짧은 원작 읽기본으로 대체하지 않았다. 별도의 원작 읽기 fixture 4개도 보존한다. 재추출은 `scripts/extract-legacy-content.py`가 현재 checkout 대신 고정 커밋을 읽는다.

## 완료 근거

| 요구 | 구현 | authoritative evidence |
|---|---|---|
| 네 작품의 내용·ID·자산·분기·연출 보존 | `story-domain`, `compatibility`, 원본 fixtures | `legacy.test.ts`: 모든 작성 필드 원본 비교, v1–v5 경계, 왕복·불변 수정 |
| 실제 자산 표시 | ID → registry → 공통 Ren'Py 경로 | 자산 421개 원본 SHA-256 검사, 실제 WASM 이미지 픽셀·요청 검사 |
| canonical 배치 | runtime-core alpha silhouette 수식 | 독립 baseline 결과 60개 수치 fixture, 421개 자산의 facing/scale/framing 예외 비교 |
| 모든 컷 장면 해석 | `compileStoryScene` | 2,635컷 모두 대사·이미지 경로·선택지·연출 계약 검사 |
| 분기·합류·종료·미연결 | core playback + Web host state | 모든 선언 edge의 도착지·이전 경로 검사, `null`/`""` 구분, native 선택 4작품 검증 |
| 편집 결과 저장 | Web UI, `knolstory-next-workspace-v1` | 4작품 대사 수정 → 저장 → reload → export/import E2E |
| 자산·배치·연출 편집 | actor/background selectors, xAnchor/scale, presentation controls | native 편집 → exported document 값 및 미수정 인물·Flow·planning 보존 비교 → native playback |
| 오류 시 현재 작품 보존 | import 전 전체 컷 preflight, 별도 import 저장 식별자 | 손상 JSON·빈 작품·미등록 자산 거부, 다른 작품 가져오기 후 원래 수정본 유지 |
| 이어읽기 | 연결 검사 후 path 복원 | core 경로 변경·잘못된 상태 거부, reload 후 현재 컷·이전 경로 E2E |
| 연출 실행 | Ren'Py effects/look/transitions + actor overrides | 효과 7종·look 2종 실제 픽셀 변화, look 강도, 기본 강도 생략, reducedMotion, contain/cover, native confirm/next/choice/events |
| 확인 전환 진행 차단 | host + native transition lock | 옹고집 실제 confirm 컷에서 Web next disabled → native 확인 → 진행 검증 |
| 한 렌더러·영속 런타임 | 고정 내부 viewport iframe | 실제 네 작품을 바꾸고 편집해도 같은 iframe 유지, HTML 장면 폴백 없음 |

## 실행 결과

- `pnpm test:coverage`: 583 tests passed, lines 99.71%, statements 97.89%, branches 95.61%, functions 98.89%. 설정에 포함된 TypeScript 도메인·계약·core와 event adapter 기준이며 React UI·Python 전체 커버리지는 아니다.
- `pnpm test:e2e`: host 15개 통과. 마지막 저장 상태 보강 후 작품 host 회귀 12개 추가 재실행 통과.
- `pnpm test:e2e:runtime`: 기존 probe DPR 1/1.5/2 각 종합 시나리오 통과.
- `pnpm test:e2e:stories`: 실제 작품 4개 종합 검사. 네 작품의 10–12개 대표 컷 및 실제 이미지, native branch/back, 옹고집 확인 전환, 배치·연출 편집/파일/재생 검사 통과.
- `pnpm test:presenter`: 실제 Ren'Py effects/look/intensity/defaults/transition/events/ended 검사 통과. 공유 자산 전체 약 149MB 중 사용한 이미지 2개만 요청됨을 확인.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, 실제 Ren'Py Web build, `git diff --check`: 통과.

실제 브라우저 검사는 모든 조합 경로의 전체 컷을 수동 플레이한 결과가 아니다. 모든 컷·분기 edge는 core/compatibility에서 전수 검사하고, 실제 엔진은 대표 컷·선택·연출 및 편집 흐름으로 검증했다. 이미지 해시·좌표 수치·원문 비교와 실제 렌더 검증을 함께 사용했다.

## 범위와 후속 작업

- 작품 표지·출처·기획·메모 데이터는 파일 왕복에서 보존하지만 전용 표지·기획·메모 편집 UI는 아직 제공하지 않는다.
- 현재 UI는 기존 컷 편집, 빈 작품의 새 장/컷 작성·순서 이동, 전체 흐름의 분기·합류·엔딩·미연결 탐색과 검색을 지원한다. 대규모 작품의 추가 시각화·저작 UX 개선은 후속 단계다.
- 모바일 상반신 보기와 최종 글상자 UX는 설계 후보이며 현재 화면은 고정 16:9 무대다. 실제 Android/학교 기기·native IME·오디오·장시간 메모리·성능 예산과 사용자 접근성 QA는 별도 진행한다.
- final RuntimeScene JSON Schema/버전 호환, 런타임 CI 빌드, 의존 방향 gate, 온라인 계정·학급·제출·공유와 운영 배포는 후속 목표다.
- 과거 Web Player를 가져오지 않았고 `.rpy`에 작품 원고를 저장하지 않는다. 같은 공통 presenter가 해석된 RuntimeScene만 받는다. 레거시 저장소·DB·코드를 수정하지 않았다.

## 빈 작품 창작 추가 검증

2026-10-06 사용자 목표: 빈 작품에서 실제 자산으로 짧은 분기 이야기를 만들고 저장·파일 보관·Ren'Py 재생까지 완료한다.

- **PRESERVE:** StoryDocument v5, 안정적인 자산·컷 ID, 선택지 2–4개, 미연결(`""`)과 명시적 종료(`null`), 영속 Ren'Py presenter와 기기 저장 namespace.
- **REFINE:** 빈 작품 시작 폼, 작품/장 제목 편집, 새 장과 첫 컷 생성, 현재 컷 뒤 삽입, 장 내 순서 이동, 미연결 선택지에 새 장 연결, 명시적 엔딩 선택, 수동 저장 재시도.
- 새 작품은 글·자산 없는 해설 컷 하나로 시작한다. 추가 컷은 현재 무대의 배경·인물 배치를 복사하지만 글·선택·엔딩·연출은 비운다. 기존 ID와 분기 도착지를 유지하며 원본 객체를 변경하지 않는다.
- `packages/runtime-core/tests/authoring.test.ts`: 구현 전 RED 확인 후 7개 테스트 통과. 빈 무대 계약, 자산 배치 계승, 삽입/이동, 네 대표 작품의 작성 필드 보존, 실제 분기 재생, 직렬화 왕복, 잘못된 입력을 검사했다.
- `tests/e2e/authoring.spec.ts`: 빈 작품에서 실제 배경·인물 자산을 사용한 3컷 이야기 작성 → 두 선택지와 독립 엔딩 → 자동 저장/reload → `.knolstory` 다운로드/import/reload 검증. 새 작품 시작 후 기존 작품 보존, 선택지 2→4→2 변경 후 ID·도착지 보존, 새 장 연결, 순서 이동, 390px 가로 넘침, 저장 실패 후 ‘지금 저장’ 재시도도 검증했다.
- 리뷰에서 저장 원본을 읽지 못한 뒤 작품 선택/import가 자동 저장을 다시 활성화하는 문제를 발견해 수정했다. 기기 읽기가 실패하면 원본 저장값과 쓰기 중지 상태를 유지하고, 편집/import/export는 파일 보관 경로로 제공한다. 해당 회귀 테스트는 수정 전 RED, 수정 후 GREEN을 확인했다.
- 실제 WASM: 새 작품의 이미지 픽셀 다양성과 최신 sceneRendered 확인, Ren'Py 화면의 두 선택지를 직접 클릭해 각각 다른 컷과 엔딩 도달, 이전 경로 복귀와 iframe 영속성 확인. Web 의미 계층 버튼만 누르는 검증이 아니다.
- `pnpm test:coverage`: **590 tests passed**; lines **99.73%**, statements **97.83%**, branches **95.96%**, functions **98.67%**. React UI/Python 전체가 아닌 설정에 포함된 TS 도메인·계약·core·event adapter 기준이다. 새 authoring helper는 lines 100%, statements 96.96%, branches 96.15%, functions 96.66%다.
- `pnpm typecheck`, `pnpm lint`, `pnpm build` 통과. 서버/배포와 실기기 성능, 전체 M6 및 제품 1.0 완료 판정은 이 범위에 포함하지 않는다.
- 실제 `stories-runtime` 전체 회귀 **5개 통과**: 빈 작품의 두 엔딩과 네 대표 작품의 이미지·native 분기·확인 전환·배치/연출 편집을 검사했다. host/native 프로젝트에 공유한 테스트 파일의 타 프로젝트 항목은 의도적으로 제외한다. 병렬 runner의 산출물 삭제 충돌은 서로 다른 임시 출력 디렉터리로 재실행해 해소했다.
- 저장 원본 보호 수정 후 host 전체 회귀 **19개 통과**: 신규 창작 4개, 기존 작품/오류/이어읽기 12개, 반응형·런타임 실패 3개. 최종 타입 검사·린트·정적 빌드와 diff 공백 검사도 통과했고, 리뷰의 데이터 손실 지적을 수정한 뒤 재리뷰에서 해결을 확인했다.

## 전체 흐름과 중첩 분기 추가 검증

2026-10-06 목표: 장·컷·선택지 연결을 파악하고, 중첩 분기와 공통 장면 합류를 만들며, 미연결 갈래를 수정한 뒤 각 경로를 실제 Ren'Py로 검증한다.

**PRESERVE:** StoryDocument와 컷 ID, 선택지의 `null` 종료/`""` 연결 대기 의미, Runtime Core 재생과 영속 Ren'Py presenter. **REFINE:** 전체 흐름 보조 대화상자, 장별 연결 탐색·검색·진단과 공유 컷 안내. 흐름 분석은 도메인의 `orderedStoryFlowLines`와 `storyFlowTargets`를 사용하며 작품에 별도 그래프나 편집 경로를 저장하지 않는다.

| 완료 기준 | 구현과 직접 검증 근거 |
|---|---|
| 장·컷·선택지·합류·엔딩·연결 대기 표시, 편집 이동 | `StoryFlowMap`: 80컷 이하 연결 지도와 장별 원문/도착지, 긴 작품 검색·장별 펼침·100컷 추가 보기. host E2E에서 9컷 작품의 각 상태와 현재 표시, 진단/컷 선택 후 편집 이동 검사 |
| 현재 위치·공유 컷 식별과 내용 보존 | `StoryFlowContext`: 현재 장·컷, 들어오는 연결과 공유 수정 안내. 선택지 추가·연결 변경·삭제 후 원래 전체 chapters/lines와 글·자산·ID 동일함을 export 비교 |
| 미연결과 시작점에서 도달 불가 진단·수정 안내 | `analyzeStoryFlow`: 연결 대기/없는 도착지/빈 문구/도달 불가. 진단 선택 시 원본 컷으로 이동, 선택지 문제는 해당 문구/도착지에 초점. host에서 미연결 선택지를 새 도착지로 수정해 진단 해소, 선택지 삭제 후 도달 불가 컷 내용 유지 및 이동 검사 |
| 저장·파일 왕복과 실제 중첩/합류 경로 | host에서 실제 자산 8컷 + 미연결 장 1컷 작성, export/import/reload 후 전체 project 동일 검사. native에서 3개 진입 경로 × 2개 엔딩 = 6경로 모두 실제 Ren'Py 선택 클릭, 공통 컷 방문과 독립 엔딩 확인 |

- `flow-analysis.test.ts`: 구현 전 RED 후 10개 테스트 통과. 중첩·합류, 같은 출발지의 두 연결, 순환 안전성, 장/컷 순서와 암묵 다음 컷, 엔딩 우선, 누락·미연결 구분, 입력 불변성, 대표 작품 총 2,635컷 및 12,000컷 분석 검사.
- `flow-authoring.spec.ts`: 지도 진입 구현 전 RED, 구현 후 host 2개/native 1개 통과. 390px 가로 넘침, Escape·호출 버튼 초점 복귀, 재생 중 지도 닫기 후 상태/iframe 보존, 큰 선녀 작품의 마지막 컷 검색·편집도 검사했다. 큰 작품의 검색 장이 접혀 결과를 숨기는 결함은 실패 확인 후 자동 펼침으로 수정했다.
- 전체 검증: **600 unit/contract tests**, **host 21개**, **stories-runtime 6개** 통과. 타 프로젝트 테스트 skip은 의도된 분리다. 커버리지 lines **99.74%**, statements **97.94%**, branches **96.08%**, functions **98.73%** (설정에 포함된 TS 코드 기준, React/Python 전체 아님). 새 흐름 분석은 lines/statements/functions 100%, branches 98.55%.
- 타입 검사·린트·정적 빌드·diff 공백 검사 통과. 원본 저장소·레거시 코드·StoryDocument 스키마·RuntimeScene 계약은 변경하지 않았다.
- 실제 desktop/390px 지도 스크린샷을 확인했다. 지도는 내부 스크롤로 탐색하고 장별 보기에서 원문을 읽는다. 80컷 초과 작품은 장별 탐색·검색으로 제공한다. 실기기 성능·스크린리더 사용자 검증, 온라인 서비스, 전체 M6/1.0 완료와 구분한다.
- 별도 리뷰 에이전트는 사용량 제한으로 결과를 내지 못했다. 주 작업자가 변경 소스와 완료 기준을 직접 점검했으며 독립 리뷰 완료로 기록하지 않는다. 병렬 테스트의 서버 종료 충돌은 별도 유지한 개발 서버에서 host 전체를 재실행해 해소했다.

## 작은 화면 핵심 편집 추가 검증

2026-10-06 목표: 작은 화면에서 현재 무대와 위치를 유지하며 핵심 편집을 수행하고, 화면 전환 후 저장·파일 보관·Ren'Py 재생까지 완료한다.

- **REFINE:** 세로 화면은 무대 아래 활성 편집 영역, 가로 1000px 이하/500px 이하 화면은 무대와 편집 영역 나란히 배치. 페이지 전체를 이동하는 대신 편집 영역 내부를 스크롤한다. 작품 관리 disclosure와 글·자산·선택지·연출·컷 목록 버튼, 도구 닫기 제공.
- **PRESERVE:** 동일 iframe과 RuntimeScene 좌표 계약, 기존 StoryDocument·자산·Flow·저장 namespace. 인스펙터 섹션은 hidden으로 전환해 입력 노드를 유지하고, compact 상태는 화면 표현에만 적용한다.
- 완료 기준 1–2: `mobile-authoring.spec.ts`에서 390×844 터치 환경으로 빈 작품·실제 배경/인물·화자·긴 한국어·3컷·두 선택지/엔딩 작성, 컷 순서 왕복 이동, 수동 저장, 파일 export/import/reload 후 전체 project 비교. 무대와 위치/저장 상태, 명확한 도구 전환과 전체 흐름 열기/닫기 확인.
- 완료 기준 3: 도구 닫기/열기, 844×390 가로 → 1280×900 → 390×844 전환 후 글·화자·도착 컷·iframe marker 보존. 입력란 스크롤 후 compact main.scrollTop=0, 편집 스크롤 영역이 실제 viewport 안에 있는지 추가 검사했다.
- 완료 기준 4: Web 도구 hit target 최소 44px, 실제 Tab/Shift+Tab 초점 outline와 Enter 자산 도구 활성화, 지도 Escape와 호출 버튼 초점 복귀, 긴 한국어 textarea 줄바꿈/가로 넘침 없음 검사. native에서 파일 복원한 작품의 실제 이미지 픽셀과 최신 렌더 확인 후 Ren'Py 선택지를 touchscreen.tap하여 두 독립 엔딩·다시 읽기 및 동일 iframe 확인.
- 리뷰로 발견한 엔딩 section 숨김과 재생 영역 clipping 가능성을 수정했다. 가로 화면에서 grid align-items:start 때문에 편집 패널이 영역을 넘치고 상위 shell을 스크롤하던 문제는 stretch로 수정하고 geometry 회귀를 보강했다. 초기 모바일 준비 전 관리 disclosure 상태를 읽던 테스트는 준비된 버튼 표시를 기다리도록 수정했다. 독립 리뷰의 후속 재검토는 사용량 제한으로 중단되어 주 작업자가 소스/실제 화면/테스트로 확인했다.
- 전체 결과: **host 22개**, **stories-runtime 7개**, **unit/contract 600개** 통과. 최종 가로 영역 보강 후 모바일 host 재실행 통과. 커버리지는 TS 대상 lines 99.74%, statements 97.94%, branches 96.08%, functions 98.73%; React/Python 전체 커버리지 아님. 타입 검사·린트·정적 빌드와 diff 공백 검사 통과.
- 검증은 Chrome 모바일 viewport/touch 에뮬레이션이다. 실제 Android 가상 키보드·native IME·오디오·기기 성능·장시간 메모리 예산은 확인하지 않았고 실기기 QA로 남긴다. Ren'Py canvas 선택의 축소된 hit 영역은 실제 터치 재생으로 검증했으며 Web 의미 계층 선택 버튼은 44px 대체 조작을 제공한다.

## 기본 인물 배치와 연출 표현 추가 검증

2026-10-06 목표: 자동 좌우 배치를 넓히고, 실제 Ren'Py 화자 강조·효과·분위기·전환과 재생 초기화를 확인한다.

**REFINE:** 자동 인물 실루엣 중심 rail 비율 `.24/.76 → .14/.86`, 같은 쪽 두 인물 그룹 `.25/.75 → .18/.82`. rail·안전 영역·높이·크기 계산은 유지한다. **PRESERVE:** 저장된 xAnchor/scale/중앙 배치, StageComposition·자산 ID·Flow와 같은 RuntimeScene을 쓰는 편집/재생. 고정 baseline JSON은 변경하지 않았고, 의도적으로 바뀐 자동 수평 좌표와 나머지 동등성을 분리해 검사했다.

- 실제 자산 단위 검사에서 좌우 실루엣 중심 간격은 509.6→705.6 논리 px, 196px 증가. 명시 수동·중앙 배치는 frozen baseline 수치 그대로다. 모든 catalog 인물 geometry의 단독/4인/mirrored production 배치 안전 영역과 크기, 입력 불변성을 검사했다.
- [변경 전 선녀 첫 컷](evidence/presentation-refinement/seonnyeo-default-before.png)과 [변경 후 같은 컷](evidence/presentation-refinement/seonnyeo-default-after.png): 같은 실제 자산·무대 크기에서 왼쪽 단독과 오른쪽 두 인물의 기본 배치 비교. 배치 변경은 문서 좌표를 재작성하는 migration이 아니라 기본 자동 배치의 표시 개선이다.
- 무대에 ‘연출 미리보기’를 추가했다. 회상/look은 편집에서도 표시하고 움직이는 효과·전환은 실제 play 모드로 확인한다. 효과 강도(soft/normal/strong), 시작(scene-enter/with-dialogue/after-delay), 대기 0–10000ms와 동작 줄이기 조작을 제공한다. 여러 효과가 있는 기존 컷은 첫 효과만 수정하고 나머지 cue를 유지한다.
- 같은 sceneId에서 ended→play 재시작이 효과 clock을 초기화하지 않던 문제를 수정했다. 같은 컷의 텍스트 revision만 바뀌면 효과를 중복 시작하지 않고, 확인 전환 중 revision 갱신은 active gate를 유지한다. scene/mode 변경 또는 끝난 컷 재시작에서만 clock을 초기화한다.
- `verify-presentation-refinement.mjs`: 수정 전 same-scene replay RED 확인, 실제 재빌드 후 GREEN. 상단 무대 픽셀만 비교해 7개 효과의 normal 지연 시작·중립 컷 초기화, 화자 normal/dim 구분, reducedMotion shake/flash/flash-red 억제·crack/spotlight 유지, text revision 중복 없음·same-scene replay·확인 전환 유지/재시작 검사. [재시작 후 실제 효과](evidence/presentation-refinement/same-cut-replay.png).
- 기존 `verify-presenter.mjs` 수정 전/후 모두 통과: 7종 효과, 2종 look와 soft/strong, 3종 transition, reducedMotion, literal 한국어와 choice·confirm·advance 이벤트 검사. 기존 효과가 정상 강도에서 실제로 구분되어 일괄 강도/지속 시간을 올리지 않았다.
- `presentation-polish.spec.ts`: 새 실제 자산 fixture에서 좌우 간격,1명/2명/4명/중앙 배치, 1280/390/844 화면의 inverse drag +5% 및 수동 위치 복원, 같은 iframe·가로 넘침·전체 작성 필드 export 보존 검사. native look 픽셀과 뒤로 가기·다시 읽기 중립 복귀도 검사했다. 저장된 구성은 동일하며, 테스트 fixture는 명시 StageComposition 편집에 맞게 inheritActors:false를 지정했다.
- 전체 unit/contract **607개**, host **23개** 통과. TS 대상 coverage lines 99.74%, statements 97.94%, branches 96.08%, functions 98.73%. 타입 검사·린트·정적 빌드·실제 Ren'Py 8.5.3 Web 재빌드·diff 공백 검사 통과.
- 실제 `stories-runtime` 전체 **9개 통과**: 새 배치/연출 2개와 기존 4작품·분기·합류·모바일 두 엔딩·확인 전환·배치/연출 파일 재생 회귀를 함께 확인했다. host 전용 skip 8개는 의도된 프로젝트 분리다.
- 새 테스트/런타임 담당 후속 작업은 사용량 제한으로 중단되어 주 작업자가 실제 빌드·스크린샷·verifier·회귀를 직접 확인했다. 실기기 성능 예산 및 전체 제품 출시 완료로 확대하지 않는다.

## 체격과 컷 구도 추가 검증

이 절의 발 502px/이전 체격 배율은 당시 결과이며, 이후 사용자 정정에 따라 현재 기본은 글상자에 하반신 일부가 가리는 558px와 더 완만한 인물 크기다. 현재 정책과 검증은 [레거시 저작 UX 재사용의 인물 읽기 크기](legacy-authoring-workspace.md#인물-읽기-크기--추가-사용자-수정)를 참고한다.

2026-10-06 목표: 체격과 컷의 표현 의도를 보존하며 인물 없는 컷·중앙/원본 방향·1인칭 글상자를 편집하고 실제 Ren'Py로 재생한다. 추가 사용자 조건은 인물 가독성 우선이며, 신장을 추정해 과하게 확대/축소하지 않는 것이다.

- 크기 감사: 기존 baseHeight × 자산별 기본 배율 × 편집 배율과 canvas aspect/alpha geometry, 안전 영역 fit을 유지했다. alpha bbox를 실제 신장으로 추정하거나 실루엣 높이를 정규화하지 않는다. 아이·어린 자라·탑승 복합 등 기존 배율과 작성한 배율을 보존한다. 자산 metadata에는 전수 신장 값이 없으므로 신장 추론 규칙을 추가하지 않았다.
- 실제 검수에서 작은 아이가 낮은 발 기준선 때문에 글상자 뒤에 숨었다. Runtime Core가 실루엣 발을 dialogue top(510) 위 502 논리 px에 표시하도록 수정했다. 크기는 유지하며 oversized/framed art는 visible top 8px를 지켜 머리 표시를 확보한다. 기존 문서의 자산·크기·StageComposition을 재작성하지 않는다.
- 인물 표시에서 장 기본 상속/이 컷 직접 배치/이 컷 인물 없음을 구분한다. 앞 컷 인물 복사는 스냅샷이며 동적 이전 컷 상속이 아니다. 쪽별 최대 2명 추가/제거와 개별 제거를 지원한다. 명시적 빈 배열은 장 기본 인물이 다시 나타나는 것을 막는다.
- 원본 방향은 StageActorEntry facing=original을 저장하고 flipX=false로 해석한다. 기존 생략/left/right는 그대로이며 새 enum의 현재 Next v5 지원과 이전 reader 제한을 호환성 표에 기록했다. 정면 그림의 원본 구도를 보존하지만 2D 그림을 다른 자세로 회전시키지 않는다.
- 같은 쪽 두 인물 자동 그룹에서 중앙 actor가 밀려나던 조건을 수정했다. 직접 xAnchor가 중앙보다 우선하고, 중앙 선택은 기존 xAnchor를 해제한다. 위치 입력을 지워 자동 배치로 복귀할 수 있다.
- 화자 이름과 무대 표시를 분리했다. 글 종류 변경 시 작성한 이름을 ‘해설’로 덮어쓰지 않는다. 인물 없이 ‘나’가 말하는 대사, 배경만 있는 컷, 배경·인물 없이 글상자만 있는 컷을 작성할 수 있다.
- composition-intent.test.ts 7개 통과: original guard/compiler와 같은 쪽 중앙 배치 RED→GREEN, 수동 우선·배율 보존, 아이/어른 체격 차이와 dialogue 위 visible feet, 빈 배열/장 기본 재상속, ‘나’ 대사 검사.
- composition-intent.spec.ts: 장 기본 아이/어른 1컷에서 UI로 5컷 작성. 4인 추가→2인 복귀, 배율 .9, 중앙, 원본 방향, 인물 없음/배경 있음, ‘나’/배경 없음 및 전체 project export/import/reload 일치 확인. native에서 실제 scene body height, 원본 flip, 3화면 iframe 유지, 무인 배경과 균일한 빈 무대, 뒤로 가기의 정확한 배경 픽셀 복귀를 검사했다.
- 실제 화면: [작은 아이와 큰 어른](evidence/composition-intent/small-and-big.png), [중앙 원본 방향](evidence/composition-intent/center-original.png), [‘나’의 글상자만 있는 컷](evidence/composition-intent/first-person-text-only.png). 주 작업자와 테스트 담당자가 작은 인물 가림 해소를 이미지로 확인했다.
- 전체 614 unit/contract, host 24개, stories-runtime 10개 통과. 마지막 4→2 조작 보강 후 focused host/native 2개 재통과. TS 대상 coverage lines 99.74%, statements 98.03%, branches 96.22%, functions 98.73%. 타입 검사·린트·정적 빌드·diff 공백 검사 통과.
- Ren'Py presenter 계약/렌더 코드는 변경하지 않았다. Core의 rect/flipX를 그대로 소비하고 Web 핸들은 같은 좌표를 사용한다. 실기기 성능·native IME와 전체 제품 출시는 별도다.
