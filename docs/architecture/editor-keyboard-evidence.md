# 가상 키보드 크기 조사와 도안 반영

2026-10-10. 이전 도안의250/280/140px는 임의 시각 예시였다. 현재 도안은 공개 구현의 계산식을 사용한 참고값으로 수정했다. 현재 Samsung/Gboard 한글 키보드를 물리 기기에서 실측한 값은 아니다.

## 공식 사례와 수치

[AOSP LatinIME](https://android.googlesource.com/platform/packages/inputmethods/LatinIME/+/127336e9f29d69607eab55982324b210279ae8c5/)의 config와 [ResourceUtils](https://android.googlesource.com/platform/packages/inputmethods/LatinIME/+/127336e9f29d69607eab55982324b210279ae8c5/java/src/com/android/inputmethod/latin/utils/ResourceUtils.java)는 방향/화면폭별 기본키보드높이를 최소/최대비율로 제한한다. 음수최소비율은 화면폭을 기준으로 계산한다. 추천어줄은별도다. 기기별 override도 존재한다. 코드가 오래된 자원과 특정 옛기기설정을 포함하므로 현대 제조사키보드의 보편값이라고 주장하지 않는다.

| 도안 화면/조건 | 키 body 계산 | 추천어 줄 | 도안 참고 높이 |
|---|---|---|---|
| 휴대폰세로390×844 | max(min(205.6,844×0.46),390×0.618) →241 | 40 | 281px |
| 휴대폰가로844×390 | max(min(176,390×0.46),390×0.45) →176 | 36 | 212px |
| 태블릿세로768×1024 | max(min(302.4,1024×0.46),768×0.35) →302 | 44 | 346px |
| 태블릿가로1024×768 | max(min(365.4,768×0.46),768×0.35) →353 | 44 | 397px |

참고계산은1dp≈1CSSpx·scale1·기기override없음을가정한다. physical screen dp, browser content CSS viewport, DPR, 브라우저상단/시스템navigation/safe-area는같지않다. 수치는 실측값이 들어오기 전의 출처있는설계참고다. 큰키보드민감도는body1.2배+추천어줄로 검사한다.1.2는AOSPdebugresize코드의상한참고이며 Samsung/Gboard의공식최대값이 아니다.

[소스/계산 입력](evidence/editor-redesign/keyboard-profiles.json), [받아온 원본소스](evidence/editor-redesign/keyboard-sources/values--config.xml), [tabletland자원](evidence/editor-redesign/keyboard-sources/values-sw768dp-land--config.xml). Apache원본license를유지했다.

## 실제 브라우저·제조사 동작

- [Chrome 공식 viewport 안내](https://developer.chrome.com/blog/viewport-resize-behavior/):Chrome108이후 Android기본은키보드때visual viewport를줄이며layoutviewport는그대로일수있다. 고정footer와100vh만으로입력영역이안가려진다고가정하지않는다.
- [Chrome VirtualKeyboard API](https://developer.chrome.com/docs/web-platform/virtual-keyboard):지원되는환경은geometrychange/boundingRect로실제가림영역을관찰할수있다. overlaysContent를임의로켜서기존동작을바꾸는것은별도검증한다.
- [Android 공식 IME측정](https://developer.android.com/develop/ui/views/layout/sw-keyboard):native환경은IMEinsets/visibility를사용한다. Web페이지에nativeAPI가그대로있다고가정하지않는다.
- [삼성 공식 키보드설정](https://www.samsung.com/us/support/answer/ANS10001592/):크기·위치변경과모델/소프트웨어별차이가있다. [삼성 키보드모드](https://www.samsung.com/ph/support/mobile-devices/how-to-use-keyboard-settings-on-your-galaxy-device/)는전체폭/한손/플로팅을구분한다. 플로팅은하단전체높이감소로추정하면안된다.

## 도안 수정

기본최종안은유지한다. 키보드몸체+추천어줄을표시하고, 특히가로태블릿/가로휴대폰의가림을크게반영했다. 현재글·현재장/컷·앞뒤이동을우선하며, 공간부족시앞뒤글요약은접고이동/확장경로를유지한다. 장면은같은16:9논리구도를비율대로줄이거나접으며keyboard때배경crop/인물좌표를바꾸지않는다.

[최종 상세 도안](evidence/editor-redesign/gallery-final.html), [키보드 참고 비교](evidence/editor-redesign/keyboard-source-comparison.png). 현재최종상태24장에는참고키보드와확대민감도상태를포함한다. 이전임의키보드도안은keyboard-provisional에보존했다.

## 실제 기기 데이터 확보

현재호스트에는확인된AndroidADB/emulator환경이없어물리기기값을만들지않았다. [실측 페이지](evidence/editor-redesign/keyboard-measure.html)는실제기기에서닫힌기준→한글입력→키보드닫기/방향전환을기록하고JSON으로반출한다. 입력한원고는수집하지않는다.

필수메타데이터:기기/OS/Chrome/키보드앱·버전/한국어layout/글자·화면배율/방향/전체폭또는플로팅. 기록값:screen,inner/client,visualViewport height/offset/scale,DPR,가능하면keyboardboundingRect. 닫힘/열림height차이는브라우저chrome변화도포함할수있으므로타임라인과스크린샷을대조한다. 플로팅은별도의가림rect로확인한다.

측정JSON이확보되면참고profile대신실제값으로재렌더한다. 그전까지도안의숫자를특정실기기의평균/표준키보드높이라고표시하지않는다.

## 2026-10-11 표현 교정

AOSP 계산식은 출처가 있는 가림 민감도 참고값이며 현대 삼성/Gboard 표준 높이가 아니다. 임의로 늘린 키 그림은 제거하고 운영체제 키보드의 가림 영역으로 표시했다. 실제 모양·높이는 미확정이다. [현재 누락/키보드 감사](editor-redesign-completeness-audit.md)를 우선한다.

## 확정 기준 — 삼성 키보드 (2026-10-11)

사용자가 삼성 키보드를 기준으로 지정했다. 대표 입력기는 삼성 키보드로 통일한다. 도안의 현재 한글 두벌식 예시는 작업용 대표이며, 삼성의 천지인/숫자/기호 등 입력 레이아웃을 임의로 배제하지 않는다. 키 배열/크기 설정은 사용자 설정이고 편집기가 변경하지 않는다.

휴대폰 표준 키보드와 크기 변경, 태블릿 표준/분할/플로팅, 외장 키보드 연결/해제, 세로/가로, 추천어·도구모음·숫자줄과 하단 시스템 영역을 확인한다. 다른 키보드는 이후 호환 검증 대상으로 두되 현재 기준 선택을 막지 않는다. AOSP 참고 계산은 삼성의 확정 크기로 사용하지 않는다. 기종이 정해지기 전에는 하나의 고정 높이를 표준이라고 만들지 않고 실제 가림 영역에 적응하도록 설계한다.
