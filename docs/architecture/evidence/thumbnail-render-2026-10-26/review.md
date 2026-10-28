# Native 장면 미리보기의 작은 Render 캡처

고정 Ren’Py8.5.3 내부 helper `renpy.display.motion.zoom_render`로 이미1280×720에 배치한 Render를320×180으로 축소한 뒤 `render_to_surface`에 전달한다. 장면에320×180 레이아웃을 제안하는 방식이 아니므로 고정 좌표/글 배치를 바꾸지 않는다. SDK 내부 API에 의존하는 기존 ScreenDisplayable adapter 범위이며 SDK 업데이트 때 재검증한다.

이전 경로는 큰 surface 캡처 후 CPU smoothscale이었다. 새 경로는 캡처 입력 Render 자체를 줄인다. GPU의 실제 readback 크기/할당 절감은 이 코드 순서만으로 증명하지 않는다. 출력 PNG320×180·계약 크기 제한·단일 iframe·원고 전체 보존을 실제 native에서 확인했다. 변경 전후 인물/배경/여러 줄 글의 구성과 줄바꿈은 유지하며 픽셀 평균 차이 RGB약4~5/255가 있다. 다른 resampling을 정확한 픽셀 동일로 주장하지 않는다.

unit3개는 logical render→small render→readback→PNG 순서, render/scale/readback/PNG 각 실패의 현재 장면·페이지·offset·cache·scroll 복원, playback/불일치 stage의 렌더 차단, 요청/장면/revision 식별자 보존을 확인한다. runtime:build→build 순서로 새 정적 후보를 만들고 narrow/DPR/native 검사로 확인했다. 독립 에이전트 검토에서 blocking 문제는 없었고 제안된 실패 단계/식별자 검사를 보강했다.

실물 S25의 같은90초 진단은7회 편집·native 복귀1회·원고/기존 작품 보존·원래 편집 복귀를 통과했다. 임시 계측 wrapper는 같은 원래 편집기 reload로 제거하고 원고/native 준비를 재확인했다. 그러나 WASM linear capacity는289,996,800bytes로 이전 정상 경로와 같았다. 메모리 절감/25분 충돌 해결의 증거는 없다. 이전30분 실물 gate는 실패/미완료로 유지한다.
