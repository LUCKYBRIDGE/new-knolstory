# 점수와 조건에 따른 이야기 저작 개발 계획

2026-10-10. 상태: 현재 범위 구현과 최종 회귀 검증 완료. 현재 형식·창작 편의성을 우선하고 이전 파일 형태에 모델을 고정하지 않는다. 현재 Next 작품과 작성 문구·ID·Flow·Stage 의미는 보호한다.

## 목표와 완료 조건

작가가 점수 항목(이름·설명·시작 값)을 정의하고, 선택 결과로 점수를 더하거나 설정하며, 누적 점수 조건에 따라 선택지·줄거리·엔딩을 바꾼다. 같은 정의·효과·조건을 앱·한글 workbook·공식 archive·JSONB 계약으로 왕복한다. 학생 평가 점수/성적이나 서버 정책으로 해석하지 않는다.

- 사용자 정의 항목과 선택별 증감/설정, 조건 비교·전체/하나라도 만족, 기본 경로를 쉽게 편집한다. 예시는 작가가 선택해 사용하는 것으로 원작/사용자 문구를 자동 수정하지 않는다.
- Runtime Core가 상태/조건/진행을 소유하며 Ren’Py에는 결정된 장면·선택지만 전달한다. 임의 Python/JS 수식 실행을 저작 형식에 넣지 않는다.
- 저장/불러오기, 뒤로/지난 기록/재선택/재시작은 점수를 검증·재구성하고 같은 진입/revision에서 중복 증가하지 않는다. 중간 컷 읽기/미리보기는 이전 선택을 임의 생성하지 않는다.
- 기존 분기·합류·pending/ending 의미, 원고와 자산/표지/음원 보호를 유지한다. 조건이 전부 거짓인 선택은 오류/대기와 수정 안내로 드러나고 자동으로 잘못된 경로를 진행하지 않는다.
- 정의/조건/효과/조건 경로가 한글 탭·열·메모·입력 안내로 편집되고 unknown/broken reference/type/value는 적용 전에 검증한다.
- 단위/통합, 실제 작품/외부 Excel·Google 편집→파일/JSONB→재열기, PC/태블릿/폰 UI, 실제 native 합류 이후 조건 엔딩을 검사한다. 미검증 환경은 완료로 기록하지 않는다.

## 진행 순서

1. 공통 데이터 계약·보존/버전 결정 및 domain validation.
2. 재생 상태·경로 기반 점수 계산·조건 진행/표시·복원.
3. 점수 항목과 선택 효과/조건 경로의 한글 UI.
4. 동일 계약의 표·archive/schema·JSONB 연결과 사용자 안내.
5. 실제 외부 앱 및 Web/Ren’Py 검증, 코드 리뷰, STATUS/DESIGN/계약/증거 갱신.

각 단계는 소유 파일을 구분해 진행한다. 실제 구현에 맞춰 이 계획을 수정하고 최종 증거와 남은 범위를 구분한다. 서버/학급 정책 결정은 포함하지 않는다.


## 현재 구현과 증거

점수 정의·선택 add/set 효과·모두/하나 이상 조건·순서 있는 조건 경로, schema6/archive2/workbook3 및 명시적인 이전 Next 변환을 구현했다. Core의 선택 기록 재계산과 Web의 한글 편집/점수 확인 UI를 사용한다. [정식 계약과 작성 예제](score-narrative-contract.md), [ADR0017](../decisions/0017-story-score-authoring.md).

실제 Microsoft Excel와 Google 시트에서 점수 설명·선택 효과·결말 조건을 각각 수정·저장/반출하고 변경한3개 값 외 모든 내용 일치를 검사했다. [외부 앱 검사](evidence/score-narrative/external.log). 새 증거는 `evidence/score-narrative/`에 보관하며 이전 형식 manifest와 실행 수치를 덮어쓰지 않는다. 최종 검사: 단위·계약·통합1,049개/95개 파일 통과, 전체 statements93.42%/branches90.87%/functions96.72%/lines98.64%. native4개 통과·host 전용2개 제외: 기본 작품 PC/휴대폰과 실제 Excel/Google 반출 PC의 누적·reload·선택 표시·세 결말·뒤로 기록 제거를 확인했다. host3개 통과·native 전용4개 제외: 점수 작성4개 viewport와 효과/경로 편집·반출·reload를 확인했다. typecheck/build/lint 통과, lint 경고0. [native](evidence/score-narrative/native-complete.log), [host](evidence/score-narrative/host-final.log), [coverage](evidence/score-narrative/coverage-final.log). 최종 source/evidence manifest와 검증 감사는 같은 증거 디렉터리를 기준으로 별도 기록한다.

## 후속 목표

| 목표 | 구현 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| SCORE-QA | 완료 P1 | 현재 정적 빌드와 Ren’Py 실행 환경 | 현재 예제 및 실제 Excel/Google 반출의 선택·누적·합류·결말, 뒤로/재선택/복원, viewport와 회귀 결과를 별도 기록 |
| SCORE-ADVANCED | 미구현, 필요 확인 후 P3 | 작가 요구와 별도 버전/복원 계약 | boolean 플래그·중첩 조건 등이 필요할 때 편집/표/파일/Core의 동일 의미와 기존 Next 보존을 검증; 현재 완료의 필수 gate는 아님 |
| QA-DEVICE | 미검증 P2 | 학교 PC/Chromebook/Android와 보조 기술 환경 | 실제 기기 양 방향 조작·복원·성능·접근성 증거 기록; browser viewport를 실기기로 간주하지 않음 |
| SV-CONTRACT / SV-CLASS | 미구현 P1 | 서버 ADR, 인증/권한·DB·자산 저장 및 소유자 운영 결정 | [STATUS](../../STATUS.md)의 서버 완료 조건; 점수를 학생 성적으로 임의 연결하지 않음 |

계획은 [변경 관리](documentation-governance.md)에 따라 수정한다. 추가 사용자 결정은 해당 범위의 계약·우선순위·완료 조건을 함께 바꾸며, 과거의 완료 기록을 현재 새 범위의 증거로 확대하지 않는다.

최종 증거·외부 앱 수정 위치·검증 한계는 [검증 기록](score-narrative-validation.md)이 소유한다. 잘못된 점수 참조 반입 거부/현재 작품 보존/정상 파일 재반입 검증을 추가해 최종 host 결과는3개 통과다.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
