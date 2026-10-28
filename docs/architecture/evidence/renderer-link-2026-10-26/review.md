# 실제 renderer 연결과 낮은 부담의 메모리 조사

기존 Chrome 프로세스 PSS 대신 실제 화면 host/runtime에만 user timing 표식을 넣어 trace의 PID를 확인했다. 두 표식 모두 renderer28679에 기록됐고 SystemInfo renderer 목록과 일치했다. 표식과 CDP 세션은 제거했다. frame metadata는 Android에서 비어 있었으므로 목록만으로 target-PID를 연결하지 않았다. 원본 trace는 다른 탭 정보를 보존하지 않도록 파일로 쓰지 않았다.

/proc/PID/status는 RSS/anonymous/swap을 제공했고 dumpsys meminfo --local PID는 PSS를 제공했다. smaps_rollup은 권한 거부돼 우회하지 않았다. 기존 Chrome 이름으로 읽은 수치가 이 renderer의 메모리를 대표하지 못했음을 확인했다. host와 엔진 같은PID라도 다른 문서/코드/그래픽/스왑·allocator가 함께 포함되므로290MB WASM capacity만으로 나머지 소유자를 추정하지 않는다.

한 번의 명시적 진단 GC 전후 RSS는1,069,508→1,004,196KB, 스왑927,424→972,668KB, WASM capacity289,996,800bytes였다. GC는 일반 사용자 사용 조건이 아니며 안정성 통과/제품 해결책으로 쓰지 않는다. 원고 전체 일치는 유지됐다.

큰 backing store 소유자를 확인하려 Runtime.queryObjects를 local target의 WASM.Memory/ArrayBuffer prototype에 사용했으나 결과 전에 renderer가 종료됐다. 정확한28679 종료 기록은 SIGNALED/status11, RSS1.5GB였다. 객체 열거 자체가 부담을 줄 수 있으므로 반복하지 않는다. 이전 정상 편집25분 충돌과 별개로 기록한다. 종료된 own 진단 runner만 정리했고 Chrome이나 사용자 탭은 닫지 않았다.

새로고침/명시 editor 진입 후 원래 검사 작품 전체 일치와 현재 글 입력칸의 실제 가시성을 확인했다. 앞선 cleanup의 project/native-ready 확인만으로는 실제 editor 가시성이 충분히 증명되지 않았으므로 이번 직접 확인을 우선한다. 새 표식으로 복구된 renderer5755를 연결했고 초기RSS1,245,656KB/스왑9,064KB였다. 구PID와 비교해 누적 메모리가 해결됐다고 해석하지 않는다. cold/warm 원고·초기화·그래픽·컴파일 비용이 섞인다.

다음은 queryObjects/heap snapshot 없이 같은 활성 target의 trace PID를 고정하고 /proc status와 WASM capacity·캡처 수만 표본으로 수집하는 짧은 구간 대조다. 실행 시작 시 이전 문서/기존 원고 전체를 보존하고, 중간PID 변경·잠금·사용자 화면 변경은 중단한다. 초기 구간 비용과 편집당 증가를 분리한 뒤 정상30분 gate 및 Android 최종 파일 대조를 수행한다. 제품의 임의 GC 주기·자동 iframe 재시작·필수 인접 미리보기 제거는 구현하지 않는다.
