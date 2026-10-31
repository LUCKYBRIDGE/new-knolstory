---
inclusion: auto
name: kiro-writing
description: Kiro 하네스(.kiro의 스티어링·스킬·에이전트·hook·스크립트)를 만들거나 고칠 때의 작성 기준과 형식 규칙.
---
# Kiro 하네스 작성 기준

출처: [mattpocock/skills](https://github.com/mattpocock/skills)의 writing-for-agents(MIT)를 이 저장소의 문서 관리 기준에 맞게 다시 썼다.

## 원본은 한 곳
- 같은 뜻은 한 곳에만 둔다. 정식 소유 문서(`docs/architecture/documentation-governance.md`의 표)에 있는 사실은 링크하고 옮겨 쓰지 않는다.
- 환경도 원본이다. `package.json` 스크립트, 설정 파일, 폴더 구조처럼 한 번 보면 아는 것은 적지 않는다. 적을 것은 보이지 않는 관례, 선택의 이유, 설정이 말해 주지 않는 함정이다.
- Codex 양식(`AGENTS.md`, `apps/web/AGENTS.md`, `apps/web/CLAUDE.md`, `.agents/skills/`)은 원본 그대로 둔다. Kiro에서 필요하면 스티어링에서 포함 참조로 원문을 넣는다(예: `.kiro/steering/runtime-qa.md`). 바꿔야 하면 문안을 제안하고 사용자 승인을 받는다.

## 두 가지 부담
- 컨텍스트 부담: 항상 로드되는 줄(`kiro-harness.md`, 모든 스킬의 description)은 매 턴 비용이다. 항상 로드 파일에는 경로 안내만 둔다.
- 기억 부담: 직접 호출 스킬은 사람이 이름을 기억해야 한다. 그래서 `knol-router`가 흐름을 모으고 `.kiro/README.md`가 목록을 모은다.

## 로드 방식 고르기
| 필요 | 방식 |
|---|---|
| 모든 작업에 적용 | 스티어링 `inclusion: always` (최소한으로) |
| 특정 경로를 다룰 때 | 스티어링 `fileMatch`와 `fileMatchPattern` 배열 |
| 요청 내용으로 판단 | 스티어링 `auto`(name은 파일 이름과 같게, description 필수) 또는 자동 호출 스킬 |
| 사람이 부를 때만 | 직접 호출 스킬 또는 스티어링 `manual` |

## 형식
- 스티어링: front matter가 첫 줄. 포함 참조의 경로는 저장소 루트 기준. 설명 문장에는 포함 참조 문법을 글자 그대로 쓰지 않는다(Kiro가 실제 포함으로 해석한다).
- 스킬: `.kiro/skills/<이름>/SKILL.md`. `name`은 폴더 이름(소문자·숫자·하이픈, 64자 이하), `description`은 1024자 이하. Kiro 문서에 있는 키만 쓴다(`name`, `description`, `license`, `compatibility`, `metadata`). 호출 방식은 `metadata.invocation`에 `user` 또는 `model`로 적는다.
- 자동 호출 스킬의 description은 핵심 단어를 앞에 두고, 서로 다른 경우마다 계기를 하나씩 적는다. 직접 호출 스킬의 description은 사람이 읽는 한 줄 요약이며 '/이름으로 직접 부를 때'를 밝힌다.
- 다른 스킬을 쓰게 할 때: "`disclose_context`로 `knol-tdd`를 활성화한다". 직접 호출 스킬은 다른 스킬이 활성화하지 않고 사용자에게 `/이름` 실행을 권한다.
- 하위 에이전트는 새 컨텍스트로 시작하고, 필요한 사실과 기준 경로를 브리프에 모두 넣는다.
- 에이전트: `.kiro/agents/<이름>.md`. IDE에서는 `hooks` 필드를 쓰지 않는다. `model`은 비워 기본값을 따른다.
- hook: `createHook` 도구로 만든다. 스크립트는 `.kiro/scripts/`에 두고 저장소 루트 기준 상대 경로로 부른다. 차단은 exit 2와 stderr, 확인 요청은 stdout의 `permissionDecision: "ask"`.
- 저장소 파일은 루트 기준 백틱 경로로 쓴다. 검사기가 존재를 확인한다.

## 문장
- 단계마다 완료 기준을 둔다. 확인할 수 있고 빠짐없는 기준이 가장 강하다.
- 모든 경우에 필요한 단계는 본문에, 일부 경우만 필요한 참고는 같은 스킬 폴더의 `references/`로 내린다.
- 이미 모델이 아는 핵심 단어(tracer bullet, red/green, seam, frontier)를 그대로 반복해 쓴다. 같은 뜻을 문장으로 여러 번 풀지 않는다.
- 원하는 동작을 쓴다. 금지는 달리 말할 수 없는 안전 경계일 때만, 원하는 동작과 함께 쓴다.
- 기본 동작과 다를 바 없는 문장(no-op)은 통째로 지운다.
- em dash를 쓰지 않는다. 쉼표·마침표·괄호로 다시 쓴다.
- 로컬 절대 경로를 쓰지 않는다(ADR 0012).
- 화면 문구는 제품 용어 사용 기준(`docs/architecture/editor-terminology-and-time.md`)을 따른다. 에이전트 작업 문서는 spec, 작업 노트, 인수인계 문서로 부르고 제품의 `작품 파일`과 섞지 않는다.

## 바꾼 뒤
- 스킬을 추가·삭제하거나 이름을 바꾸면 `.kiro/README.md` 목록과 `knol-router`를 함께 고친다.
- `node .kiro/scripts/check-kiro.mjs`를 실행한다. 형식, 참조 대상, 링크와 경로, 절대 경로, 이전 제품 용어, 목록 동기화, Codex 절차 포함 여부, hook 판정 사례를 확인한다.
