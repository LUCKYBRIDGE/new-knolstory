# 실제 Ren’Py 읽기 저장 썸네일

2026-10-11. 승인 읽기 저장/불러오기 화면의 실제 저장 장면 그림을 기존 슬롯3판에 연결한다. [읽기 도안](reading-interface-design.md)과 [승인 개편](approved-ui-development-plan.md)의 UI-THUMBNAIL을 진행한다.

## 원본과 경계

Runtime host는 현재 재생 장면의 native sceneRendered revision을 확인한 뒤 같은 origin iframe의 실제 canvas 픽셀만 복사한다. Web에서 배경·인물·글상자를 다시 그리지 않는다. 슬롯 그림은 작품 내용 SSOT가 아니며 StoryDocument/archive/workbook/JSONB에 넣지 않는다. 기존 reader envelope3의 thumbnail·summary와 Core playback을 사용한다. 이전 슬롯1/2는 그림 없이 읽을 수 있고, 다음 저장만3판으로 보관한다.

처음 연결한 requestAnimationFrame1회는 장면이 준비되어 있어도 빈 프레임을 읽는 경우가 있었다. native 프레임 안에서 최대12회,500ms 안에만 재시도한다. 캡처할 때마다 임시 canvas로 축소하며320px/40KB WebP 제한과 data URL 검증을 적용한다. timer 종료 후 callback이 뒤늦게 실행되면 즉시 반환한다. blank·누락·오염/접근 불가 canvas는 undefined로 끝나고 기존 장·컷·글 요약으로 저장한다. 다른 scene/revision으로 바뀌면 저장 중단 오류로 처리해 서로 다른 장면의 픽셀·읽기 경로를 결합하지 않는다. 영구 framebuffer 보존 설정이나 Ren’Py 엔진 변경을 추가하지 않았다.

자동/수동/빠른 저장은 같은 callback을 사용한다. 썸네일 준비와 자동 읽기의 presentationReady는 구분한다. 현재 rendered revision이 바뀌면 자동 저장 그림을 다시 확인하지만, 실제 연출/소리 준비 전 자동으로 컷을 넘기지 않는다. 저장창을 연 상태의 HTML 도구는 native canvas에 없으므로 그림에 포함되지 않는다. quota 오류는 기존 저장을 덮지 않고 실패로 표시한다.

캔버스 context와 WebGL 버퍼 기본 동작 참고: [MDN getContext](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext). 이 작업의 실제 지원 판단은 문서 추정 대신 아래 native 픽셀 검사 결과로 한다.

## 검사

[RED](evidence/native-save-thumbnail/red.log): callback 미연결로 빠른 슬롯에 그림 없음. [첫 연결](evidence/native-save-thumbnail/native.log), [재시도 전](evidence/native-save-thumbnail/native-second.log)은 blank capture를 거부한 실패를 보존한다. [실제 native 통과](evidence/native-save-thumbnail/native-third.log)는 수동/빠른 저장의 WebP와 실제 다양한 색 픽셀, 새로고침·불러오기까지 확인했다.

[최종 정적 빌드](evidence/native-save-thumbnail/static-final.log): PC/휴대폰 실제 native 그림과 저장·재열기·불러오기, 기존 reader의 캔버스 없는 ACK harness fallback·수동/빠른/자동 슬롯·불러오기 확인·기록·저장 실패·폰 dock/iframe 유지·자동 읽기 대기·native 정렬·편집 복귀 회귀.

[단위13개](evidence/native-save-thumbnail/unit-final.log): blank retry, canvas 누락/접근 불가, stale capture, 크기/형식/bytes 검증, 기존 슬롯 migration/기록/보존. [타입](evidence/native-save-thumbnail/typecheck-final.log), [lint](evidence/native-save-thumbnail/lint.log), [빌드](evidence/native-save-thumbnail/build.log). 전체 기기 GPU 성능/실제 삼성 기기·저장용량 한계를 이 검사로 완료 처리하지 않는다. 전체 활성 목표의 경로/범위 동선과 승인 시각 검증은 별도로 유지한다.

첫 정적 회귀는8개 통과/휴대폰1개 실패였다. 폰 도구 펼침의 새 revision이 아직 render되지 않아 capture가 fallback한 경우다. 현재 장면 응답을 최대500ms 기다린 뒤 캔버스 캡처를 시작하고, 기다리는 동안 다른 장면으로 바뀌면 중단한다. 리뷰에서 compact 변경만으로 revision이 증가하지 않는 경우를 찾아 media sync도 revision을 발급하도록 수정했다. 기존 guard를 약화하거나 빈 그림 assertion을 삭제하지 않았다. [최신 native 검사](evidence/native-save-thumbnail/native-final.log), [최신 빌드](evidence/native-save-thumbnail/build-final.log), [최신 lint](evidence/native-save-thumbnail/lint-final.log), [전체 coverage](evidence/native-save-thumbnail/coverage.log).

최종 PC/폰 native2개, 기존 승인 읽기/편집13개 모두 통과했다. [마지막 회귀](evidence/native-save-thumbnail/reader-final.log). 전체131파일/1153개 통과·기존1개 skip, statements93.49%/branches91.15%/functions96.76%/lines98.67%. [실제 저장된 작은 그림](evidence/native-save-thumbnail/saved-native.webp), [수동 저장 화면](evidence/native-save-thumbnail/save-panel.png). TypeScript6 workspace·최종 lint error0·빌드·문서·diff whitespace 검사 통과. 이전 전체 파일 lint의 작은 data URL img 성능 warning은 역사 로그에 보존한다.

자기 점검: 정확성4(실제 native 색 픽셀·저장 원본·현재 revision 확인), 완결성4(PC/폰·수동/빠른/자동·fallback·재열기/불러오기·실기기 별도), 명료성4(실제 장면 그림과 글 요약 fallback), 실행 가능성4(현재 읽기 메뉴 연결), 간결성4(기존 슬롯3·320px/40KB·짧은 캡처), 평균4.0. 후속은 삼성 실기기/GPU 성능과 전체 승인 도안의 남은 경로/범위 동선이다.
