# Ren'Py Web Spike 계획

## 위상

Ren'Py Web 채택은 **소유자 확정 사항**이다 (2026-10-06). 이 spike는 채택 여부를 판단하는 게이트가 아니라,
**구현 방식과 UX 제약을 계약 작성 전에 확인**하기 위한 것이다. 결과는 ADR 0013(예산)·0014(bridge)를 확정하는 데 쓴다.

Blueprint v1.3에서는 Ren'Py 관련 첫 작업이 7단계였다. 이 시점에 제약이 발견되면 RuntimeScene 계약(5단계)과 runtime-core(6단계)를 다시 고쳐야 하므로, spike를 **모노레포 생성 직후, 도메인 이식과 병행**해 앞당긴다.

## 범위

반응형 편집은 핵심 초기 검증이다. [Responsive Runtime Editor](responsive-runtime-editor.md)의 좌표·수명·IME·드래그·패널/viewport 변경 시나리오를 S1/S2/S4/S7/S11/S12에서 먼저 확인한다. 실제 Ren'Py 실행 증거 없이 편집 가능성을 완료로 표시하지 않는다.

`spikes/renpy-web/`에 임시 코드를 둔다 (프로덕션 코드 아님, 결과 문서화 후 삭제 또는 보관).

| # | 확인 항목 | 산출물 |
|---|---|---|
| S1 | 최소 Ren'Py Web 빌드를 same-origin iframe에 삽입, stock UI 완전 제거 | 빌드 절차, 기본 다운로드 크기 |
| S2 | JS → Ren'Py polling bridge 왕복 지연, polling 간격별 CPU 비용 | 지연 p50/p95, 권장 간격 |
| S3 | 하드코딩 RuntimeScene 1개(배경 1 + 인물 4 + 대사) 표시 | 렌더 소요 시간 |
| S4 | 빠른 연속 변경(초당 10회 텍스트 변경)과 Korean IME composition 시 revision 폐기 동작 | 반영 지연, 깜빡임 여부, 조합 중 손실 여부 |
| S5 | 자산 공급 방식 A(빌드 포함) vs B(fetch → 가상 FS) | 방식 선택, 캐시 전략 |
| S6 | 한국어 폰트 포함 시 크기·렌더 품질·줄바꿈(한국어 어절) | 폰트 선택, 크기 |
| S7 | 고정 논리 Stage(1280×720) → responsive container contain 투영, 텍스트 박스 실제 rect 보고 → DOM Overlay 정렬 (DPR 1/1.5/2, letterbox) | 정렬 오차, host projection과 Ren'Py content rect 차이 |
| S8 | 레거시 연출 3종(전환·흔들림·분위기 look)을 RuntimeScene 의미로 재현 | ATL 매핑 가능성 |
| S9 | 모바일 오디오 잠금 해제 흐름 | UX 흐름 |
| S10 | 30분 연속 컷 교체 메모리 추이 | 메모리 곡선 |
| S11 | actor drag 중 패널 collapse/resize/orientation/fullscreen 변경 | 좌표 jump 여부, gesture 취소 정책 |
| S12 | 스마트폰 landscape에서 Stage + dialogue + bottom-sheet editing | 읽기 가능성, text clipping 여부, 핵심 편집 도달성 |

## 측정 기기 (ADR 0013)

- 학교 Windows PC급 (Chrome)
- 크롬북
- 안드로이드 태블릿 (보급형 포함)
- 안드로이드 스마트폰 (보급형 포함)
- Chrome 기준으로 측정한다. Safari / iPad·iPhone은 현 단계 spike 범위 밖이다.

## 완료 기준

- 위 항목별 수치·결론을 `docs/architecture/renpy-web-spike-results.md`에 기록
- ADR 0013 수치 확정, ADR 0014 Proposed → Accepted (변경 사항 반영)
- 예산을 넘는 항목은 **해결 방향**(구성·자산·UX 조정)을 함께 기록한다. 별도 Web 렌더러로 우회하는 결론은 허용하지 않는다.
- 고정 논리 Stage + responsive editor shell이 실패할 경우, 실패 원인을 Ren'Py 설정·bridge 지연·자산/폰트·모바일 UX 중 하나 이상으로 분리해 기록한다.
