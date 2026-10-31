---
inclusion: always
---
# Kiro 하네스 (KnolStory Next)

루트와 `apps/web`의 `AGENTS.md`는 Kiro가 이미 항상 읽는다. 이 파일은 Kiro에만 필요한 위치와 경계를 둔다. 전체 구성은 `.kiro/README.md`.

## 소유 경계
- Codex 양식은 정식 원본이다: `AGENTS.md`, `apps/web/AGENTS.md`, `apps/web/CLAUDE.md`, `.agents/skills/`. 사용자가 그 파일의 변경을 요청한 범위에서만 고친다.
- Kiro 전용 구성은 `.kiro/`에 둔다.
- 이 작업 트리는 Codex와 함께 쓴다. 세션 시작 요약에 이 세션이 만들지 않은 미커밋 변경이 있으면, 그 파일을 고치기 전에 `knol-resume`으로 멈춘 지점을 확인한다. 이번 작업과 무관한 변경은 그대로 둔다.

## 영역 절차
`.agents/skills/<이름>/SKILL.md`가 영역별 정식 절차다. 그 영역의 파일을 읽으면 `.kiro/steering/<이름>.md`가 절차 원문을 포함해 자동으로 로드된다. 경로로 정할 수 없는 절차(`legacy-baseline`, `legacy-design-reference`, `migration-check`, `release-gate`)는 요청 내용으로 활성화된다. 포함된 원문의 상대 링크는 원본 폴더 기준이다(`../../../`가 저장소 루트).

## 작업 기록의 위치
- 작업 큐·다음 행동·재개 지점: `docs/architecture/product-completion-plan.md`. 제품 상태: `STATUS.md`(날짜 항목은 최신이 맨 위, 상태표는 `## Current implementation`).
- 여러 세션 작업의 분해: `.kiro/specs/<계획ID>-<이름>/`. 상태와 근거는 정식 문서에 두고 spec에서는 링크한다.
- 흐름 안내 `/knol-router`, 상태 점검 `/knol-status`, 완료 보고 전에는 `knol-verify`.

## 사용자와 소통
보고와 질문은 한국어로 한다. 결정이 필요한 질문은 번호를 매기고 추천 답을 붙인다(`/knol-grill`의 라운드 형식).
