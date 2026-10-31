---
name: knol-spec
description: "지금까지의 대화와 코드 이해를 .kiro/specs/<계획ID>-<이름>/의 요구·설계·tracer bullet task로 정리한다. /knol-spec으로 직접 부를 때만 쓴다."
license: MIT
metadata:
  invocation: user
  origin: "mattpocock/skills to-spec + to-tickets를 Kiro spec 형식에 맞게 다시 씀"
---
# spec 만들기

새 인터뷰를 하지 않는다. 대화에서 이미 정한 것을 정리한다. 열린 결정이 남았으면 먼저 `/knol-grill`을 권한다.

## 1. 위치 정하기
계획 문서(`docs/architecture/product-completion-plan.md`)의 작업 ID를 찾는다. 폴더는 `.kiro/specs/<계획ID 소문자>-<짧은-이름>/`. 같은 작업의 spec이 이미 있으면 새로 만들지 말고 갱신한다. 형식 규칙은 `kiro-specs` 스티어링이 자동으로 로드된다.

## 2. 코드와 경계 확인
아직 보지 않았으면 관련 코드를 본다(필요하면 `context-gatherer`를 새 컨텍스트로). 바뀌는 모듈과 책임 경계, 관련 ADR, 영역 절차, 기존 작품 보존 조건을 확인한다.

## 3. seam 합의
테스트할 seam을 정한다. 기존 seam을 우선하고, 가능한 가장 높은 seam을 고른다. seam은 적을수록 좋다. 이상적으로는 하나다. 사용자에게 seam 목록과 각 seam이 잡는 것·놓치는 것 한 줄씩을 보여 주고 확인받는다. 이 저장소의 seam 후보는 `knol-tdd`의 `references/seams.md`.

## 4. requirements.md와 design.md 쓰기
`kiro-specs`의 형식대로. 사용자 이야기는 길고 빠짐없게, 인수 조건은 EARS로.

## 5. task 초안과 확인
tracer bullet 세로 조각으로 나눈다. 조각마다 필요한 층을 좁게 끝까지 관통하고, 혼자 검증되고, 한 세션에 끝난다. 각 task에 `Blocked by:`를 단다. 사용자에게 번호 목록(제목, Blocked by, 무엇이 동작하게 되는가)을 보여 주고 묻는다.
- 크기가 적당한가(너무 굵거나 잘지 않은가)?
- 의존 관계가 맞는가? 정말 막는 task만 선행으로 적었는가?
- 합치거나 더 나눌 task가 있는가?

승인될 때까지 고친다.

## 6. tasks.md 쓰고 연결
승인한 task를 쓴다. 계획 문서의 해당 작업 행에 spec 경로 링크를 제안한다(계획은 정식 문서이므로 사용자가 원하면 고친다). 실행은 Kiro의 Start task나 `/knol-implement`. 선행 task가 모두 끝난 task(frontier)부터 한다.
