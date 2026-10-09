# Ren'Py Web spike — 반응형 편집 연결 결과

날짜: 2026-10-06. SDK: Ren'Py 8.5.3. 로컬 macOS Chrome/Chromium 자동화에서 실제 WASM을 실행했다. 전체 S1–S12 완료나 물리 학교 기기 성능 판정은 아니다.

## 결론

반응형 Web 편집 Shell과 고정 논리 Stage를 사용하는 실제 Ren'Py Web presenter를 연결했다. Web-native 대사·화자 입력, 인물 좌표 수정과 드래그, 패널 토글, portrait/landscape viewport 변화가 같은 iframe을 유지한다. 작품 도메인 이식 전의 명시적인 probe fixture이며 제품 StoryDocument 스키마가 아니다.

## 실제 발견과 수정

처음에는 iframe 크기를 컨테이너에 맞춰 직접 바꿨다. Ren'Py 8.5.3의 `renpy/display/core.py:get_size`는 내부 화면 크기를 최소 256×256으로 취급한다. 높이 210px의 실제 canvas와 engine physical size 256px가 달라져 장면이 잘리고, 인물 위 편집 핸들에 약 33.5 CSS px 오차가 발생했다. 실제 화면 픽셀을 비교한 테스트가 실패해 이를 확인했다.

iframe 내부 viewport를 1280×720으로 고정하고 Web에서 iframe 전체에 contain 배율과 offset을 적용해 수정했다. Ren'Py의 실제 virtual-to-physical viewport를 이벤트로 보고하고, host는 이 내부 CSS rect를 동일한 배율로 변환한다. 엔진 SDK를 수정하거나 별도 Web 장면 렌더러를 만들지 않았다.

## 검증 증거

| 검사 | 결과 | 범위 |
|---|---|---|
| `pnpm typecheck` | 통과 | runtime-core, runtime-contract, Web |
| `pnpm lint` | 통과 | 저장소 소스 |
| `pnpm test:coverage` | 32개 통과 | 좌표·도메인 probe·event guard·iframe bridge |
| coverage | lines/statements/functions/branches 100% | 설정에 포함된 package src와 Web event adapter. React UI 전체·Python·bridge JS의 전체 coverage를 뜻하지 않음 |
| `pnpm build` | 통과 | Next 정적 export |
| 실제 Ren'Py Web build | 통과 | pinned SDK + Web 지원 + Korean font |
| `pnpm test:e2e` | 3개 통과 | 동일 iframe·대사/좌표 보존·페이지 overflow·런타임 없는 상태의 입력 보존 |
| `pnpm test:e2e:runtime` | 3개 통과 | 실제 WASM, DPR 1/1.5/2 각 1개 종합 시나리오 |

실제 런타임 종합 시나리오는 다음을 확인했다.

- 한국어 대사 변경 뒤 최신 `sceneRendered` revision 수신
- 390×844 → 844×390 → desktop viewport 변경 후 같은 iframe과 논리 좌표 유지
- 실제 렌더된 gold 인물 사각형의 픽셀 경계와 편집 핸들 위치 비교: 오차 < 2 CSS px
- 빠른 연속 8회 대사 변경 후 최종 값 반영
- 30회 연속 pointer 이동 중 mouseup 이전에도 복수 렌더 확인, 마지막 편집 revision 반영
- synthetic composition 이벤트 중 새 값 전송 보류, compositionend 후 최종 한국어 값 반영
- 드래그 중 viewport 변경 후 이전 변환으로 인물 위치가 추가 이동하지 않음
- 패널 접기·펼치기 후 인물 선택 유지

초기 단일 렌더 샘플은 약 40–53ms였고 한 스크린샷에는 host 전송 후 ack 69ms가 표시됐다. 이는 p95나 입력 시작부터의 지연이 아니다. 전체 입력·throttle·render·다음 paint 지연 측정은 후속 작업이다.

## 남은 범위

- 실제 Android Chrome, Chromebook, 학교 Windows 기기의 GPU·터치·native Korean IME·soft keyboard
- 한국어 긴 대사와 선택지의 모바일 가독성, paging/scroll 정책과 조작 편의성
- 실제 캐릭터 이미지, 알파 silhouette 레이아웃 동등성, 자산 공급 A/B 비교
- cold/cache 로드, 30분 메모리, 입력 지연 p50/p95, 오디오와 연출
- 최종 RuntimeScene v1과 JSON Schema, generation별 viewport 동기화 계약
- CI의 SDK 다운로드/실제 Ren'Py 빌드/런타임 검사 자동화. 현재 CI는 host 검사까지 구성했고 원격 실행 결과는 확인하지 않았다
- 패키지 의존 방향 자동 검사와 나머지 모노레포 패키지 골격

자동 QA의 DOM 검사만으로 성공 판정을 하지 않았으며, 실제 장면 픽셀과 보고 이벤트를 함께 확인했다. 실험 실행법은 [spike README](../../spikes/renpy-web/README.md), 설계는 [responsive editor 규칙](responsive-runtime-editor.md)을 참조한다.
