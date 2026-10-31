---
inclusion: fileMatch
fileMatchPattern: [".kiro/specs/**"]
---
# KnolStory spec 형식

spec은 계획 항목 하나의 작업 분해다. 작업 큐·의존성·재개 지점은 `docs/architecture/product-completion-plan.md`, 제품 상태는 `STATUS.md`, 근거는 `docs/architecture/evidence/`가 소유한다. spec에는 그 위치를 링크하고 상태·검사 수치를 옮겨 쓰지 않는다.

## 위치와 이름
`.kiro/specs/<계획ID 소문자>-<짧은-이름>/` (예: `sd-03-pages-cache-recovery`). 계획 ID가 없는 작업은 `adhoc-<이름>`.

## requirements.md
- 맨 위: 계획 항목 ID, 관련 STATUS 항목·ADR·영역 절차 링크.
- 문제와 해결: 작가·독자·교사의 관점.
- 사용자 이야기: "작가로서 …하고 싶다. 그래서 …" 형식으로 빠짐없이.
- 인수 조건: EARS(`WHEN … THE SYSTEM SHALL …`). 화면 문구는 제품 용어 사용 기준을 따른다.
- 보존 조건: 해당하는 것을 모두. 기존 작품과 Asset ID·Flow·StageComposition 의미, 작성한 원고, `knolstory-*` 저장소, 레거시 저장소 불변.
- 범위 밖. 미결 질문은 계획의 Q ID로 연결하고 여기서 결정하지 않는다.

## design.md
- 결정 위주로 쓴다. 패키지·모듈 이름은 쓰고, 코드 조각·줄 번호는 넣지 않는다.
- 책임 경계: Web, Runtime Core, Ren'Py, Server 중 무엇이 무엇을 맡는가(`AGENTS.md`의 구조).
- 레거시를 이어받으면 PRESERVE / REFINE / REBUILD / RETIRE 분류.
- 계약·형식 변경: 버전, 명시적 migration, 기존 작품 검사.
- seam과 테스트 결정, 갱신할 정식 문서(STATUS, 계획, 계약, DESIGN, 영역 절차).

## tasks.md
Kiro task 형식(`- [ ] 1. 제목`, 하위 `- [ ] 1.1 제목`)을 쓴다. 각 task는:
- tracer bullet 세로 조각: 필요한 층(형식, Core, Web, Ren'Py, 테스트)을 좁게 끝까지 관통하고 혼자 검증된다. 한 세션 안에 끝난다. 준비 정리(prefactor)가 필요하면 앞에 둔다.
- `Blocked by:` 선행 task 번호 또는 '없음'.
- 인수 조건은 일반 bullet로 쓴다(체크박스는 Kiro가 하위 task로 읽는다). 실행할 검증 명령(`package.json`의 스크립트 이름)도 적는다.
- `_Requirements: 1.1, 2.3_`로 인수 조건과 연결.
- 공유 타입 이름 바꾸기처럼 넓은 기계적 변경은 expand, 호출부 이전, contract 순서의 task로 나눈다.
- 마지막 task: 검증 기록과 정식 문서 갱신(`knol-verify`).

## task 실행
Start task나 `/knol-implement`로 실행한다. 순서: 해당 영역 절차 확인, `knol-tdd`(합의한 seam), `knol-review`, `knol-verify`. 끝나면 체크박스를 갱신한다. 다른 에이전트의 미커밋 변경과 겹치면 `knol-resume`부터.

## 완료
task가 모두 끝나도 제품 완료가 아니다. 완료 범위는 STATUS·계획·근거에 기록한다. spec 폴더는 당시 작업 기록으로 남긴다.
