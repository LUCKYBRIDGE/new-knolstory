# ADR 0015 — 접근 가능한 이야기 텍스트 계층

**Status:** Accepted (2026-10-06)

## 배경

Ren'Py Web은 대사·해설·선택지를 canvas에 그린다. 스크린리더는 canvas 글자를 읽지 못하고, 키보드 포커스도 DOM 요소처럼 동작하지 않는다.
DESIGN.md의 접근성 요구(키보드 포커스, 비색상 상태, 읽기 가능성)와 충돌한다.

## 결정

1. Web 호스트는 현재 RuntimeScene의 **의미 정보를 DOM으로 미러링**한다.
   - 화자 + 대사/해설: `aria-live="polite"` 영역
   - 선택지: 실제 `<button>` 목록. 키보드·스위치 입력은 이 버튼으로 받고, 선택은 runtime-core에 전달한다.
   - 진행(다음 컷): 키보드 단축키 + 포커스 가능한 버튼
2. 이 계층은 **시각적 두 번째 렌더러가 아니다.** 기본은 시각적으로 숨김(screen-reader-only)이며, 무대 연출·배치를 재현하지 않는다. 데이터 원천은 Ren'Py에 보낸 것과 같은 RuntimeScene이다.
3. 선택적 “글자 크게 읽기” 모드는 이 계층을 시각적으로 표시할 수 있다. 이 경우도 무대 그림은 Ren'Py가 담당한다.
4. `prefers-reduced-motion`과 앱 내 동작 줄이기 설정은 `setPrefs.reducedMotion`으로 Ren'Py에 전달하고, Ren'Py 연출은 이를 따라야 한다.

## 결과

- ADR 0002의 “두 번째 Web Player 금지”와 충돌하지 않도록, 미러 계층은 텍스트·선택·진행 의미만 다룬다. 배경·인물·연출은 다루지 않는다.
- runtime QA에 스크린리더(NVDA/ChromeVox/TalkBack) 기본 동선을 추가한다.
