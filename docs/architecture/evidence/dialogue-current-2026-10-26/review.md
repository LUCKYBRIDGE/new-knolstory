# 현재 클릭 연출·본문·선택지 검사 이행

전체 scripts 실행의 이전4오류를 실제runtime source와 대조했다. 실행 추출문맥에 knol_effect_step_pending/knol_manual_title이 빠져 있었고, 마지막진행버튼은 클릭효과를허용하는현재조건을찾지못했다. 고정False로우회하지않고실제두함수를설치한다. 기존음향/전환/선택지보호검사를유지하고, 페이지우선→효과step대기→모든step완료뒤선택지순서를추가확인했다. 각입력은정확히하나의advanceRequested만호스트에요청하며native가current값을바꾸지않는다.

실제클릭효과native검사첫시도는touchscreen을사용하면서hasTouch가없는설정오류였다. 브라우저문맥에명시하고첫휴대폰전체화면안내는이검사의목적에맞게세션설정으로처리했다. 실제runtime/postMessage입력을mock하지않았다. 네검사를한실행으로통과했고원고대조/저장복원/시점전환/왼쪽이전동작근거를유지한다.

이는검사이행이며제품runtime source를바꾸지않는다. 렌더해상도상한후보의실제실행근거를보강하지만 USB연결이없으므로최종실기기DPR/메모리/30분gate는미완료다. 이전증거는덮어쓰지않는다.
