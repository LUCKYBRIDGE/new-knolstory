---
name: knol-implement
description: "spec의 task나 합의한 변경을 구현한다: 영역 절차 확인, 합의한 seam의 TDD, 두 축 검토, 검증·기록, 커밋. /knol-implement로 직접 부를 때만 쓴다."
license: MIT
metadata:
  invocation: user
  origin: "mattpocock/skills implement를 이 저장소의 검증·기록 규칙에 맞게 다시 씀"
---
# 구현

## 1. 대상 확인
spec task를 받았으면 그 task의 제목·인수 조건·`Blocked by`를 읽고 선행 task가 끝났는지 확인한다. 대상이 모호하면 묻는다. 시작 전에 `git status`를 보고, 이 세션이 만들지 않은 미커밋 변경이 같은 파일에 있으면 `disclose_context`로 `knol-resume`을 활성화한다.

## 2. 경계와 절차
해당 영역 절차가 자동 로드됐는지 확인한다(파일을 읽으면 `fileMatch`로 로드된다). 계약·형식이 바뀌면 버전과 명시적 migration을 먼저 정한다. 정해지지 않았으면 멈추고 묻는다.

## 3. TDD
`disclose_context`로 `knol-tdd`를 활성화하고, 합의한 seam에서 red → green 한 조각씩 진행한다.
- 자주: 바꾼 패키지의 `typecheck`와 단일 테스트 파일(`pnpm exec vitest run <파일>`).
- 끝에 한 번: 영향 범위의 전체 검사(`knol-verify`가 정한다).

## 4. 검토
`disclose_context`로 `knol-review`를 활성화한다. 기준 축과 요구 축의 결과를 보고, 고칠 것을 고친다.

## 5. 검증과 기록
`disclose_context`로 `knol-verify`를 활성화한다. 완료를 주장하기 전에 변경 영향에 맞는 검증을 실행하고 근거·정식 문서를 갱신한다. spec task면 체크박스를 갱신한다.

## 6. 커밋
현재 브랜치에 커밋한다. 이 작업의 파일만 이름으로 지정해 stage한다(`git add <파일>`). 다른 에이전트의 미커밋 변경은 섞지 않는다. 메시지는 기존 형식(`feat:`, `fix:`, `test:`, `docs:`, `deploy:` 같은 접두어와 영어 요약)을 따른다. push는 사용자가 요청할 때만 하며 hook이 확인을 묻는다.
