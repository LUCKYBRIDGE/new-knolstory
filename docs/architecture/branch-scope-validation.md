# 선택 갈래 연출·소리 구현과 검증 — 2026-10-14

상태: 갈래 조건 로컬6동선과 관련 회귀 검증 완료; 전체 목표는 잔여 gate를 유지한다. [계약](branch-scope-authoring-contract.md)과 [ADR0022](../decisions/0022-branch-conditioned-direction.md)을 따른다. Excel ChatGPT 추가 기능 연결은 사용자 결정으로 제외했다.

## 실제 변경

문서8/양식8의 cue 조건, 기존 문서/표 migration, 원본 JSONB fingerprint 확인, Core의 최근 실제 선택 해석, 효과/세 소리 종류의 조건·선택기/취소/갈림길 읽기와 삭제 보호를 연결했다. 선택·점수 기록이나 별도 renderer는 작품에 넣지 않는다. 기존 dirty worktree·530 음원/23 별칭·on-demand/private/Pixabay 정책을 유지한다.

## 실행 기록

변경 전 domain/UI RED와 후속 실패를 [증거 폴더](evidence/branch-scope-current/review.md)에 보존한다. 핵심 assertion을 생략하지 않고 소리 잠금/다운로드 파일명/alert 선택기의 검사 설정을 교정했다. 제품 UI를 옛 중첩 UI로 되돌리지 않았다.

- [전체 단위/통합·coverage](evidence/branch-scope-current/coverage-final.log):152개 파일1255개 통과, artifact 작성용2개 제외. statements93.87%, branches91.31%, functions96.68%, lines98.71%. 전체 browser suite 성공을 뜻하지 않는다.
- [타입 검사](evidence/branch-scope-current/typecheck-final.log):6패키지 통과. [현재 Web 빌드](evidence/branch-scope-current/build-final.log), scoped ESLint와 생성 스키마 check 통과. RuntimeScene/native engine은 바꾸지 않아 기존 native package를 사용한다.
- [현재 갈래 browser6동선](evidence/branch-scope-current/ui-verified.log):1440×900/768×1024/390×844/844×390 네 viewport에서 실제 native 두 선택지, 반복/되돌림/재선택, 빠른 저장·불러오기, 전체 원고·Stage·Flow 비교, 파일/reload/Excel 파일 왕복·읽기 복귀를 통과했다. 별도 한글 조합·저장 실패·참조 갈림길 삭제 보호1개, 선택지 없는 작품의 불필요한 조건 숨김/무변경1개도 통과했다.
- [native 화면 픽셀](evidence/branch-scope-current/native-pixel-comparison-final.json):같은 합류 컷의 조건 활성/비활성 상단 무대 픽셀 변화82–90%를 확인했다. 실제 spotlight 자원 로드·native rendered revision 일치와 실제 음악/환경음 경로·효과음 횟수 검사를 함께 사용했다. [휴대폰 조건](evidence/branch-scope-current/screens/branch-condition-390.png), [휴대폰 native 활성](evidence/branch-scope-current/screens/branch-native-active-390.png).

Excel 파일 검증은 로컬 codec와 Web 가져오기/보호 저장/native 실행이며 실제 Excel 추가 기능이나 새 외부 앱 편집 증거가 아니다. 빠른 저장은 기기 읽기 상태이며 파일에는 실제 choiceHistory를 넣지 않는다. viewport/합성 composition·quota 오류는 물리 삼성 입력 결과가 아니다. 최초 Chrome 오류의 원인 해결도 주장하지 않는다.

도메인 별도 reviewer는 완료했으나 cross-layer reviewer는 agent 사용량 한도로 종료됐다. [직접 소스 검토](evidence/branch-scope-current/review.md)와 현재 전체 검증을 대신 수행했으며 독립 통합 review 완료라고 적지 않는다.

기존 관련 회귀는 [native 전체 실행](evidence/branch-scope-current/related-native.log)의21통과/host 전용3제외/현재 내보내기 버전 기대값1실패를 그대로 보존했다. 버전 기대값을7→8로 고친 [host4동선](evidence/branch-scope-current/related-host-final.log)은 전체 파일/양식·점수 경로/참조 오류 보존을 통과했다. [native 범위 파일 재검사](evidence/branch-scope-current/related-native-range-final.log)는1개 통과한 별도 결과로 기록한다. 같은 사례의 후속 성공을 최초 실행의25전부 성공으로 합산하지 않는다. 현재 cut-range-delete의 옛 숨겨진 경로도 compact 목적 선택/장 전체 글 상세로 이행했으며 의존 항목 안내·삭제 차단/해제·원고 보존을 유지했다.

## 남은 완료 조건

| 항목 | 상태/우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| UI-RANGE-BRANCH 로컬 | 구현·범위 검증 P1 | Core 실제 선택·current Web/native 빌드 | 네 viewport 동일 목적지 재선택/반복·전체 파일/양식/JSONB·IME/저장 실패·삭제 guard |
| UX-REGRESSION-NAV | 부분 P1 | compact UI와 기존 assertions | 남은 현재 회귀를 핵심 생략 없이 이관·전체 적용 동선 검증 |
| UX-NATIVE-ERROR | 조사 P1 | 최초 예외/재현 증거 | Chrome 최초 오류 원인 판정 및 필요한 재현 회귀 |
| UI-SAMSUNG/QA-DEVICE | 미검증 P2 | 물리 기기/가상·물리 키보드 | 실제 입력·겹침·회전·접근성·성능 증거 |
| 외부 앱/배포 | 별도 미검증 | 실제 편집/운영 환경·기존 정책 | 새 외부 앱 수정/저장/반출과 배포 환경 별도 검증 |
| Excel ChatGPT 연결 | 의도적 제외 | 2026-10-14 사용자 결정 | 연결/로그인 요구를 반복하지 않음 |
