# 현재 읽기 무대·실패 복귀·native 하단 글 검증 — 2026-10-14

직전 [연출 회귀](presentation-current-regression-validation.md)를 이어 reading-surface의 옛 버튼과 연결 보기 동선을 current UI로 이행했다. 미커밋 상태,530음원/23별칭, 등록 자료 전용 선택, 기존 private 보존, Pixabay 장면 결합 제한과 on-demand 전달을 유지한다. Excel ChatGPT 연결은 제외한다. 필요한 과거 내용은 현행 양식으로 옮기며 옛 양식/UI 일괄 복원을 요구하지 않는다.

## 기준과 분류

[기준5개 실행](evidence/reader-current-2026-10-14/baseline.log)은 접힌 보기 설정 없이 읽기 시작을 찾은 첫 실패, 옛 연결 입구 실패, 새 갈래 identity1성공 뒤 가로 읽기 중 의도적으로 중단했다. 관찰 결과는2실패/1통과/1중단/1미실행이다. 원본 spec과 context/trace를 보존했다. 중단 후 orphan owned3110 서버만 PID로 확인해 종료하고 focused 검사를 시작했다. user dev3000은 변경하지 않았다.

| 항목 | 판단 | 현재 경로·보존 조건 |
|---|---|---|
| 런타임 준비 실패의 읽기/복귀 | 구현됨·옛 selector 이행 | 보기 설정→처음부터 읽기→읽기 메뉴→전체 화면/이 컷 편집.503 상태에서 장목록·생성·대본이 읽기를 가리지 않고 stage너비>1150·원고 전체 불변 |
| 연결과 장 컷 수 | 구현됨·context 입구 이행 | 장 전체 글 도구→현재 컷 연결 dialog→실제 도착 컷.2컷 텍스트·현재 ID·aria-current·같은 장15cut count·원고 전체 불변 |
| 새 선택 갈래 번호 | 구현됨·서재 생성 경로 | 실제 소개→서재→생성→선택→새 갈래 확인.2장A 및 실제 chapterNumber/branchLabel·원래 선택 target ID |
| 가로/세로 실패 무대 | 구현됨·보기 입구 이행 |503 상태844×390/390×844의 stage상하 경계·height>240/>500 유지.편집 복귀 뒤 전체 문서 불변 |
| 실제 native 하단 글/도구 | 추가 실제 검증 |PC1280×900·태블릿820×1180·폰390×844/844×390의 rendered ack·화자/본문 rect·하단 dock·도구 순서/접힘·같은 iframe·같은cut 복귀·전체 저작 불변 |

## 모의 실패와 실제 재생

원래5개는 HTTP503 런타임 실패 상태의 Web host UI·geometry·복귀 검사다. native 글/선택지 재생 증거로 부르지 않는다. 기존 의미와1150/240/500 기준을 삭제하지 않고 원고·Flow·Stage 전체 비교를 추가했다.

별도4개는 실제 Ren’Py의 renderedRevision=sceneRevision>=0과 dialogueRects를 확인한다. 화자 하단이 본문 시작을 넘지 않고 본문이 native 장면 경계 안에 있어야 한다. 실제 본문 rect와 presenter 하단20 logical padding으로 계산한 글 상자 아래 display간격도0~50px 안에 있어야 한다. Core의 UI 도구용 공간·safe inset을 따르며 원고 좌표/배경을 재작성하지 않는다.

휴대폰 세로와 좁은 가로는 기본 접힘·지난기록 숨김을 확인하고 실제 펼친 뒤 **지난기록→저장→불러오기→자동→빠른 저장→빠른 불러오기**를 비교한다. 다시 접은 뒤 같은 읽기 메뉴 초점에서 실제 장면을 캡처한다. 태블릿/PC도 도구 순서와 장면 경계를 검사한다. frame marker, 읽은cut ID, 전체 exported project가 편집 복귀 뒤 같아야 한다. 별도 Web renderer나 native iframe 재생성은 없다.

본문 rect는 첫 native ready 장면에서 비교한다. 도구 펼침/접힘은 새 revision을 만들며, 이번 검사가 저장/불러오기 행동 전체를 새로 검증한 것은 아니다. 물리 삼성 키보드·보조 기술 검증도 아니다.

## 실제 결과

[host 후속](evidence/reader-current-2026-10-14/host-first.log)은5통과/4native 전용 제외, [native 후속](evidence/reader-current-2026-10-14/native-first.log)은4통과/5host 전용 제외다. 하단 gap 기준을 추가한 [최종 같은 실행](evidence/reader-current-2026-10-14/final.log)은9통과/9반대 프로젝트 제외(host5/native4)다. 제품 UI/Core/runtime 코드는 바꾸지 않고 현재 build를 사용했다.

stories-runtime 선택에 reading-surface를 추가했다. 새 native4검사가 host에서도 수집되므로 host collection은388개이며 이 중 native 전용은 제외된다. 실제 full388 성공으로 주장하지 않는다.

[Web 관련 단위](evidence/reader-current-2026-10-14/unit.log)는4파일13개 통과다. 명령에 없는 Core test 경로도 포함되어 Core는 실제 존재 경로로 별도 실행했다. [Core layout/dock](evidence/reader-current-2026-10-14/core-layout-unit.log)는3파일20개 통과다. E2E 전용 tsc·관련 ESLint·doclinks도 통과했다. 독립 읽기 전용 검토는 baseline 핵심 assertion 축소나 현재 기능 경계의 정확성 결함을 발견하지 않았다. 새 product build/fullunit/외부 앱/물리 입력/배포 실행은 주장하지 않는다.

## 남은 목표

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| reading-surface | 이행·범위 검증 완료 P1 |현재 메뉴/context·Core dock·native |기존503/assert5개와 실제4화면·전체내용/복귀 최종9성공 |
| reader 밖121/full388 | 미실행/이행 P1 |현재 도구·미디어·읽기 상태 |남은 구간 실행·old selector와 실제 결함 분류/수정 후 full collection 별도 실행 및 실패/제외 기록 |
| UI-OPTIONAL-REVIEW | 부분 P1 |목적별 편집·source판정/기존 focused 결과 |주요 제작 기능과 최신 범위 대조·실제 편집/취소/파일/native 증거 |
| 삼성/물리 입력·최초Chrome | 물리 미검증/조사 P1 |실기기·재현 trace |viewport/native 성공을 물리 검증 또는 최초 원인 판정으로 대체하지 않음 |
| 새 외부 앱/배포 | 미실행 |실제 환경/범위 |local codec/과거 artifact와 새 결과 구분.Excel ChatGPT 연결은 의도적 제외 |
