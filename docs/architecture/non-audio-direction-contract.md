# 비음원 연출 저작·실행 계약

2026-10-10. StoryDocument6/archive2는 원본, Runtime Core는 의미 해석, RuntimeScene1/presentation2는 실행 표현, Ren’Py8.5.3은 실제 표시를 담당한다. 저작 workbook은6판이다. [계획·분류](presentation-authoring-development-plan.md), [검증](non-audio-direction-validation.md), [저장 계약](authoring-storage-contract.md)을 함께 읽는다.

## 효과 시간과 순서

`StoryEffectCue.durationMs`는 선택적인 유한 숫자0–10000ms다. 부재는 기존 기본 시간(흔들림600, 갈라짐/현실 균열1800, 나머지800ms),0은 보이는 효과 없이 즉시 끝남이다. Core가 기본값을 해석해 RuntimeEffect에 전달한다. Ren’Py 흔들림과 화면·배경·인물 오버레이는 이 시간을 실제로 사용한다. 코드·ATL·CSS·픽셀 좌표는 문서에 저장하지 않는다.

효과 배열은 최대3개이며 순서를 보존한다. 배열 순서는 겹침의 표시 순서이고 **자동 순차 시간표가 아니다**. 위/아래는 배열만 이동한다. ‘순서대로 시작’을 명시적으로 누르면 첫 효과0초, 다음 효과는 앞 효과들의 지속 시간 합계로 `delayMs`를 정한다. 시작 합계가10초를 초과하면 거부한다. 반복 효과는 다음 효과가 시작해도 계속 반복할 수 있다. 인물 동작·전환까지 한 타임라인으로 묶는 기능은 후속 목표다.

`trigger`의 `scene-enter`/`with-dialogue`/`after-delay`, `delayMs`를 보존한다. after-delay에서 시간 부재는1000ms이고 나머지는0이다. 현재 대사 전체가 한 번에 표시되므로 ‘대사와 함께’는 전환이 끝나고 장면·대사 표면이 표시되는 시점이다. 글자별 공개나 대사 완료를 기다린다는 뜻은 아니다.

전환 완료 뒤 현재 컷의 인물·효과 시작 대기를 센다. 동일 컷 진입의 글/연출/구도 revision은 기존 시계를 유지하고, 새 presentationEntry 또는 다시 미리보기는 처음부터 실행한다. 이어받은 효과의 originEntry 시계는 새 컷의 전환 완료로 초기화하지 않는다. 효과의 scope는 현재 컷 또는 실제 방문 경로의 이후 컷 유지다. `clearFollowingEffects`는 이전 효과를 이 컷에서 해제한다. 없는 인물 대상은 저장된 참조를 보호하면서 현재 컷에서 표시하지 않는다.

반복은 `repeat:'loop'`, `periodMs`400–10000ms다. 지속 시간은 한 주기 안의 활성 구간, 주기는 시작에서 다음 시작까지다. 지속 시간이 주기 이상이면 쉬는 구간 없이 다음 주기부터 다시 시작한다. 동작 줄이기는 기존 흔들림·반복 섬광 억제를 유지한다. 전환과 인물 동작의 무한 반복, 임의 코드 입력은 의도적 제외다.

## 인물·배경·전환

StageActor motion의 서서히 등장/퇴장/이동은 기존0–10000ms duration/delay와 출발 가로 위치를 사용한다. 최종 위치·크기·방향은 StageComposition을 보존하며 Core가 픽셀 위치로 해석한다. Ren’Py ATL은 실제 pause 뒤 보간한다. 같은 진입의 수정은 남은 대기·동작을 이어가며 줄인 동작에서는 최종 상태를 바로 표시한다.

`presentation.actors.left/right` 강조·opacity·spectral은 **그쪽 인물 전체**에 적용되는 기존 계약이다. 개별 인물 효과 target과 다르다. ‘보이는 정도’는 화면0–100%/내부opacity0–1, spectral은 유령·환상의 푸른 색조다(자동으로 투명도를 낮추지는 않음). Core는 해당 쪽 각 RuntimeActor에 강조·opacity·spectral을 반영한다. 기존 side 위치·배율·방향 override의 첫 인물 적용 경로와 StageActor의 직접 배치를 유지한다. 현재 배치가 없고 저장된 설정도 없는 쪽은 편집 조정에서 숨기며, 저장된 설정이 있는 빈 쪽은 설명과 수정 경로를 보존한다. 강조 초기화는 그쪽 강조·투명도·색조만 지우고 기존 위치·배율·방향과 반대쪽 설정을 보존한다. 표정은 현재 인물 이미지 교체까지만 지원한다. 동일 인물의 표정 variant 규칙은 별도 자산 계약이 필요하다.

배경 채우기/전체보기와 초점x/y는 기존 Core crop 계약이다. 자유 배치를 자동 덮어쓰지 않는다. 동적 배경pan/zoom/camera는 현재 미구현이며 별도 viewport-motion 계약과 가독성 검증이 필요하다.

4종 전환·auto/confirm·duration·cue/title/description/actionLabel은 기존 필드다. 편집 UI가 이 필드를 모두 제공한다. 확인형은 독자가 확인할 때까지 진행을 막고 완료 후 정상 해제한다. 분위기2종의 강도도 기존 계약으로 조정한다. 최근 효과 취소/전환·분위기 취소는 해당 항목만 복원하며 다른 편집 내용은 보존한다. 취소 상태는 작품ID와 컷ID에 묶는다.

## 저장·양식

공식 `.knolstory`와 JSONB payload1은 durationMs의 미설정/0/정확한 숫자를 보존한다. 공통 schema generator·validator가 음수·비유한값·10000 초과·알 수 없는 필드를 저장 전 거부한다. 실제 API/DB 배포 완료를 의미하지 않는다.

Workbook6의 ‘연출 효과’ 탭은 `durationMs`를 ‘한 번 재생 시간 (초)’ 열로 제공한다. seconds 변환과 Korean 메모는 기존 열과 동일한 검증 경계를 따른다. Workbook5→6은 정확한 이전 헤더를 검사해 이 열에 `⟪미설정⟫`만 넣는다. 이전판 선언에 새 열을 넣으면 오류다. Workbook2–5의 명시적 migration과 초/밀리초 변환을 유지한다. Archive2/document6은 선택적 필드 확장이고 의미가 바뀌는 자동 migration은 없다. 이전 빌드가 새 필드를 읽을 수 있다는 보장은 하지 않는다.

Excel과 Google 시트는 같은 다중 탭을 편집하고 XLSX로 저장/반출해 가져온다. 숨겨진 전체 문서 payload나 JSONB 전용 연출 의미를 추가하지 않는다. 원고·Asset ID·Flow·StageComposition과 자유 배치를 전체 비교한다.

## 2026-10-13 현행 compact 편집과 회귀

연출 목적 선택은 전환·분위기·효과·인물 강조/투명도를 한 곳에서 바꾼다. 인물 강조는 inline 조정이며 옛 중첩 summary를 복원하지 않는다. `effects`의 배열순서/순차 시작/시작·지속/반복·범위/취소 의미와 강조 reset의 위치·반대쪽 보존은 위 계약 그대로다. 현재 장·컷 선택과 작품 메뉴, 읽기 메뉴의 이 컷 편집하기를 사용하는 [이번 회귀](current-ui-continuation-validation.md)에서 전체 프로젝트·파일·native 복귀를 검사한다. 편집 방문 기록은 기기 UI 상태이며 presentation 또는 실제 독자 경로에 추가하지 않는다.

2026-10-14 미리보기/배치/복원 현행 회귀: 같은 StoryDocument→Core→native 의미를 현재8판 검사와 목적별 조정으로 확인했다. 비율/보기/초점은 기기UI 상태이며 원고·Asset ID·Flow·StageComposition·자유배치를 바꾸지 않는다. native scenery pixel/back/restart 및 fullcontent 결과는 [현재 연출 회귀](presentation-current-regression-validation.md)에 기록한다. 형식/runtime 버전 변경은 없다.

2026-10-14 reader 경계 회귀: Core가 계산한 하단 글상자와 실제 Ren’Py dialogueRects·revision 응답을 current4화면에서 확인한다.503모의실패는host복귀검사이며native재생성공이아니다. UI접힘/화면비율은저작필드가아니며문서/RuntimeScene 버전은유지한다. [실제검증](reader-current-regression-validation.md).

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
