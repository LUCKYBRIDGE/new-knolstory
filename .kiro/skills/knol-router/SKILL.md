---
name: knol-router
description: "지금 상황에 맞는 KnolStory 작업 흐름과 스킬을 안내한다. /knol-router로 직접 부를 때만 쓴다."
metadata:
  invocation: user
  origin: "mattpocock/skills ask-matt 흐름을 이 저장소에 맞게 다시 씀"
---
# KnolStory 작업 흐름 안내

스킬 이름을 다 기억하지 않아도 된다. 상황을 말하면 이 안내도가 다음 걸음을 고른다. 각 스킬의 실제 절차는 그 SKILL.md가 소유한다. 여기 요약은 길잡이일 뿐이니, 단계를 건너뛰라고 권하기 전에 해당 SKILL.md를 읽는다.

## 세션을 시작할 때
- 세션 시작 요약은 hook이 자동으로 보여 준다(로컬 Git·최근 흔적).
- **`/knol-status`**: 로컬·GitHub·Cloudflare·실제 응답까지 읽기 전용 전체 점검.
- 이 세션이 만들지 않은 미커밋 변경이 있으면 **`knol-resume`**: Codex나 이전 세션이 멈춘 지점을 재구성하고 이어받는다.

## 주 흐름: 생각 → 구현 → 검증
1. **`/knol-grill`**: 계획이나 아이디어를 질문으로 다듬는다. 결정이 나오는 즉시 정식 문서(용어 기준·ADR·계획 질문)에 기록한다. 모든 변경의 출발점이다.
2. 질문 중 직접 보고 판단해야 하는 것(화면, 상태 모델)이 있으면 실험 코드로 확인하고 돌아온다. 결과는 계획이나 spec에 링크한다.
3. 한 세션에 끝나는가?
   - **예**: **`/knol-implement`**를 같은 컨텍스트에서 바로.
   - **아니오**: **`/knol-spec`**으로 `.kiro/specs/<계획ID>-<이름>/`에 요구·설계·tracer bullet task를 만든다. task는 Kiro의 Start task나 `/knol-implement`로 하나씩 실행한다. task 사이에는 새 세션으로 시작해도 된다. task가 자기 완결적이기 때문이다.
4. 구현은 **`knol-tdd`**(합의한 seam에서 red → green 한 조각씩), 마무리는 **`knol-review`**(기준·요구 두 축 검토).
5. **`knol-verify`**: 완료 보고 전에 변경 영향에 맞는 검증과 기록. 화면·Ren'Py·외부 앱은 그 경로에서 직접 확인해야 완료로 본다.
6. **`/knol-retro`**: 작업이 꼬였으면 그 세션 안에서 환경(검사·안내·스킬)을 고칠 점을 찾는다.

컨텍스트 관리: 1~3단계는 한 세션에서 이어 간다(질문의 이유가 spec에 그대로 들어가야 한다). 컨텍스트가 길어지면 단계가 끝나는 곳에서 끊는다. 단계 중간에 끊지 않는다.

## 들어오는 길
- **무언가 고장 났다** → **`knol-diagnose`**: red가 되는 재현 명령부터 만들고, 원인을 고친 뒤 회귀 테스트로 잠근다. 고친 뒤 `/knol-retro`로 무엇이 이 버그를 막았을지 본다.
- **배포·운영·도메인** → `release-gate` 절차(요청 내용으로 자동 로드)와 `knol-verify`. push·배포·운영 변경은 hook이 확인을 묻는다.
- **레거시와 비교** → `legacy-baseline`, `legacy-design-reference` 절차.
- **문서 구조·저장 형식 변경 뒤** → `migration-check` 절차.

## 마무리와 이전
- **`/knol-handoff`**: 다른 도구(Codex↔Kiro), 다른 사람, 다른 컴퓨터로 넘길 때 인수인계 문서를 만든다. 같은 Kiro에서 이어 갈 때는 필요 없다.
- 하네스 자체(스티어링·스킬·hook)를 고칠 때는 `kiro-writing` 기준이 자동 로드되고, 끝나면 `node .kiro/scripts/check-kiro.mjs`.
