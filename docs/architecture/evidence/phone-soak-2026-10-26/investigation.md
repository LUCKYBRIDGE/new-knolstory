# S25 장시간 편집 실패와 원고 복구

실제 Android Chrome의 독립12컷 사본으로 정식30분 검사를 실행했다. 약24분58초에 `page.evaluate: Target crashed`로 종료됐다. 편집105회·native 복귀11회까지 완료했고 다음 회차106의 글 수정은 임시 보관돼 있었다. Chrome의 ‘앗, 이런!’ 화면을 실제 기기 캡처로 확인했다. 전체 목표 또는30분 gate 통과로 판정하지 않는다.

새로고침 후106회 수정 결과 전체와 기존 작품을 대조했다. 의도한 글/updatedAt 외 내용이 일치하고 기존 작품도 그대로다. 이후 원래 ‘안드로이드 편집 검사’ 편집 화면으로 돌아와 전체 원고 일치를 확인했다. 원고 복구 성공은 충돌 해결과 구분한다. 최종 작품 파일 내보내기 전 실패했으므로 최종 파일 통과 근거가 없다.

초기 준비 화면 전환·키보드 닫기 자동화 실패와31초 사전 점검은 별도 cache에 보존했다. 정식 실행의 시간/횟수에 합산하지 않는다. source/out hash는 바뀌지 않았다. 페이지 오류 이벤트0은 renderer 충돌이 없었다는 뜻이 아니며 실제 target crash가 우선한다.

메인 Android target의 JS heap 표본은 약72~88MB, DOM1934~2535였다. `dumpsys meminfo com.android.chrome` 수치는 특정 프로세스/패키지 진단으로 전체 renderer/WASM/GPU/OS 메모리 예산을 증명하지 않는다. 같은 시기 Android의 Chrome sandboxed process LOW_MEMORY 종료 기록도 확인했으나 해당 DevTools target과 PID 연결은 아직 없다. 원인을 메모리 누수로 확정하지 않는다.

다음 조사는 실제 엔진 iframe의 Module.HEAPU8.buffer.byteLength로 WASM linear capacity를 함께 측정하고, 장면 미리보기 요청/응답 횟수·바이트·중복 요청과 target/process 연결을 확인한다. 필요하면 같은 사본/속도에서 인접 장면 캡처 요청만 검사 harness로 제한한 대조를 수행한다. 제품의 실제 장면 미리보기를 제거하거나 별도 Web renderer를 만들지 않는다. 확인 전 캐시 예산을 임의로 바꿔 해결로 주장하지 않는다.

소스 대조: 호스트 인접 장면 캐시는24개, bridge 대기 요청은2개로 제한된다. native는1280×720 render surface를320×180으로 줄여 캡처한다. 고정 SDK 기본 image_cache_size_mb는400이며 제품 명시 설정은 아직 없다. 이들은 조사 후보이지 현재 원인 증거가 아니다.
