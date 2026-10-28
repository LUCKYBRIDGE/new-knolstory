# 고밀도 runtime pixel budget과 부트 파일 버전

DPR4에서1280×720 stage가5120×2880canvas로 실행되는 것을 실제폰에서 확인했다. 공식SDL highdpi disable hint는 격리 검사에서1280×720으로 줄었지만1배만 제공했다. 글 선명도와 비용을 함께 고려해 pinned8.5.3 Emscripten SDL DPR import만1..2로 제한한다. 호스트/iframe의 window.devicePixelRatio는 그대로이고 논리구도/원고/host contain/좌표를 바꾸지 않는다. SDK anchor가0개/복수면 빌드를 중지해 업그레이드를 명시 검토한다. SDL canvas 생성/resize 경계이며 모든 임의 SDK API에 대한 보장은 아니다.

DPR1.25/2/4 실제 Ren’Py 검사는 canvas가논리크기×min(DPR,2)가 되는지, 브라우저DPR 유지, text/background/basic parking, root fullscreen/해제, 세로읽기→가로viewport, 실제stage 터치로 다음컷, 같은iframe/편집복귀/원고전체 보존을 확인한다. fullscreen 중 browser windowresize는 Playwright가 거부해 fullscreen해제 후resize하도록 검사 절차만 수정했다. 최초 오류로그를 유지한다. 추가DPR4 캡처와 versionedengine요청도 확인했다.

실제폰은 수정된 서버코드와 달리 이전 renpy.js를 실행하고 있었다. 캐시를 비우지 않고, 생성JS/CSS·gameZIP이 바뀔 때 해당 URLquery에 내용SHA256앞16자를 붙인다. 새HTML이 버전URL을 요청함을 native검사에서 확인했다. wasm/data는 이번변경에서같은SDKbytes이고 내부요청URL은 유지한다. HTML자체와 향후SDK전체 자원의 배포cache정책까지 해결했다고 주장하지 않는다.

USB가 이후 끊겨 최종버전연결 후보의 실제폰canvas/메모리를 확인하지 못했다. 앞선 stale폰5120결과를 최종후보 실패/성공으로 사용하지 않는다. 다음은 실제폰 재연결 후 실행함수/canvas2560×1440/hostDPR4·읽기전체화면·터치·원고를 확인하고, PID연결RSS/스왑 짧은비교→정상30분/Android최종파일 gate다.

공식 참고: [SDL highDPI hint](https://wiki.libsdl.org/SDL2/SDL_HINT_VIDEO_HIGHDPI_DISABLED), [SDL Emscripten backend](https://raw.githubusercontent.com/libsdl-org/SDL/SDL2/src/video/emscripten/SDL_emscriptenvideo.c). 숫자2 cap은 공식옵션이 아닌 고정SDKglue adapter다.
