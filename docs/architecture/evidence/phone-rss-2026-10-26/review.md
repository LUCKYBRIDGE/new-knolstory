# 3분 실제 renderer 표본과 과도한 canvas 해상도

동일 S25 renderer5755에 host/runtime 추적 표식을 연결해 /proc/PID/status만 읽으며 각각3분 검사를 수행했다. 강제GC/객체 열거/heap snapshot은 실행하지 않았다. 정상13회·native 복귀2회, 캡처 제한14회·복귀2회를 완료했다. 원고 전체·기존 작품·원래 편집의 실제 가시성과 임시 계측 제거를 확인했다. 파일 내보내기/30분 gate는 별도다.

정상 익명RSS+VmSwap 참고 합계의 변화는420,028KB, 제한은444,488KB였다. 이 합계는 PSS/live allocation이 아니며 공유·압축·그래픽 등을 정확히 계상하지 않는다. 제한 검사에서 RSS가 낮아지는 동안 스왑이 크게 늘었다. 초기값·스왑 조건·워밍이 다르므로 정상/제한의 정확한 비용 차이로 해석하지 않는다. 캡처 없이도 증가하여 캡처 한 경로만으로 전체 증가를 설명할 수 없다.

고정SDK의 renpy_exec로 작은 카운터만 읽었을 때 updated_screens2, image cache3항목/12,315,996bytes/상한419,430,400bytes였다. 캐시가400MB에 도달했다거나 화면 set이 무제한 쌓였다고 주장하지 않는다. 소스상 화면 set은 interaction 시작 때 비워지고 render mark_sweep도 frame마다 실행된다.

새로 확인된 구체적 문제 후보: 실제 기본편집 iframe의 표시 크기는약313×176CSSpx지만 내부viewport는1280×720이고 DPR4에서canvas는5120×2880이다. text/background parking도같은canvas다. native knol_viewport의 physicalWidth1280/height720만으로 실제HTMLcanvas픽셀수를 알 수 없었다. 실제canvas는14,745,600픽셀, RGBA 한 면만 약59MB이며 여러 graphics buffer 비용은 별도다. 이것이 crash의 단독 원인이라는 증거는 없지만 휴대폰 미리보기에서 과도한 oversampling을 직접 확인했다.

다음은 서비스가 소유한 runtime 부트 설정으로 고밀도 휴대폰의 실제canvas pixel budget을 제한하는 방식을 고정SDK/SDL 경계에서 검증한다. 논리1280×720/720×1280·host CSS contain/최대 무대·좌표/선택지/글상자를 바꾸지 않고, 고밀도에서 불필요한 내부pixel비용을 줄여야 한다. 실제폰 canvas/메모리·글 가독성·touch좌표·DPR/native/effect·원고 보존 근거를 함께 확인한 후 새후보30분 gate로 이어간다. 캐시임의삭제·자동iframe재시작·별도Webrenderer로 우회하지 않는다.
