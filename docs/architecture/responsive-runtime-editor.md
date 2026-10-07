# Responsive Runtime Editor — 초기 편집 검증

## 결정과 검증 범위

Web 편집 UI는 반응형이며, 이야기 무대는 고정 논리 좌표계와 비율을 유지한다. 초기 probe는 1280×720(16:9)을 사용한다. 이는 제품 해상도의 최종 확정이나 StoryDocument 스키마 변경이 아니다.

편집 화면에서도 실제 Ren'Py Web을 사용한다. 런타임이 준비되지 않으면 대기·오류를 표시한다. HTML로 배경·인물·대사를 대신 그리는 폴백은 만들지 않는다. probe의 RuntimeScene fixture는 렌더/편집 연결 검증용이며 작품 저장 형식이 아니다.

판정은 "Ren'Py로 가능한가"보다 더 구체적이어야 한다. 이 probe가 통과하려면 실제 Ren'Py iframe을 유지한 채, Stage 표시·글상자·편집 오버레이·한국어 입력·모바일 landscape가 같은 좌표 계약 안에서 동작한다는 증거를 남겨야 한다.

## 소유권

| 부분 | 책임 |
|---|---|
| Web | 한국어 입력, 패널, 선택 상태, 포인터 capture, 편집 상태 보존 |
| runtime-core | 고정 논리 좌표, contain 변환, 화면→논리 역변환, 인물 이동의 불변 갱신 |
| Ren'Py | 전달받은 rect 표시, 한국어 대사 표시, 실제 글상자 영역·렌더 완료 보고 |
| runtime-contract | 버전·revision·입력 검증. probe 계약은 최종 RuntimeScene v1 전체가 아님 |

## 좌표와 크기 변경

- 무대를 contain으로 맞추고 가로·세로를 같은 배율로 변환한다. 남는 영역은 paper 색 여백이다.
- `scale = min(containerWidth / logicalWidth, containerHeight / logicalHeight)`.
- `stageWidth = logicalWidth * scale`, `stageHeight = logicalHeight * scale`.
- `stageLeft = (containerWidth - stageWidth) / 2`, `stageTop = (containerHeight - stageHeight) / 2`.
- pointer 역변환은 `logicalX = (clientX - containerLeft - stageLeft) / scale`, `logicalY = (clientY - containerTop - stageTop) / scale`이다.
- 화면 좌표는 CSS px 기준이다. DPR은 렌더 품질에만 반영하며 포인터에 이중으로 곱하지 않는다.
- 역변환 전에 화면의 무대 원점과 letterbox offset을 뺀다. 여백에서 시작하는 포인터는 편집 대상으로 취급하지 않는다.
- 인물 rect는 항상 논리 좌표로 저장한다. 화면 크기·패널 변화는 작품 내용에 영향을 주지 않는다.
- 런타임 viewport와 Overlay transform이 일치해야 한다. 실제 iframe/canvas resize와 그림 정렬은 브라우저에서 별도로 확인한다.
- 실제 8.5.3 검증에서 내부 표시 크기는 최소 256px로 취급됐다. 높이 210px iframe에서는 engine physical size가 256px인 채 canvas가 210px로 잘려 Overlay가 약 33px 어긋났다. 작은 CSS 컨테이너를 그대로 엔진 window 크기로 사용하지 않는다.
- 초기 구현은 iframe의 내부 viewport를 1280×720으로 유지하고 Web 컨테이너에 맞춰 iframe 전체에 CSS `scale`과 letterbox offset을 적용한다. Ren'Py 보고 rect는 iframe 내부 CSS 좌표이므로 Web host가 같은 배율과 offset을 적용한다. 엔진 내부 구도를 재계산하지 않고 실제 픽셀 정렬을 검증한다.
- 제품 강화 목표: 실제 엔진 viewport와 Web 투영이 동기화되기 전에는 드래그를 보류한다. canvas DOM rect만으로 실제 픽셀 정렬을 보장했다고 판단하지 않는다.
- 드래그 중 resize나 pointer cancel은 이전 변환으로 좌표를 계속 적용하지 않도록 종료한다. 현재 선택과 이미 반영한 작품 내용은 유지한다.
- 선택 테두리만 무대와 함께 변환하며 터치 조작 영역은 최소 44 CSS px를 유지한다.

## 런타임 수명과 편집 반영

- 하나의 iframe을 유지한다. breakpoint·패널 토글·텍스트 변경 때 iframe을 remount하거나 src를 바꾸지 않는다.
- 제품 강화 후보: resize·패널 토글·orientation·fullscreen 변화에 `viewportGeneration`을 도입하고 현재 generation의 렌더 확인 후 Overlay를 활성화한다. 초기 probe에는 이 필드가 없으며 실제 resize 동기화 결과로 계약을 확정한다.
- `ready` 이전 최신 scene을 보관하고, 준비 후 최신 revision을 전송한다. 빠른 변경은 최신 값으로 합친다.
- 순서·revision을 확인하고 이전 렌더 완료로 현재 편집 상태나 글상자 위치를 덮어쓰지 않는다.
- 텍스트 입력은 native Web textarea를 사용한다. IME 조합 중간 값 전송을 조절하되 Web 입력 자체를 잃지 않는다.
- edit 모드에서 매 수정마다 진입 연출·오디오를 다시 시작하지 않는다.
- iframe의 source와 정확한 origin, protocol/contractVersion과 payload를 검증한다.
- Ren'Py 공식 Web API를 pinned SDK에서 확인한다. JS push API가 없다는 과거 가정이나 33ms polling 목표를 검증 없이 구현 계약으로 고정하지 않는다.

## 모바일 landscape 편집

스마트폰 landscape에서는 Stage, 글상자, 편집 입력을 한 화면에 항상 동시에 크게 보여주려 하지 않는다. Stage는 실제 결과를 확인하는 영역이고, 긴 글 작성은 Web-native bottom sheet 또는 focus panel에서 처리한다.

- Ren'Py 글상자는 최소 2-3줄의 한국어 대사를 읽을 수 있어야 한다.
- 글상자가 좁아서 긴 문장이 넘치면 Web editor에서 전체 내용을 보존하고, Ren'Py 미리보기는 paging/scroll/축약 정책 중 하나를 명시한다. 조용한 clipping은 실패다.
- 직접 드래그가 어려운 크기에서는 inspector의 수치·정렬 컨트롤로 같은 편집이 가능해야 한다.
- 선택지 화면은 작은 landscape에서 대사 영역과 동시에 과밀하게 두지 않는다. 선택지 presentation은 별도 상태로 취급한다.
- 모바일 keyboard가 올라온 뒤에도 입력 중인 텍스트, 선택 cut, runtime iframe이 보존되어야 한다.

## 우선 검증

| 시나리오 | 통과 조건 |
|---|---|
| PC 창 resize·패널 열기/닫기 | iframe 인스턴스·선택·대사 유지, Overlay 정렬 오차 ≤ 2 CSS px (초기 목표) |
| 태블릿·폰 세로/가로 | 가로 페이지 overflow 없음, 입력·위치 조절 도달 가능 |
| DPR 1/1.5/2 | 같은 논리 위치에 표시, 포인터 왕복 오차 ≤ 1 logical px (초기 목표) |
| 대사 빠른 입력·한국어 조합 | 최종 텍스트 손실 없음, 최신 revision 렌더 |
| 드래그·키보드·수치 이동 | 논리 rect 갱신, 경계 밖 이동 방지, resize 중 jump 없음 |
| 실제 Ren'Py 렌더 | 최신 sceneRendered 수신, 선택 핸들과 인물 외곽 일치 |
| 모바일 landscape + keyboard | Stage 재생성 없음, 입력 보존, 글상자 clipping 없음 |
| 로드 실패·bridge 오류 | 명확한 상태 표시, 작성 중 텍스트 보존, 폴백 장면 없음 |

DOM geometry·가짜 bridge 테스트만으로 Ren'Py 편집 성공을 선언하지 않는다. 실제 런타임의 스크린샷·렌더 완료·수명과 입력 반영을 확인하고, 확인하지 못한 기기/IME/장시간 성능은 결과 문서에 남긴다. S1/S2/S4/S7/S11/S12에 이 검증을 우선 배치하고 M6까지 미루지 않는다.
