# 현재 도구 패널·한국어 선택지 경계 회귀 — 2026-10-14

[공유 자료/배치 후속](shared-media-staging-current-validation.md)을 이어 실제63개 구간을 실행했다. 현재 양식8/archive2와 등록 자료 정책을 기준으로 한다. 모든 옛 파일 양식의 지원은 요구하지 않으며 필요한 옛 원고는 현재 문서 생성기로 변환한다. 원본 파일·미커밋 작업·private 기기 자료·530음원/23별칭/Pixabay14/on-demand 제한은 보존한다. Excel ChatGPT 추가 기능 연결은 제외한다.

## 기준과 원인

[기준63개 실행](evidence/final-tail-2026-10-14/host.log)은14통과/6실패/43미실행으로 max-failures6에서 종료했다. 저장·복구7개, 네 화면의 화자/글 native 겹침4개, 메뉴/이미지 dialog3개가 통과했다. 긴 원고 삭제/복구·다중 탭·손상 저장·stale draft 검사를 포함한다. 전체388 성공으로 합산하지 않는다.

실패6개는 현재 글 입력을 옛 텍스트 보기 버튼으로 찾던 폼4개와 접힌 선택지/연출 도구를 직접 찾던2개다. 원본 spec와 실패 screenshot/context/trace를 보존했다. UI를 복원하거나 핵심 assertion을 생략하지 않았다.

## 이행과 검증 의미

추가 편집을 실제 펼치고 목적에 맞는 연출을 선택한다. 기본 글 편집은 대사/해설 input으로 확인한다. 도구를 연 뒤 마지막 visible inspector를 고르는 옛 검사는 항상 아래의 기본 글 입력을 측정할 수 있어 폐기했다. 배경·인물/assets, 선택지/flow, 연출/presentation, 소리/sound의 열린 추가 패널을 정확히 선택하고 visible을 확인한 뒤 원래 controls 교차/overflow 한계를 유지한다.

점수 없는 선택지에서는 점수 상세가 없음을 확인한다. 작품 메뉴에서 점수를 실제 생성하고 같은 컷으로 복귀하면 같은 선택지의 결과/조건 상세를 열어 점수 변화를 추가할 수 있어야 한다. 불필요한 구 중첩 summary는 복원하지 않는다.

효과 undo는 다른 컷으로 이동한 뒤 현재 연출 패널을 다시 열어 확인한다. 다른 컷에는 이전 undo 자체가 없으며, 새 효과를 바꾸고 취소하면 원래 부재로 돌아가야 한다. 효과 종료 컷은 원래3화면의 패널 경계/overflow 검사를 유지한다.

긴 한국어 선택지의 글과 native 선택 영역은 원래 크기/경계 조건을 유지한다. 옹고집의 시점 전환 원고는 원본 fixture를 수정하지 않고 현재 StoryDocument 생성기로 변환해 실제 화자/본문 픽셀과 읽기→동일 컷 편집 복귀를 확인한다. 이 변환은 모든 옛 envelope 호환을 유지할 요구가 아니다.

## 실행 기록

첫 focused는 점수 설정 복귀 버튼을 잘못 부른 검사 실패를 확인하고 후속을 의도 중단했다. 실패/중단과 원본 trace를 보존한다. 관찰 timeout 때문에 진행 중 native 실행을 재시작한 것이 아니다. [첫 focused](evidence/final-tail-2026-10-14/clarity-first.log)는 잘못 부른 점수 설정 복귀 버튼의1실패 후 후속을 의도 중단했다. [두 번째](evidence/final-tail-2026-10-14/clarity-second.log)는8통과/1실패다. 컷을 옮긴 뒤 글 도구로 복귀했는데 연출을 다시 열지 않은 검사 오류를 고쳤다. 이 실행의 폼 검사는 reviewer가 찾은 마지막 visible inspector 문제를 아직 포함하므로 실제 추가 패널 겹침 증거로 사용하지 않는다.

[최종](evidence/final-tail-2026-10-14/clarity-final.log)은 **16개 한 실행 통과**다. 정확한 추가 패널과 현재 문서 변환을 모두 포함한다. host project에서 실제 runtime 파일과 native 화자/본문 pixel·선택 영역 acknowledgement를 사용했으며 모의 renderer를 설치하지 않았다. 별도 stories-runtime/full388/물리 기기 성공으로 확대하지 않는다. 긴 선택지 검사는 원래 ‘글 상자 위’ 및 왼쪽 경계 조건이며 모든 native 영역의 전체 containment 검사라고 부르지 않는다.

[관련 단위](evidence/final-tail-2026-10-14/related-unit.log)는4파일15개 통과다. E2E tsc·관련 ESLint·문서 링크도 통과했다. 독립 read-only 검토에서 실제 패널 선택 오류를 바로잡고 undo/현재 문서/점수 왕복 의미를 확인했다. 제품 UI/Core/native/format 버전 변경은 없다. 현재 시작 ZIP hash도 이전 기록과 같다.

## 남은 목표

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| 현재 ui-clarity16 | 이행·범위 검증 P1 | 실제 compact 패널·점수 왕복·native rect | 전체16의 동일 실행 성공과 실패/보정 근거 |
| 나머지 구간/full388 | 미실행/이행 P1 | 현재 저장/파일/읽기/자료 정책 | 남은40개 구간 후 전체 collection 별도 실행 및 제외 분류 |
| UI-OPTIONAL-REVIEW | 부분 P1 | 최신 계획과 제작 source | 제작 필수 기능의 구현/부분/누락/제외 판정과 실제 편집/파일/native 근거 |
| 삼성/물리 키보드·최초Chrome | 물리 미검증/조사 P1 | 실기기 및 최초 trace | 모의 viewport·후속 성공과 별도 확인 |
| 새 외부 앱·배포 | 미실행 | 실제 환경/범위 | 로컬 codec·과거 artifact와 새 결과를 구분. Excel ChatGPT 제외 |
