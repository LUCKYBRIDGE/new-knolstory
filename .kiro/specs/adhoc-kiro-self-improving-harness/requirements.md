# Requirements Document

spec `adhoc-kiro-self-improving-harness`: Kiro 자가개선 하네스와 인수인계 기록

## Introduction

이 spec은 Kiro 하네스(`.kiro/`)를 세 방향으로 고친다. 작업이 어느 단계에서 끊겨도 정식 기록만 읽고 이어받을 수 있게 한다. Kiro가 할 수 있는 일과 그 밖의 일에 필요한 것을 한 곳에 적고 구체적으로 요청하게 한다. 일하면서 알아챈 하네스의 마찰을 근거와 관문을 거쳐 고치게 한다. 첫 기록으로 2026-10-30의 Pages 배포와 Codex가 멈춘 편집 미리 듣기 수정의 상태를 정식 기록에 옮긴다.

- 계획 ID: 없음(adhoc). 제품 작업 큐의 항목이 아니라 에이전트 작업 환경을 고치는 작업이다.
- 관련 문서:
  - 작업 큐·다음 행동·재개 지점: `docs/architecture/product-completion-plan.md`의 `## 재개 지점`
  - 제품 상태: `STATUS.md`(날짜 항목은 최신이 맨 위)
  - 근거 형식: `.kiro/skills/knol-verify/references/checkpoint-format.md`
  - 기록 원칙: `docs/architecture/documentation-governance.md`
  - 로컬 경로 원칙: ADR 0012 `docs/decisions/0012-toolchain-and-monorepo.md`
  - 배포 맥락: ADR 0026 `docs/decisions/0026-static-reading-authoring-and-optional-api.md`
  - 하네스 구성과 작성 기준: `.kiro/README.md`, `.kiro/steering/kiro-writing.md`, `.kiro/steering/kiro-specs.md`
  - 외부 출처(Matt Pocock 스킬, Harness², RRSI): `.kiro/THIRD_PARTY.md`
  - 영역 절차: 해당 없음. 제품 영역 절차(`.agents/skills/`)는 읽기만 한다.

### 사용자 요청(2026-10-30 원문)

> 1. "작업을 언제든 잘 넘겨줄 수 있게 잘 기록해둬야해"
> 2. "너가 할 수 있는 일과 없는 일을 구분하고, 권한이나 설치받으면 더 할 수 있는 일들이 있다면 그걸 적극요구해. 내가 해야할게 있으면 알려주고"
> 3. "하네스나 스킬, 지침 등도 중간에 좀 비효율적이다 별로다싶으면 개선하면서 일해. 그런게 지침에 들어가면 좋을듯. 구글의 자가개선 하네스 참고하면 될 듯해"

앞선 요청: Codex 양식은 참고만 하고 고치지 않는다. Kiro(Claude)에 맞춘 스킬·작업 노트·폴더 구성을 쓴다. Matt Pocock 스킬 형식을 참고한다. 하던 작업을 이어 간다.

### 문제와 해결

이 spec은 제품이 아니라 에이전트 작업 환경을 다룬다. 그래서 관점은 작가·독자·교사가 아니라 저장소 주인(에이전트에게 일을 맡기는 사람)과 이어받는 쪽(Kiro, Codex, 다른 컴퓨터의 사람)이다.

문제:
- 2026-10-30에 Codex가 Pages에 배포하고 편집 미리 듣기 결함을 고치다 멈췄다. 그 상태는 Codex 실행 로그(`.cache`, 이 Mac에만 있음)와 미커밋 diff에만 있고, 계획의 재개 지점은 2026-10-29 확인에 머물러 있다. 다른 컴퓨터의 사람이나 에이전트는 이 상태를 이어받을 수 없다.
- 세션을 시작할 때 정식 기록이 실제 작업보다 뒤처졌다는 신호가 없다.
- Kiro가 할 수 없는 일과 그 이유(설치, 권한, 사람의 조작)가 한 곳에 남지 않는다. 사용자는 무엇을 해 주면 Kiro가 더 맡을 수 있는지 알기 어렵다.
- 하네스를 고치는 절차는 세션 끝에 사람이 부르는 `/knol-retro`뿐이다. 일하는 중에 알아챈 마찰은 기록되지 않고 사라진다. 고칠수록 지침이 불어나는 것을 막는 검사도 없다.
- 하네스 검사가 지금도 문제를 보고하며 끝나서(exit 1) 새 변경이 만든 문제와 구분하기 어렵다.
- 2026-10-30 세션에 만든 hook(`session-brief`, `guard-shell`, `guard-write`)은 다음 세션부터 동작하므로 실제 Kiro에서 동작하는지 아직 확인하지 않았다.

해결:
- 지금 상태를 정식 기록 세 곳(재개 지점, STATUS, 새 근거)에 옮긴다(요구 사항 1).
- 단계 경계마다 정식 기록을 갱신하는 규칙을 항상 로드 스티어링에 짧게 둔다(요구 사항 2).
- 세션 시작 요약이 기록 신선도를 결정적으로 점검한다(요구 사항 3).
- 능력 목록에 할 수 있는 일과 필요한 것을 적고, 막히면 구체적으로 요청한다(요구 사항 4).
- `knol-improve` 스킬과 개선 기록으로 일하면서 하네스를 고친다. Harness²의 하네스 구성요소 구분과 RRSI가 다루는 반복 개선의 복잡도 누적 문제를 개념으로만 참고한다(요구 사항 5, 6).
- 하네스 검사의 기준선을 문제 0으로 정리하고(요구 사항 7), 새 세션에서 hook을 위험 없는 방법으로 확인한다(요구 사항 8).
- 사용자가 확인하면 `.kiro/`만 현재 브랜치에 커밋한다(요구 사항 9, 선택).
- 요구 사항 10은 보존 조건, 요구 사항 11은 문체와 스크립트 관례다.

## Glossary

- **Kiro 에이전트**: Kiro IDE에서 이 저장소를 작업하는 모델 에이전트. 이 spec의 task를 실행하는 주체다.
- **Kiro 하네스**: `.kiro/` 아래의 스티어링, 스킬, 하위 에이전트, hook, 스크립트, 능력 목록, 개선 기록, spec. Codex 원본은 포함하지 않는다.
- **Codex 원본**: Codex가 쓰는 정식 지침. `AGENTS.md`, `apps/web/AGENTS.md`, `apps/web/CLAUDE.md`, `.agents/skills/` 아래 파일.
- **Codex 미커밋 제품 파일**: Codex가 미리 듣기 결함을 고치다 멈춘 미커밋 파일. `apps/web/components/audio-audition.tsx`, `apps/web/lib/audio-audition-source.ts`, `apps/web/lib/audio-audition-source.test.ts`, `tests/e2e/audio-audition.spec.ts`, `package.json`, `scripts/verify-static-deployment.py`, `scripts/tests/test_verify_static_deployment.py`.
- **정식 기록**: 작업 큐·다음 행동·재개 지점을 소유하는 계획 `docs/architecture/product-completion-plan.md`, 제품 상태를 소유하는 `STATUS.md`, 근거를 소유하는 `docs/architecture/evidence/<주제>-<날짜>/checkpoint.json`. 이 세 곳의 파일을 정식 기록 파일이라 한다.
- **재개 지점**: 계획의 `## 재개 지점` 절. '마지막 확인' 문장과 두 열 표(항목, 현재 재개 정보)로 이루어진다.
- **마지막 확인**: 재개 지점 첫 문장의 `마지막 확인:` 값. 새 형식은 `YYYY-MM-DD HH:MM`(한국 시각)이고, 예전 형식은 `YYYY-MM-DD`다.
- **단계 경계**: 커밋, 배포, 단계를 끝내거나 막는 검사 결과, 사용자 결정, 작업 중단이 생긴 때.
- **세션 시작 요약**: `session-brief` hook이 세션을 시작할 때 실행하는 `node .kiro/skills/knol-status/scripts/status.mjs --brief`와 그 출력.
- **기준 활동 시각**: 신선도 비교에 쓰는 세 시각. 최신 커밋 시각, 미커밋 파일의 가장 늦은 수정 시각, `.cache` 항목의 가장 늦은 수정 시각.
- **허용 간격**: 신선도 비교에서 '마지막 확인' 뒤 경고하지 않는 15분. 기록을 갱신한 직후의 검사 로그와 커밋을 경고로 잡지 않기 위한 간격이다.
- **진행 중 spec**: `.kiro/specs/` 아래에서 `tasks.md`에 완료 표시가 없는 task가 하나 이상 있거나 `tasks.md`가 아직 없는 spec.
- **하네스 검사**: `node .kiro/scripts/check-kiro.mjs`. 네트워크와 모델 호출 없이 Kiro 하네스 파일을 검사하고, 문제가 있으면 exit 1로 끝난다.
- **guard hook**: `guard-shell`, `guard-write` hook과 판정 스크립트 `.kiro/scripts/guard-common.mjs`, `.kiro/scripts/guard-shell.mjs`, `.kiro/scripts/guard-write.mjs`.
- **항상 로드 스티어링**: front matter가 `inclusion: always`이거나 front matter가 없는 스티어링(예: `.kiro/steering/kiro-harness.md`).
- **포함 참조**: 스티어링이 다른 파일의 내용을 그대로 불러오는 Kiro 문법. 실제 예는 `.kiro/steering/runtime-qa.md`에 있다. 이 문서는 문법을 글자 그대로 쓰지 않는다.
- **knol-improve 스킬**: 이 spec이 새로 만드는 모델 호출 스킬 `.kiro/skills/knol-improve/SKILL.md`.
- **knol-retro 스킬**: 기존 직접 호출 스킬 `.kiro/skills/knol-retro/SKILL.md`.
- **knol-handoff 스킬**: 기존 직접 호출 스킬 `.kiro/skills/knol-handoff/SKILL.md`.
- **knol-resume 스킬**: 기존 모델 호출 스킬 `.kiro/skills/knol-resume/SKILL.md`.
- **능력 목록**: `.kiro/capabilities.md`. Kiro 에이전트가 할 수 있는 일과 필요한 것을 영역별로 적은 표.
- **개선 기록**: `.kiro/improvement-log.md`. 하네스 마찰과 그 판정을 항목별로 적은 기록.
- **마찰 신호**: 하네스를 고칠 계기. 같은 실수 반복, 헛도는 도구 호출, 찾지 못한 정보, 사용자의 정정, 발동하지 않은 규칙, hook 오탐·누락, 낡은 문서.
- **관문**: 개선 항목을 적용하기 전에 확인하는 기준. 일반성(같은 상황이 다시 생기는가), 근거(세션의 구체적 사례가 있는가), 비용(늘어나는 항상 로드 분량과 유지 부담이 줄어드는 마찰보다 작은가), 한 번에 하나(변경 하나만 담아 따로 판정할 수 있는가), 이력(개선 기록과 Git 이력에 같은 변경을 거절하거나 되돌린 적이 있는가), 그대로 두기(바꾸지 않는 편이 나은가. 그대로 두기도 정답이다).
- **판정**: 개선 기록 항목의 결과 값. 미정(기록만 하고 아직 판정 전), 적용, 보류, 거절, 되돌림, 다음 세션 확인 필요.
- **열린 항목**: 판정이 미정, 보류, 다음 세션 확인 필요인 개선 기록 항목.
- **종결 항목**: 판정이 적용, 거절, 되돌림인 개선 기록 항목.
- **하네스 구성요소 대응표**: Harness²의 하네스 구성요소와 이 저장소 위치의 대응. system prompt는 항상 로드 스티어링, guardrails는 guard hook, memory는 정식 기록·개선 기록·능력 목록, tool guidance는 영역 절차 래퍼 스티어링과 스킬의 `references/`, subagents는 `.kiro/agents/`, skills는 `.kiro/skills/`, scripts는 `.kiro/scripts/`, plugins는 guard hook 밖의 hook.
- **작은 개선**: `.kiro/` 안에서 구성요소 하나만 바꾸고, 안전장치를 약하게 하지 않으며, Codex 원본·제품 코드·정식 기록을 바꾸지 않고, diff 하나로 되돌릴 수 있는 변경.
- **안전장치 완화**: guard hook의 판정을 약하게 하는 변경(block을 ask나 allow로, ask를 allow로), hook을 끄거나 matcher를 좁히는 변경, guard-write의 보호 경로를 줄이는 변경, 하네스 검사의 검사 항목이나 판정 사례를 지우거나 예산 상한을 올리는 변경.
- **명령형 hook**: action type이 `command`이고 모델을 부르지 않는 hook.
- **모델 비용 hook**: 실행할 때마다 모델 호출이나 모델 맥락 추가가 생기는 hook. action type이 `agent`인 hook, 모델이나 유료 API를 부르는 명령, 출력이 매 프롬프트나 매 도구 호출마다 맥락에 붙는 명령이 해당한다.
- **확인 세션**: hook을 만들거나 바꾼 세션이 끝난 뒤 사용자가 새로 연 Kiro 세션. hook은 이 세션부터 동작한다.

## Requirements

### Requirement 1: 지금 상태를 정식 기록에 옮기기

**User Story:** 저장소 주인으로서, 2026-10-30의 Pages 배포와 Codex가 멈춘 미리 듣기 수정의 상태가 계획·STATUS·근거에 남기를 원한다. 그래서 어느 에이전트나 사람이 어느 컴퓨터에서든 Codex 실행 로그 없이 다음 행동을 이어 갈 수 있다.

#### Acceptance Criteria

1. THE Kiro 에이전트 SHALL `docs/architecture/evidence/pages-deploy-2026-10-30/checkpoint.json`을 새 파일로 만들고 `.kiro/skills/knol-verify/references/checkpoint-format.md`의 형식을 따른다.
2. THE Kiro 에이전트 SHALL 새 checkpoint에 Pages 배포 사실(프로젝트 `new-knolstory`, 배포 `9fc18741`, source `8882b7c`)을 적는다.
3. THE Kiro 에이전트 SHALL 새 checkpoint에 원격 검증 결과를 실제 주소의 브라우저 검사, 배포 파일 검증, 비브라우저 요청 차단으로 나누어 적고, 비브라우저 요청 차단을 파일 누락과 구분한다.
4. THE Kiro 에이전트 SHALL 새 checkpoint에 Pages가 Range 요청을 지원하지 않아 생긴 편집 미리 듣기 결함과 그 재현 근거를 적는다.
5. THE Kiro 에이전트 SHALL 새 checkpoint에 Codex 수정의 중단 지점을 단계별로 적는다: 단위 테스트·lint·Python 검사는 통과, web typecheck는 실패, 미리 듣기 E2E·커밋·Pages 재배포·기록 갱신은 실행 전.
6. THE Kiro 에이전트 SHALL 새 checkpoint에 Codex 미커밋 제품 파일마다 SHA-256을 적어 중단 시점의 파일 상태를 식별한다.
7. THE Kiro 에이전트 SHALL 새 checkpoint에 운영 도메인을 전환하지 않았다는 사실과, 배포한 페이지의 제목이 예전 실험 이름이라는 열린 문제를 적는다.
8. THE Kiro 에이전트 SHALL 새 checkpoint에 출처를 'Codex 실행 로그(`.cache`, 이 Mac 전용)에서 Kiro가 옮겨 적음'으로 밝히고, 옮긴 로그 파일을 저장소 루트 기준 상대 경로로 적는다.
9. WHEN Kiro 에이전트가 읽기 전용 명령(배포 목록 조회, 실제 주소 응답 확인)으로 사실을 다시 확인하면, THE Kiro 에이전트 SHALL 그 명령과 시각을 로그에서 옮긴 항목과 구분해 적는다.
10. WHEN 로그 내용을 정식 기록에 옮기면, THE Kiro 에이전트 SHALL 로컬 절대 경로를 저장소 루트 기준 상대 경로로 바꾸고, 토큰·쿠키·계정 ID·이메일을 빼고 적는다.
11. THE Kiro 에이전트 SHALL 새 checkpoint의 다음 행동을 이 순서로 적는다: web typecheck 수정, 미리 듣기 E2E 두 모드(서버 Range 응답, 파일 전체 응답) 실행, 해당 파일만 커밋, push(사용자 확인), CI 확인, Pages 재배포(사용자 확인), 원격 재검증, 근거·STATUS·계획 갱신.
12. THE Kiro 에이전트 SHALL 다음 행동을 이어받을 주체(Kiro 또는 Codex)를 '사용자 결정 대기'로 적는다.
13. THE Kiro 에이전트 SHALL 재개 지점의 '마지막 확인'을 실제 상태를 대조한 시각(`YYYY-MM-DD HH:MM`)으로 바꾸고, 같은 문장의 나머지 안내는 그대로 둔다.
14. THE Kiro 에이전트 SHALL 재개 지점의 '현재 작업' 셀에 배포 완료와 미리 듣기 결함 수정의 중단을 짧게 적고 새 checkpoint를 링크한다.
15. THE Kiro 에이전트 SHALL 재개 지점의 '다음 행동' 셀에 인수 조건 11의 순서를 먼저 적고, 기존 다음 행동(정적 읽기·편집 우선 순서의 SD 후속)을 그 뒤 순서로 남긴다.
16. THE Kiro 에이전트 SHALL 재개 지점 표에 '진행 중 미커밋' 행 하나를 추가해 Codex 미커밋 제품 파일, 마지막 통과 단계와 실패 단계, 이어받는 주체(사용자 결정 대기), `.kiro/`의 미커밋 변경이 Kiro 하네스 작업이라는 사실을 적는다.
17. THE Kiro 에이전트 SHALL 재개 지점 표의 두 열 구조를 유지하고, '현재 작업'·'다음 행동'·'진행 중 미커밋' 밖의 행은 내용을 그대로 둔다.
18. THE Kiro 에이전트 SHALL `STATUS.md` 맨 위에 2026-10-30 날짜 항목 하나를 추가해 배포 사실과 열린 문제(미리 듣기 결함, 운영 도메인 미전환, 페이지 제목)를 짧게 적고, 검사 수치는 새 checkpoint 링크로 대신한다.
19. THE Kiro 에이전트 SHALL 계획과 `STATUS.md`에서 `.kiro/` 아래 파일을 Markdown 링크가 아닌 백틱 경로로 가리킨다(`.kiro/`가 커밋되지 않은 작업 트리에서도 `pnpm docs:check`가 통과하도록).
20. WHEN 정식 기록 세 곳을 고치면, THE Kiro 에이전트 SHALL `pnpm docs:check`와 `pnpm test:docs`를 실행해 통과를 확인한다.

### Requirement 2: 단계 경계마다 인수인계 기록 남기기

**User Story:** 저장소 주인으로서, 작업이 어느 단계에서 끊겨도 다른 에이전트·사람·컴퓨터가 정식 기록만 읽고 이어 가기를 원한다. 그래서 넘길 때마다 대화 내용을 다시 설명하지 않아도 된다.

#### Acceptance Criteria

1. THE 항상 로드 스티어링 SHALL 인수인계 규칙을 다섯 줄 이하의 목록으로 담는다: 단계 경계마다 시각과 함께 정식 기록 갱신(제품 작업은 재개 지점, 하네스 작업은 spec의 `tasks.md`와 개선 기록), 검증 명령 출력의 위치, 다른 컴퓨터나 사람에게 넘길 조건.
2. WHEN 제품 작업이 단계 경계에 이르면, THE Kiro 에이전트 SHALL 같은 단계 안에서 재개 지점의 해당 셀과 '마지막 확인'을 갱신한다.
3. WHEN 하네스 작업이 단계 경계에 이르면, THE Kiro 에이전트 SHALL 같은 단계 안에서 해당 spec의 `tasks.md` 체크박스와 개선 기록을 갱신한다.
4. THE Kiro 에이전트 SHALL '마지막 확인'을 `YYYY-MM-DD HH:MM`(한국 시각, 예: 2026-10-30 21:30) 형식으로 쓰고, 날짜는 하이픈으로, 시와 분은 콜론으로 구분한다.
5. WHEN Kiro 에이전트가 검증 명령(테스트, lint, typecheck, 빌드, E2E)을 실행하면, THE Kiro 에이전트 SHALL 출력을 Codex와 같은 관례인 `.cache/<주제>-<단계>.log`에 남긴다(단계 예: red, green, lint, types, build, e2e, final).
6. WHEN Kiro 에이전트가 하네스 작업에 속한 검증 명령의 출력을 남기면, THE Kiro 에이전트 SHALL 로그 주제를 `kiro-`로 시작한다.
7. IF 다른 컴퓨터나 다른 사람에게 작업을 넘겨야 하면, THEN THE Kiro 에이전트 SHALL 정식 기록과 관련 변경이 커밋·push되어야 이어받을 수 있다고 알리고, 커밋과 push는 사용자 확인 뒤에만 실행한다.
8. WHEN `/knol-handoff`로 같은 컴퓨터의 다른 도구(예: Codex)에게 넘기면, THE knol-handoff 스킬 SHALL 운영체제 임시 폴더의 인수인계 문서 대신 정식 기록(제품 작업은 재개 지점, 하네스 작업은 spec의 `tasks.md`와 개선 기록)을 갱신하고, 다음 도구가 읽을 정식 기록의 위치를 알려 준다.
9. WHEN `/knol-handoff`로 다른 컴퓨터나 다른 사람에게 넘기면, THE knol-handoff 스킬 SHALL 정식 기록을 갱신한 뒤 운영체제 임시 폴더에 인수인계 문서를 만들고, 정식 기록이 원격에 없으면 커밋·push 확인이 필요하다고 안내한다.
10. WHEN knol-resume 스킬이 재구성한 멈춘 지점보다 정식 기록이 뒤처진 것을 확인하면, THE knol-resume 스킬 SHALL 남은 단계를 이어서 진행하기 전에 재구성한 상태를 정식 기록에 옮긴다.
11. IF 다른 에이전트의 미커밋 파일이나 `.cache` 항목의 수정 시각이 10분 이내이면, THEN THE knol-resume 스킬 SHALL 정식 기록을 갱신하기 전에 사용자에게 묻는다.

### Requirement 3: 세션 시작 요약의 기록 신선도 경고

**User Story:** 이어받는 에이전트로서, 세션을 시작하자마자 정식 기록이 실제 작업보다 뒤처졌는지, 남은 spec task와 요청 대기와 열린 개선 항목이 얼마나 되는지 알고 싶다. 그래서 낡은 재개 지점을 믿고 엉뚱한 지점에서 시작하지 않는다.

#### Acceptance Criteria

1. WHEN 세션 시작 요약이 실행되면, THE 세션 시작 요약 SHALL 재개 지점의 '마지막 확인'을 기준 활동 시각과 비교한다.
2. IF 기준 활동 시각 중 하나가 '마지막 확인'에 허용 간격을 더한 시각보다 늦으면, THEN THE 세션 시작 요약 SHALL 가장 늦은 활동의 종류·이름·시각과 `knol-resume`으로 확인하라는 안내를 담은 경고 한 줄을 표시한다.
3. WHEN 기준 활동 시각이 모두 '마지막 확인'에 허용 간격을 더한 시각 이전이면, THE 세션 시작 요약 SHALL '마지막 확인' 시각과 '뒤처짐 없음'을 한 줄로 표시한다.
4. IF '마지막 확인'에 날짜만 있으면, THEN THE 세션 시작 요약 SHALL 그 날짜의 23:59를 마지막 확인 시각으로 본다.
5. IF '마지막 확인'을 찾지 못하거나 해석하지 못하면, THEN THE 세션 시작 요약 SHALL 그 사실을 한 줄로 표시하고 나머지 요약을 이어서 출력한다.
6. IF 기준 활동 시각 중 하나를 구할 수 없으면(예: `.cache` 없음), THEN THE 세션 시작 요약 SHALL 그 시각을 빼고 나머지 시각으로 비교한다.
7. THE 세션 시작 요약 SHALL 최신 커밋 시각으로, 현재 브랜치에서 정식 기록 파일도 `.kiro/` 아래 파일도 아닌 파일을 바꾼 가장 최근 커밋의 시각을 쓴다.
8. THE 세션 시작 요약 SHALL 미커밋 파일 비교에서 `.kiro/` 아래 파일과 정식 기록 파일을 빼고, `.cache` 비교에서 이름이 `kiro-`로 시작하는 항목을 뺀다.
9. THE 세션 시작 요약 SHALL 진행 중 spec을 한 줄로 표시한다: spec 이름별 남은 task 수와 그중 선택 task 수, `tasks.md`가 없는 spec은 'task 미작성', 진행 중 spec이 없으면 '진행 중 spec 없음'.
10. THE 세션 시작 요약 SHALL 능력 목록에서 요청 상태가 '요청함'인 행 수와 '미요청'인 행 수를 한 줄로 표시한다.
11. THE 세션 시작 요약 SHALL 개선 기록의 열린 항목 수와 그중 판정이 '다음 세션 확인 필요'인 항목 수를 한 줄로 표시한다.
12. IF 능력 목록이나 개선 기록이 없거나 표를 해석하지 못하면, THEN THE 세션 시작 요약 SHALL 그 사실을 해당 줄에 표시하고 나머지 요약을 이어서 출력한다.
13. THE 세션 시작 요약 SHALL 신선도와 개수를 파일 내용, 파일 수정 시각, Git 기록만으로 계산한다(모델 호출 없음).
14. THE 세션 시작 요약 SHALL 파일과 Git 상태를 읽기만 하고 네트워크 요청 없이 실행된다.
15. THE 세션 시작 요약 SHALL 신선도 점검을 포함한 `--brief` 실행을 이 저장소에서 2초 안에 끝낸다.
16. THE 하네스 검사 SHALL 신선도 판정을 내장 판정 사례(날짜만 있는 값, 허용 간격 안과 밖, 제외 경로, `kiro-` 로그, '마지막 확인' 없음)로 확인한다.

### Requirement 4: 능력 목록과 구체적인 요청

**User Story:** 저장소 주인으로서, Kiro가 지금 할 수 있는 일, 설치·권한·사람이 있어야 할 수 있는 일, 할 수 없는 일을 한 곳에서 보고 싶다. 막혔을 때는 Kiro가 무엇을 왜 요청하는지, 승인하면 무엇이 가능해지고 어떤 위험이 있는지 구체적으로 듣고 싶다. 그래서 내가 할 일을 바로 알고, 승인한 만큼 Kiro에게 더 맡길 수 있다.

#### Acceptance Criteria

1. THE Kiro 에이전트 SHALL `.kiro/capabilities.md`에 능력 목록 표를 만들고 열을 영역, 상태, 근거, 필요한 것, 요청 상태로 둔다.
2. THE Kiro 에이전트 SHALL 상태 칸에 '가능', '설치 필요', '권한 필요', '사람 필요', '불가', '미확인' 중 하나를 적는다.
3. THE Kiro 에이전트 SHALL 근거 칸에 확인한 날짜(`YYYY-MM-DD`)와 확인한 명령이나 방법을 적는다.
4. THE Kiro 에이전트 SHALL 요청 상태 칸에 '미요청', '요청함', '승인', '거절', '해당 없음' 중 하나를 적고, '해당 없음'은 상태가 '가능' 또는 '불가'인 행에만 쓴다.
5. WHEN 능력 목록을 처음 만들면, THE Kiro 에이전트 SHALL 2026-10-30에 확인한 사실로 다음 영역의 행을 채우고, 다시 확인한 행에는 그 날짜를 적는다: 로컬 개발 도구(node, pnpm, git, python3), GitHub CLI 인증 범위(scope), Cloudflare(wrangler) 인증 범위와 zone 읽기 한계, 이 Mac에서 도는 운영 Docker, ego-browser, Ren'Py SDK, Playwright 브라우저, LibreOffice(설치 안 됨), adb(`.cache/android-tools-20261023/platform-tools/`에 있음, 기기 미연결), Microsoft Excel(설치됨), MCP 서버(설정 없음), 사람이 해야 하는 일(실기기 연결과 조작, 계정 로그인, 권리 판단, push·배포 승인, 새 Kiro 세션 열기), Kiro hook 입력 형식(미확인).
6. THE Kiro 에이전트 SHALL 컴퓨터에 매인 사실(설치된 도구, `.cache`의 로컬 파일, 실행 중인 컨테이너)에 확인한 컴퓨터를 함께 적는다.
7. THE Kiro 에이전트 SHALL 능력 목록에서 토큰, 쿠키, 계정 ID, 이메일, 로컬 절대 경로를 빼고 적는다.
8. THE 항상 로드 스티어링 SHALL 능력 목록의 위치와 '막히면 능력 목록에 적고 다음 보고에서 요청한다'는 규칙을 한 줄로 담는다.
9. WHEN 작업이 설치·권한·사람의 조작이 없어 막히면, THE Kiro 에이전트 SHALL 같은 단계 안에서 능력 목록의 해당 행을 추가하거나 갱신하고 요청 상태를 '미요청'으로 둔다.
10. WHEN 보고를 쓸 때 요청 상태가 '미요청'인 행이 있으면, THE Kiro 에이전트 SHALL 번호 붙인 질문과 추천 답으로 요청하고(무엇을, 왜, 승인하면 가능해지는 일, 위험), 그 행의 요청 상태를 '요청함'으로 바꾼다.
11. WHEN 사용자가 요청에 답하면, THE Kiro 에이전트 SHALL 요청 상태를 '승인' 또는 '거절'로 바꾼다.
12. WHEN 요청이 승인되면, THE Kiro 에이전트 SHALL 확인 명령을 다시 실행해 상태와 근거(날짜, 명령)를 갱신한다.
13. IF 승인 뒤 다시 확인해도 여전히 할 수 없으면, THEN THE Kiro 에이전트 SHALL 상태를 그대로 두고 확인 결과를 근거에 적어 다음 보고에서 알린다.
14. THE Kiro 에이전트 SHALL `.kiro/README.md`의 구성 표에 능력 목록의 위치와 역할을 추가한다.

### Requirement 5: 일하면서 하네스 고치기(자가개선 절차)

**User Story:** 저장소 주인으로서, Kiro가 일하다가 하네스·스킬·지침이 비효율적이거나 틀린 것을 알아채면 작업 흐름을 끊지 않고 근거를 남겨 고치고, 무엇을 왜 바꿨는지 한 줄로 알려 주기를 원한다. 그래서 같은 마찰이 되풀이되지 않고, 하네스가 근거 없이 커지지도 않는다.

#### Acceptance Criteria

1. THE Kiro 하네스 SHALL 모델 호출 스킬 `.kiro/skills/knol-improve/SKILL.md`(`metadata.invocation: model`)를 두고, description 앞쪽에 핵심 단어를, 그 뒤에 마찰 신호별 계기를 적는다.
2. THE knol-improve 스킬 SHALL 하네스 구성요소 대응표를 담는다.
3. WHEN Kiro 에이전트가 마찰 신호를 알아채면, THE Kiro 에이전트 SHALL 같은 단계 안에서 `knol-improve`의 절차대로 개선 기록에 항목 하나(날짜, 구성요소, 근거, 가설, 판정 '미정')를 남긴다.
4. THE Kiro 에이전트 SHALL 개선 기록 항목의 구성요소 칸에 하네스 구성요소 대응표의 이름 하나를 쓴다.
5. WHEN 개선 항목을 적용할지 정하면, THE Kiro 에이전트 SHALL 관문의 기준을 하나씩 확인하고 결과를 그 항목에 적는다.
6. IF 관문을 통과한 변경이 작은 개선이나 새 명령형 hook이고 인수 조건 7의 경우에 해당하지 않으면, THEN THE Kiro 에이전트 SHALL 하네스 검사 통과와 안전장치 유지를 확인한 뒤 대화에서 따로 묻지 않고 다음 단계 경계에서 적용한다(파일 쓰기 확인 창은 그대로 뜬다).
7. IF 변경이 안전장치 완화, Codex 원본 변경, 모델 비용 hook, `.kiro/` 밖 파일 변경 중 하나에 해당하면, THEN THE Kiro 에이전트 SHALL 적용하기 전에 문안과 이유를 보여 주고 번호 붙인 질문과 추천 답으로 사용자 승인을 받는다.
8. WHEN 변경을 적용하면, THE Kiro 에이전트 SHALL 마찰이 생긴 같은 상황을 다시 시험하고 하네스 검사를 실행한다.
9. WHEN 재시험이 끝나면, THE Kiro 에이전트 SHALL 항목의 판정을 '적용', '보류', '거절', '되돌림', '다음 세션 확인 필요' 중 하나로 적는다.
10. IF 변경이 다음 세션부터 동작해 같은 세션에서 다시 시험할 수 없으면(hook 추가·변경 등), THEN THE Kiro 에이전트 SHALL 판정을 '다음 세션 확인 필요'로 두고 확인 세션에서 시험할 방법을 항목에 적는다.
11. IF 재시험이나 하네스 검사가 실패하고 같은 단계 안에서 고치지 못하면, THEN THE Kiro 에이전트 SHALL 변경을 되돌리고 판정을 '되돌림'으로 적는다.
12. WHEN 판정을 적으면, THE Kiro 에이전트 SHALL 다음 보고에 그 항목을 한 줄(구성요소, 바꾼 것, 판정)로 알린다.
13. WHEN Kiro 에이전트가 개선 기록을 고칠 때 이미 커밋된 종결 항목이 있으면, THE Kiro 에이전트 SHALL 그 항목을 지우고 내용은 Git 이력에 맡긴다.
14. WHEN `/knol-retro`가 실행되면, THE knol-retro 스킬 SHALL 제안을 같은 개선 기록에 항목으로 남기고 같은 관문으로 거른다.
15. WHEN `/knol-retro`가 실행되면, THE knol-retro 스킬 SHALL 확인한 세션과 개선 기록에서 발동 근거를 찾지 못한 규칙·스킬을 제거 후보로 제안한다.
16. THE 항상 로드 스티어링 SHALL 하네스 마찰을 알아채면 `knol-improve`를 쓴다는 규칙을 한 줄로 담는다.
17. WHEN `knol-improve`를 추가하면, THE Kiro 에이전트 SHALL `.kiro/README.md`의 스킬 목록과 구성 표(개선 기록의 위치와 역할 포함), `knol-router` 안내도에 함께 추가한다.
18. THE Kiro 에이전트 SHALL `.kiro/THIRD_PARTY.md`에 Harness²(Google Cloud AI Research·Northwestern, arXiv 2610.14224, https://github.com/google-research/harness2)와 RRSI(Google Cloud AI Research 외, arXiv 2609.24972, https://github.com/google-research/rrsi)를 출처 페이지를 확인한 날짜, 라이선스(Apache-2.0)와 함께 적고, 코드는 가져오지 않고 개념만 참고했다고 밝힌다.
19. THE knol-improve 스킬 SHALL `metadata.origin`에 개념 출처(Harness², RRSI)를 적는다.

### Requirement 6: 복잡도 예산을 결정적 검사로 지키기

**User Story:** 저장소 주인으로서, 하네스가 개선을 거듭해도 매 턴 읽히는 지침과 스킬 설명이 근거 없이 불어나지 않기를 원한다. 그래서 컨텍스트 비용과 읽기 부담이 정한 한도 안에 머물고, 한도를 넘기려면 Kiro가 나에게 먼저 묻는다.

#### Acceptance Criteria

1. THE 하네스 검사 SHALL 항상 로드 스티어링의 front matter를 뺀 줄 수 합계가 40줄을 넘으면 문제로 보고한다(Codex 원본은 합계에 넣지 않는다).
2. THE 하네스 검사 SHALL description이 300자를 넘는 스킬을 문제로 보고한다.
3. THE 하네스 검사 SHALL front matter를 뺀 본문이 100줄을 넘는 SKILL.md를, 일부 경우에만 필요한 내용을 같은 스킬의 `references/`로 옮기라는 안내와 함께 문제로 보고한다.
4. IF 능력 목록이나 개선 기록 파일이 없으면, THEN THE 하네스 검사 SHALL 문제로 보고한다.
5. THE 하네스 검사 SHALL 개선 기록의 열린 항목이 20개를 넘으면 문제로 보고한다.
6. THE 하네스 검사 SHALL 필수 필드(날짜, 구성요소, 근거, 가설, 판정) 중 하나라도 빈 개선 기록 항목을 문제로 보고한다.
7. THE 하네스 검사 SHALL 판정이 정한 값(미정, 적용, 보류, 거절, 되돌림, 다음 세션 확인 필요)이 아닌 개선 기록 항목을 문제로 보고한다.
8. THE 하네스 검사 SHALL 필수 열(영역, 상태, 근거, 필요한 것, 요청 상태)이 빠진 능력 목록 표를 문제로 보고한다.
9. THE 하네스 검사 SHALL 상태나 요청 상태가 정한 값이 아니거나, '해당 없음'이 상태 '가능'·'불가' 밖의 행에 쓰였거나, 근거에 확인 날짜(`YYYY-MM-DD`)가 없는 능력 목록 행을 문제로 보고한다.
10. THE 하네스 검사 SHALL 예산 상한 값을 검사 스크립트 안 한 곳에 두고, 요약 줄에 항상 로드 줄 수와 그 상한을 함께 표시한다.
11. THE 하네스 검사 SHALL 개선 기록과 능력 목록의 형식 검사를 통과해야 하는 예와 실패해야 하는 예로 이루어진 내장 판정 사례로 확인한다.
12. WHEN 예산 검사를 추가한 직후 하네스 검사를 실행하면, THE 하네스 검사 SHALL 기존 하네스 파일에 대해 예산 문제 0개를 보고한다.

### Requirement 7: 하네스 검사 기준선을 문제 0으로 정리하기(준비 정리)

**User Story:** 하네스를 고치는 에이전트로서, 하네스 검사가 문제 0에서 시작하기를 원한다. 그래서 새 변경이 만든 문제를 기존 문제와 섞지 않고 바로 알아본다.

#### Acceptance Criteria

1. THE Kiro 에이전트 SHALL `.kiro/steering/kiro-writing.md`에서 포함 참조 문법을 설명하려고 글자 그대로 쓴 두 곳(지금 13행과 28행)을 '포함 참조'라는 이름과 예시 파일 `.kiro/steering/runtime-qa.md`를 가리키는 문장으로 바꾸고, 안내 내용(Codex 원본은 스티어링에서 포함 참조로 넣는다, 포함 경로는 저장소 루트 기준이다)을 유지한다.
2. THE Kiro 에이전트 SHALL `.kiro/skills/knol-grill/SKILL.md`(지금 40행)의 ADR 자리표시 경로를 실제 파일 경로로 오인되지 않는 자리표시 형식(꺾쇠괄호 자리표시 등)으로 바꾼다.
3. THE Kiro 에이전트 SHALL `.kiro/README.md`에서 스킬과 영역 절차의 개수 표기를 지우고, 같은 줄에 있는 포함 참조 문법 표기도 요구 사항 11의 인수 조건 4에 따라 '포함 참조'로 바꾼다.
4. THE Kiro 에이전트 SHALL `.kiro/steering/kiro-specs.md`의 tasks.md 규칙을 고쳐, task 안의 인수 조건을 체크박스가 아닌 일반 bullet로 적게 한다(체크박스는 Kiro가 하위 task로 해석할 위험이 있다).
5. THE Kiro 에이전트 SHALL 하네스 검사의 규칙을 그대로 두고 문서를 고쳐 인수 조건 1~4를 해결한다.
6. WHEN 인수 조건 1~4를 마치면, THE 하네스 검사 SHALL 문제 0개로 끝난다(exit 0).

### Requirement 8: 확인 세션에서 hook의 실제 동작 확인하기

**User Story:** 저장소 주인으로서, 이번에 만든 hook이 실제 Kiro에서 동작하는지 위험 없는 방법으로 확인되기를 원한다. 그래서 안전장치가 있다고 믿었는데 실제로는 동작하지 않는 상황을 피한다.

#### Acceptance Criteria

1. WHEN 개선 기록을 처음 만들면, THE Kiro 에이전트 SHALL 실제 동작을 아직 확인하지 않은 hook(`session-brief`, `guard-shell`, `guard-write`)을 판정 '다음 세션 확인 필요' 항목으로 넣고 항목마다 시험 방법을 적는다.
2. WHILE 확인 세션에서, THE Kiro 에이전트 SHALL 세션 시작 요약이 대화 맥락에 붙었는지 확인한다.
3. WHILE 확인 세션에서, THE Kiro 에이전트 SHALL guard-shell의 차단 경로를 존재하지 않는 브랜치 이름에 대한 `git branch -D` 명령 하나로 시험하고, 시험 전에 그 브랜치가 없음을 `git branch --list`로 확인한다.
4. WHILE 확인 세션에서, THE Kiro 에이전트 SHALL 허용되는 셸 명령 하나와 이번 작업에 필요한 파일 쓰기(예: 개선 기록 갱신) 하나를 실행한 뒤 `$TMPDIR/knol-kiro-guard-shell-last.json`과 `$TMPDIR/knol-kiro-guard-write-last.json`이 생겼는지와 기록된 키 이름(tool 이름, 입력 키, 도구 입력 키)을 확인한다.
5. WHEN Kiro 에이전트가 확인 창(ask) 경로를 시험하면, THE Kiro 에이전트 SHALL 승인돼도 파일이 바뀌지 않는 조작(존재하지 않는 문자열을 찾는 바꾸기 등)만 쓴다.
6. THE Kiro 에이전트 SHALL hook을 시험하려고 일부러 실행하는 명령을 읽기 전용 명령이나 실패해도 아무것도 바뀌지 않는 조작으로 한정한다(push·배포·삭제·운영 변경은 쓰지 않는다).
7. WHEN 확인이 끝나면, THE Kiro 에이전트 SHALL 결과(hook별 동작 여부, 실제 tool 이름과 입력 키 이름)를 능력 목록의 Kiro hook 행과 개선 기록의 해당 항목 판정에 남긴다.
8. IF hook이 동작하지 않거나 입력 키가 guard 스크립트가 읽는 이름과 다르면, THEN THE Kiro 에이전트 SHALL 개선 기록에 'hook 누락' 마찰 항목을 남기고, guard 스크립트나 hook 수정은 IDE 확인 창을 거쳐 적용한 뒤 판정을 '다음 세션 확인 필요'로 둔다.
9. THE Kiro 에이전트 SHALL `$TMPDIR`의 기록에서 키 이름만 옮겨 적는다.

### Requirement 9: `.kiro/` 커밋(선택)

**User Story:** 저장소 주인으로서, 내가 확인한 뒤에만 하네스 변경이 현재 브랜치에 커밋되고 Codex의 진행 중 파일은 섞이지 않기를 원한다. 그래서 다른 컴퓨터에서도 같은 하네스를 쓸 수 있다.

#### Acceptance Criteria

1. WHERE 사용자가 `.kiro/` 커밋을 승인하면, THE Kiro 에이전트 SHALL 커밋 전에 하네스 검사(문제 0)와 `pnpm exec eslint .kiro`(오류 0)를 통과시킨다.
2. WHERE 사용자가 `.kiro/` 커밋을 승인하면, THE Kiro 에이전트 SHALL `.kiro/` 아래 경로만 이름으로 지정해 stage하고, `git diff --cached --name-only`에 `.kiro/` 밖 경로가 없는지와 `git diff --cached --check`가 통과하는지 확인한다.
3. WHERE 사용자가 `.kiro/` 커밋을 승인하면, THE Kiro 에이전트 SHALL 현재 브랜치에 기존 메시지 형식(접두어와 영어 요약)으로 커밋한다.
4. IF 커밋 전 검사가 실패하면, THEN THE Kiro 에이전트 SHALL 커밋을 미루고 실패를 고친 뒤 검사를 다시 실행한다.
5. IF 사용자가 push도 원하면, THEN THE Kiro 에이전트 SHALL 현재 브랜치, upstream, origin/main과의 관계, 대상 원격 브랜치를 보여 주고 따로 확인받은 뒤에만 push한다.
6. IF 사용자가 정식 기록 파일의 커밋도 요청하면, THEN THE Kiro 에이전트 SHALL 계획, `STATUS.md`, 새 근거를 `.kiro/` 커밋과 다른 한 커밋에 함께 넣는다(STATUS와 계획이 새 근거를 링크하기 때문이다).

### Requirement 10: 보존 조건

**User Story:** 저장소 주인으로서, 이 하네스 작업이 Codex 원본, Codex의 진행 중 파일, 과거 근거, 제품 코드와 작품 데이터, 안전장치를 그대로 두기를 원한다. 그래서 Codex가 멈춘 지점에서 그대로 이어 갈 수 있고, 과거 기록과 안전장치를 계속 믿을 수 있다.

#### Acceptance Criteria

1. THE Kiro 에이전트 SHALL Codex 원본을 읽기 전용으로 다루고, 바꿀 내용이 생기면 문안을 사용자에게 제안한다.
2. THE Kiro 에이전트 SHALL Codex 미커밋 제품 파일을 읽기 전용으로 다룬다.
3. WHEN 이 spec의 task를 시작하고 마치면, THE Kiro 에이전트 SHALL Codex 미커밋 제품 파일의 SHA-256을 계산해 시작과 끝의 값이 같음을 확인하고 보고에 적는다.
4. IF task 도중 Codex 미커밋 제품 파일의 SHA-256이나 수정 시각이 바뀌면, THEN THE Kiro 에이전트 SHALL 진행을 멈추고 `knol-resume`으로 확인한 뒤 사용자에게 알린다.
5. THE Kiro 에이전트 SHALL `docs/architecture/evidence/` 아래 기존 파일과 이력 문서(`docs/archive/`)를 그대로 두고, 새 결과는 새 파일로 남긴다.
6. THE Kiro 에이전트 SHALL 제품 코드(`apps/`, `packages/`, `renpy/`, `server/`, `scripts/`, `tests/`, `package.json`), 작품 데이터와 Asset ID, 브라우저 저장소(`knolstory-*`, 레거시 `nolstory-workspace-v1`과 `storygame*`)를 읽기 전용으로 다룬다.
7. THE Kiro 에이전트 SHALL 배포와 운영 Docker 변경을 이 spec의 범위 밖으로 두고, 커밋과 push는 사용자 확인 뒤에만 실행한다.
8. THE Kiro 에이전트 SHALL guard hook의 판정 세기(block, ask)를 유지하고, 기존 hook JSON과 guard 스크립트를 고칠 때 guard-write가 IDE 확인 창을 띄우는 보호 경로를 유지한다.
9. THE Kiro 에이전트 SHALL 하네스 검사의 기존 hook 판정 사례를 유지하고, 사례를 더할 때 기존 기대값을 약한 판정으로 바꾸지 않는다.
10. THE Kiro 에이전트 SHALL 정식 기록을 고칠 때 `docs/architecture/documentation-governance.md`의 소유 원칙(같은 사실은 소유 문서 한 곳, 다른 곳은 링크)을 따른다.
11. IF 정식 기록 파일에 이 세션이 만들지 않은 미커밋 변경이 있으면, THEN THE Kiro 에이전트 SHALL 고치기 전에 `knol-resume`으로 멈춘 지점을 확인한다.

### Requirement 11: 문체와 스크립트 관례

**User Story:** 하네스를 읽고 고치는 에이전트와 사람으로서, 하네스 문서와 스크립트가 저장소의 문체와 관례를 따르기를 원한다. 그래서 저장소 검사기를 통과하고 어느 작업 경로에서도 같은 방식으로 동작한다.

#### Acceptance Criteria

1. THE Kiro 에이전트 SHALL 이 spec이 만들거나 고치는 문서를 한국어로 쓰고, 코드 식별자·경로·명령은 원문 그대로 둔다.
2. THE Kiro 에이전트 SHALL 문서에서 em dash(U+2014) 대신 쉼표·마침표·괄호를 쓰고, 경로는 저장소 루트 기준 상대 경로로 쓴다(ADR 0012).
3. THE Kiro 에이전트 SHALL 제품 용어 사용 기준(`docs/architecture/editor-terminology-and-time.md`)의 현재 용어를 쓰고, 에이전트 문서는 spec, 작업 노트, 인수인계 문서, 개선 기록, 능력 목록으로 부른다.
4. THE Kiro 에이전트 SHALL 새로 쓰거나 고치는 설명 문장에서 포함 참조 문법을 '포함 참조'라는 이름으로 부르고, 실제 포함은 영역 절차 래퍼 스티어링에만 둔다.
5. THE Kiro 에이전트 SHALL 하네스 스크립트를 기존 관례대로 Node 22에서 빌드 없이 실행되는 ESM `.mjs`로 쓰고, Node 내장 모듈만 쓴다.
6. WHEN 하네스 스크립트를 고치면, THE Kiro 에이전트 SHALL `pnpm exec eslint .kiro`에서 오류 0을 확인한다.
7. WHEN Kiro 하네스 파일을 고치면, THE Kiro 에이전트 SHALL 하네스 검사를 실행해 문제 0을 확인한다.

## 범위 밖

- Codex 미리 듣기 수정의 이어받기(web typecheck 수정, E2E, 커밋), Pages 재배포, 원격 재검증. 이어받는 주체(Kiro 또는 Codex)는 사용자 결정 대기이며 재개 지점에 적는다. 이 spec에서 정하지 않는다.
- 운영 도메인 전환.
- 제품 기능 변경(배포한 페이지 제목 수정 포함)과 권리 판단.
- 계획의 정적 읽기·편집 우선 순서 표(SD 단계) 갱신. 다음 행동의 마지막 단계(원격 재검증 뒤 기록)에 맡긴다.
- 매 프롬프트 hook과 모델 비용 hook 추가. 기록 신선도 경고는 세션 시작 요약에만 둔다.
- Codex 원본 변경. 바꿀 내용이 생기면 문안만 제안한다.
