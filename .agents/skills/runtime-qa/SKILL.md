# Runtime QA Skill

1. Read [reproducible environment](../../../docs/architecture/reproducible-test-environment.md), `package.json` and `playwright.config.ts`; use current scripts/test selections rather than historical counts.
2. Prepare runtime/assets if needed; build runtime then Web sequentially. Verify the served static app and runtime come from the intended build. `env:doctor` checks presence/integrity, not functional playback.
3. Run affected unit/contract checks and host E2E; use `KNOL_TEST_STATIC=1` for static E2E. Actual Ren'Py paths use `pnpm test:e2e:stories` and DPR projects via `pnpm test:e2e:runtime`; host/probe success alone is not native rendering evidence.
4. Verify editor/player parity, persistent iframe across resize/fullscreen, resets/replay, acknowledgement/overlay alignment, choices/endings/resume and keyboard/touch.
5. For presentation/audio test unlock, confirmation completion, long text, reduced motion, entry deduplication, channels and revision changes. For changed authoring formats test actual external save/export→import→reload→native playback; ShortStory uses Web/CSS print.
6. Record commands, versions/build, inputs, passed/failed/skipped, screenshots and limits. Preserve initial failures and link corrective reruns; do not claim a single green full suite from combined partial results.
7. Viewport/DPR emulation is not physical school hardware, measured performance or screenreader validation. These remain explicit follow-ups until directly verified.

Use [documentation governance](../../../docs/architecture/documentation-governance.md) when checks/requirements change. Old completion records do not verify later edits.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](../../../docs/architecture/editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.

실제 이용 중인 Android Chrome에 Playwright CDP로 연결할 때 설치 버전의 지원을 확인하고 `noDefaults:true`로 기본 browser/media/focus/download override를 피한다. OS 전면 Chrome·잠금·유일한 로컬 탭·실제 document visibility를 함께 확인하고 사용자가 다른 앱/작품으로 이동하면 중단한다. DOM fullscreen만으로 주소창 숨김을 주장하지 않으며 OS UI와 실제 터치를 대조한다. 접근성/미러링 등 기기 설정은 원인 후보만으로 임의 변경하지 않는다.

전체 화면 조작을 변경할 때 좁은 세로·낮은 가로에서 상단 조작부의 실제 경계·중심 히트·44px 터치 영역·겹침·가로 넘침을 대조한다. 버튼 해제와 OS 해제를 각각 확인하고 요청 거절 시 실제 상태 표시·원고 보존, 읽기 메뉴를 닫은 뒤 초점 복귀를 검사한다. 기능 감지·요청 상태는 브라우저의 실제 전체 화면 상태와 구분하며, 키보드가 열린 실물 조작은 별도 근거로 기록한다.

## 첫 창작 흐름 대조

- [첫 창작 안내](../../../docs/architecture/editor-first-creation-guide.md)의 실제 이름과 경로로 새 작품·글/배경·컷/장 추가·재생·편집 복귀·파일 재열기를 확인한다. 현재 계획의 작업 공간 식별자를 재사용하고 제어 상태는 도구에서 확인한다. 검사 도구의 종료·제어 규칙을 따른다.
- 기본 작품 파일 저장, 내보내기 다운로드, 모의 파일 핸들, 실제 OS 선택기는 구분해 기록한다. 다운로드 요청과 실제 파일 수신을 구분하고, 확인하지 않은 저장 경로를 통과로 합산하지 않는다.
- 독립 사본은 의도한 작품 ID 변경만 구분해 전체 원고를 대조한다. 본문 일부만 같다는 이유로 배경·인물·소리·연출·조건·기획이 보존됐다고 판정하지 않는다. 가져온 뒤 실제 편집 진입과 새로고침도 확인한다.
- 개발자가 수행한 브라우저 흐름을 처음 쓰는 사람의 사용성 평가로 기록하지 않는다. 근거·현재 재개 지점은 [단일 실행 계획](../../../docs/architecture/product-completion-plan.md)과 해당 증거에 남기고 이 절에 검사 수·작업 공간 ID를 복제하지 않는다.

## 작업 이탈 보호 대조

종료·뒤로가기 변경은 [저장·이탈 보호 계약](../../../docs/architecture/authoring-storage-contract.md#종료뒤로가기와-저장-후-이동--2026-10-29)을 따른다. 문서 이탈의 기본 확인과 같은 문서 뒤로가기·서비스 링크 확인을 각각 검사한다. 계속 편집의 원고·초점 복귀, 저장 취소/실패/다운로드 요청의 이동 중단, 파일 확인 후 이동, 저장 중 새 입력/자료 수정, 미적용 표지·음원 select를 대조한다. 브라우저 모형과 OS 선택기·앱 강제 종료 근거는 구분한다.

## 정적 전달 후보

공개 읽기·편집과 선택적 API의 경계는 [ADR0026](../../../docs/decisions/0026-static-reading-authoring-and-optional-api.md)을 따른다. [정적 후보 검사](../../../docs/architecture/reproducible-test-environment.md#정적-전달-후보-검사--2026-10-29)로 산출물·원고/진단 혼입·크기·해시·권리·고지 자료를 대조한다. 사전검사 통과와 실제CDN·API없는 첫접속·전체갈래·기기·운영전환 완료를 구분한다. 같은출처 Ren’Py 계약을 변경하려면 호스트와bridge 양쪽의 실제 회귀 근거가 필요하다.
