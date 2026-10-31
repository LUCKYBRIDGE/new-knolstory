---
name: knol-verify
description: "완료·통과·배포됨을 말하기 전에 변경 영향에 맞는 검증을 실행하고 근거와 정식 문서를 갱신한다. 작업을 끝내거나 커밋·PR·배포 직전, 사용자가 '확인해', '검증해', '다 됐어?'라고 할 때 쓴다."
license: MIT
metadata:
  invocation: model
  origin: "이 저장소 고유 절차"
---
# 완료 전 검증과 기록

명령이 오류 없이 끝난 것은 근거가 아니다. 사용자가 실제로 요구한 동작을 그 경로에서 확인해야 완료다.

## 1. 요구를 다시 읽는다
원래 요청(또는 spec 인수 조건)을 다시 읽고 구체적 성공 기준(정확한 출력, 값, 파일 경로, 화면 동작)을 목록으로 만든다.

## 2. 영향에 맞는 검사를 고른다
바꾼 것을 근거로 고른다. 무관한 문서 수정이나 세션 전환을 이유로 무거운 검사를 다시 돌리지 않는다.

| 바뀐 것 | 최소 검사 |
|---|---|
| 문서·스킬·하네스만 | `pnpm docs:check`, `pnpm test:docs`, 하네스면 `node .kiro/scripts/check-kiro.mjs`, `git diff --check` |
| TypeScript 로직 | 바꾼 패키지 `typecheck`, 관련 단일 테스트, `pnpm lint`, 끝에 `pnpm test` |
| 화면 동작 | 위 + 해당 host E2E spec(실제 클릭·입력·복귀 경로) |
| 실행 계약·Core 해석·배치 | 위 + 계약 테스트 + 실제 Ren'Py(`pnpm runtime:build` 다음 `pnpm build`, 그다음 `stories-runtime` 해당 spec) |
| 작품 파일·양식 | 위 + 전체 문서 왕복, `node scripts/generate-authoring-schema.mjs --check`, 해당하면 외부 앱 왕복 |
| 자산·음향 | 위 + `pnpm test:media-provenance`, `pnpm test:service-audio` |
| 배포 후보·정적 전달 | `pnpm delivery:check`, `pnpm test:e2e:static`, 배포 뒤 실제 주소의 응답·재생 확인 |
| 서버 | `pnpm typecheck:server`, `pnpm --dir server test:integration` |

실행 묶음을 쓰는 빌드와 정적 export는 순서대로 실행한다. 동시에 돌리지 않는다. Playwright 프로젝트는 spec 목록을 직접 나열하므로 새 spec은 `playwright.config.ts`에 등록됐는지 확인한다.

## 3. 실행하고 결과를 대조한다
1단계의 기준마다 실제 결과를 맞춰 본다. 확인 못 한 기준은 확인 못 했다고 적는다. 실패를 건너뛰거나 부분 통과를 합쳐 '전체 통과'로 부르지 않는다. 모의(viewport 흉내, 모의 파일 핸들)와 실제(native Ren'Py, 외부 앱, 실기기, 실제 배포 주소)를 구분한다.

## 4. 기록한다
- 근거: 새 checkpoint. 형식은 [references/checkpoint-format.md](references/checkpoint-format.md).
- 제품 상태가 바뀌었으면 `STATUS.md` 맨 위에 날짜 항목(짧게, 근거 링크).
- 다음 행동·재개 지점이 바뀌었으면 `docs/architecture/product-completion-plan.md`의 해당 셀(날짜 '마지막 확인' 포함).
- 계약·UX·영역 절차가 바뀌었으면 그 소유 문서. 영역 절차(`.agents/skills/`)는 Codex 원본이므로 문안을 제안하고 승인받는다.
- 문서를 바꿨으면 `pnpm docs:check`와 `pnpm test:docs`.

## 5. 보고한다
한국어로: 무엇을 바꿨나, 어떤 명령으로 무엇을 확인했나(결과 포함), 확인하지 못한 것, 다음 행동. 완료 판정은 확인한 범위까지만 한다.
