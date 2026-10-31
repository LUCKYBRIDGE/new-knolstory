# 기존 8작품을 다른 컴퓨터에서 시험하기

## 범위와 준비 조건

책 소개·서재·표지 편집·책 시작·Ren’Py 읽기는 이미 구현돼 있다. 이 절차는 같은 기능을 새로 구현하지 않고, 공개 소스만 받은 환경에서 빠지는 의존성·권한 있는 레거시 그림·공유 런타임·브라우저를 준비한다. `StoryDocument`/`.knolstory`가 원본이며 작품마다 별도 런타임을 만들지 않는다.

Git, Node `>=22.13.0`, pnpm `10.33.0`, Python `>=3.9`가 필요하다. pnpm 버전은 `package.json`을 따른다. 필요하면 `corepack enable`을 실행한다. 레거시 private 저장소의 기존 접근 권한과 `18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b` 커밋을 포함하는 checkout을 준비한다. 이 자동화는 권한을 새로 부여하거나 비밀키·계정을 설치하지 않는다.

Windows에서는 WSL2 내부에 checkout과 Linux Node/pnpm/Python을 준비한다. Windows용 Node와 WSL Python을 섞지 않는다. WSL은 실행 안내이며 이번에 실제 Windows 기기에서 수행한 결과가 아니다. 크롬북의 Linux 개발 환경 제공 여부는 학교 정책을 확인해야 한다. Android는 직접 SDK를 빌드하는 환경으로 주장하지 않는다.

## 준비·점검·실행

시험할 기능이 있는 현재 checkout/ref를 선택한다. 브랜치/PR의 이름·열림/병합 상태는 고정 전제 대신 실제 Git/원격 상태로 확인한다. 필요한 ref를 받은 뒤 기존 로컬 작업을 보존한 상태에서 준비한다. private legacy checkout은 별도로 기존 접근 권한을 사용한다.

저장소 루트에서 실행한다. 경로는 현재 저장소 위치와 무관하며 공백이 있으면 따옴표로 감싼다.

```sh
pnpm env:prepare --legacy ../story-maker
pnpm env:doctor
pnpm preview
```

`http://127.0.0.1:3000`을 연다. `prepare`는 다음 순서로 실패 즉시 멈춘다.

1. 도구 버전 확인 및 고정 baseline에서 레거시 작품 자산 421파일과 소개·서재 UI 10파일 복원·SHA256 대조.
2. `pnpm install --frozen-lockfile`.
3. Ren’Py 8.5.3 SDK/Web 지원과 고정 커밋의 Noto Sans KR 다운로드·SHA256 확인·안전 추출.
4. Playwright Chromium 설치.
5. `spikes/renpy-web/build.py`로 모든 작품이 공유하는 실제 WASM 런타임 빌드.
6. Next 정적 앱 빌드, 최종 doctor 확인.

SDK·Web·폰트의 URL/해시는 `scripts/prepare-runtime.py`에 있으며 `renpy/RENPY_VERSION`과 다르면 중단한다. SDK 설치 마커에는 실제 설치 파일 해시를 보관한다. 정상 빌드가 재생성하는 바이트코드·임시 결과·launcher 저장/로그는 제외하고, 예상 밖 소스 추가와 원본 변경은 거부한다. 기존 다운로드를 재사용해도 해시를 다시 확인한다. 런타임 빌드의 폰트 해시 확인도 유지한다. `KNOL_RENPY_SDK`로 외부 SDK를 직접 지정하면 기본 준비 도구의 검증 범위 밖이므로 정상 재현에는 기본 캐시를 사용한다.

`preview`는 빌드 결과를 loopback에서만 제공하고 `/probe` 같은 확장자 없는 정적 경로도 처리한다. 소스 수정은 `pnpm dev`로 실행한다. 브라우저 저장소는 origin별이므로 `localhost`와 `127.0.0.1`, 서로 다른 포트는 서로 다른 서재다. 예전 주소의 작업은 그 주소에서 파일로 내보낸다. 이번 절차가 레거시 IDB나 `storygame*` 키를 옮기거나 삭제하지 않는다.

개별 단계:

```sh
python3 scripts/restore-legacy-media.py ../story-maker
pnpm install --frozen-lockfile
pnpm runtime:prepare
pnpm exec playwright install chromium
pnpm runtime:build
pnpm build
pnpm env:doctor
```

## 기존 설치와 실패 복구

- 수동 SDK가 이미 있거나 설치 파일이 바뀌었다면 `pnpm runtime:prepare --reinstall` 후 `pnpm env:prepare --legacy ../story-maker`를 다시 실행한다. 검증한 새 SDK를 staging에 완성한 뒤 생성 SDK만 교체한다.
- 다운로드 해시가 다르면 해당 캐시 파일 이름을 보고한다. 잘못된 파일을 자동 덮어쓰지 않는다. 그 파일을 제거한 뒤 다시 준비한다. 버전/해시를 오류 회피용으로 바꾸지 않는다.
- baseline이 없는 레거시 checkout은 해당 커밋을 권한 있는 Git 원격에서 받아야 한다. 현재 레거시 브랜치의 파일로 대신 복원하지 않는다.
- Linux/WSL에서 브라우저 라이브러리가 없으면 `pnpm exec playwright install-deps chromium`을 실행한다. OS 패키지 설치에는 관리자 권한이 필요할 수 있다.
- 3000 포트 사용 중이면 해당 서버를 종료한다. `env:verify`는 오래된 dev 서버를 조용히 재사용하지 않는다. 수동 preview는 `pnpm preview --port 3001`로 실행할 수 있지만 자동 검사는 3000을 사용한다.
- Ren’Py의 생성 자산은 매번 원본 corpus에서 교체하며 Web 표지 글꼴은 복사하지 않는다. Git에서 제외된 runtime/corpus 변경이 정적 export 캐시에 가려지지 않도록 Web build 캐시는 사용하지 않는다. 앱/런타임 소스나 그림을 수정했다면 `pnpm runtime:build`와 `pnpm build`를 다시 실행한다. doctor의 파일 존재·해시 확인은 실제 렌더링 검사를 대신하지 않는다.
- `env:doctor`는 source media 451파일 해시, 런타임 주요 파일, 정적 앱과 실제 브라우저 실행을 확인한다. SDK·모든 런타임 결과의 최신성을 보증하지 않으므로 준비/빌드 뒤 verify를 실행한다.

## 기존 작품으로 검증

서버를 종료한 상태에서:

```sh
pnpm env:verify
```

이 명령은 Python 준비 도구 테스트, 타입, 린트, 전체 단위/계약/통합 coverage, 전체 미디어 provenance 검사, 다음 기존 E2E를 순서대로 실행한다. 브라우저 검사는 정적 빌드에서 실행한다.

- 첫 접속 책 소개, 재접속 서재, 소개 재방문과 새로고침 위치 복원.
- 선녀 원작과 흥부 놀스토리의 표지 초안·취소·세 면 편집·제목 적용·원고 보존·기기 저장.
- `.knolstory` 내보내기 → 별도 브라우저 context 가져오기 → 다시 내보낸 project 전체 일치.
- 8작품의 서재 → 책 표지 → 실제 Ren’Py 첫 컷·음원 unlock → 서재. 동일 iframe 확인.
- 표지를 편집한 기존 흥부 작품의 두 갈래 엔딩, 슬롯·기록·복원과 archive 일치.
- 가로/세로 viewport의 터치·키보드·넘침. 실제 Android 하드웨어 검증은 별도다.

기본 브라우저는 설치한 Chromium이다. 실제 Google Chrome도 설치돼 있다면 `KNOL_BROWSER_CHANNEL=chrome pnpm env:verify`로 별도 실행할 수 있다. Chromium 결과를 Google Chrome 실기기 결과로 기록하지 않는다. 전체 회귀는 기존 `pnpm test:e2e`, `pnpm test:e2e:stories`, `pnpm test:e2e:runtime` 명령을 그대로 사용한다.

## 작품을 다른 컴퓨터로 이동

1. 원래 컴퓨터의 서재에서 작품 준비를 열고 저장 상태를 확인한다.
2. **작품 파일 내보내기**로 `.knolstory`를 보관한다. 전송 전에 원본 파일을 별도 백업한다.
3. 새 컴퓨터에 이 테스트 환경을 준비하고 서재의 **작품 파일 가져오기**로 파일을 선택한다.
4. 작품 제목·앞표지/책등/뒤표지·본문·갈래를 확인하고, 다시 내보내어 보관한다.
5. 책 표지에서 읽기를 시작하고 슬롯 저장·불러오기 및 편집 복귀를 확인한다.

기본 예제의 Asset ID는 파일에 보존되지만 공통 레거시 그림은 새 기기의 권한 있는 corpus가 필요하다. 사용자 첨부 오디오는 archive 계약에 따라 함께 보관된다. 방문 여부·기기 서재 전체·브라우저별 읽기 슬롯·탭 위치는 작품 파일과 같은 개념이 아니다. 다른 컴퓨터에 모든 브라우저 상태가 그대로 이동한다고 주장하지 않는다.

## 표시된 Web DOM 접근성 검사

`axe-core`는 고정 개발 의존성으로 두고, `tests/e2e/accessibility.spec.ts`와 `accessibility-narrow.spec.ts`를 host 검사에 포함한다. 표시된 서재·계정/온라인 메뉴·편집기·숏스토리 쓰기/읽기를 검사한다. iframe은 이 DOM 검사에서 제외하며 실제 Ren’Py·스크린리더·기기 검증은 별도다. [axe 공식 API](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md)에 따라 열린 화면을 각각 검사하고 원래 violations/incomplete를 보관한다.

서재 표지 이름은 공용 표지 해석에서 실제 표시 문구를 포함하도록 수정했다. axe가 React 블록 경계의 글을 공백 없이 연결해 보고하는 경우에는 원래 결과를 지우지 않는다. 해당 표지 버튼에 한정해 실제 `innerText`의 정규화된 전체 문구가 이름에 포함되고 Playwright의 계산된 accessible name이 일치하는지 확인한 뒤 scanner 불일치로 따로 기록한다. 다른 rule/node를 제외하지 않으며 이것을 전체 axe/WCAG 통과로 주장하지 않는다. 실제 오류였던 수정 전 이름은 이 조건을 충족하지 않는다.

서랍의 label은 지원되는 group 역할에 제공한다. 메뉴 패널은 visual viewport의 크기/offset과 resize/scroll에 맞춰 배치한다([API 기준](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)). 좁은 서재 상단 도구·펼친 계정 패널의 클릭 가능한 위치와 화면 경계는 실제 bounding box로 검사하며 force 클릭으로 우회하지 않는다. 원고 저장·기존 표지 이미지/배치·글자 맞춤을 변경하는 방식으로 자동 검사에 맞추지 않는다. 표지의 공백 실험에서 발견한 시각 회귀와 검사기 불일치, 최초 좁은 화면 실패 기록도 보존한다. 최종 정적 후보의 집중11검사와 영향8검사, 순수 helper10검사(statements/functions/lines100%, branches86.36%)를 확인했다. 이 수치는 전체 제품 접근성 완료가 아니다. 이번 source·최종 검사·시각 비교·남은 수동 확인은 [checkpoint](evidence/accessibility-host-2026-10-16/checkpoint.json)에 연결한다.

## 보류된 대비·축약 이름의 후속 확인

자동 검사에서 배경 pseudo element 때문에 보류된 항목을 실제 표시와 대조했다. 작은 기본 classic 표지의 제목/부제와 선반 상태 문구에서 부족한 대비를 확인한 뒤 compact 표시의 기본 ink와 상태 문구 받침색을 보완했다. 당시 큰 표지는 변경 범위 밖이었으며, 아래 후속 검사에서 기본 classic 전체 크기로 표시 해석을 확장했다. 명시적 작성 색·사용자 편집 layer·저장 문서는 보존한다. 두 폭의 선택18문구를 [실제 렌더링 검사](evidence/accessibility-contrast-2026-10-17/rendered-green.log)로 확인했으며, 이 범위를 모든 표지/화면의 대비 완료로 확대하지 않는다.

`rendered-contrast.ts`는 원래 CSS foreground와 투명 글자 캡처의 실제 배경을 비교한다. 원본의 색 차이로 glyph를 선택하면 저대비 부분을 놓칠 수 있어, 독립적인 검정/흰색 캡처의 차이로 glyph 영역을 구한다. 원본·배경·두 mask를 보관하고, 지원하지 않는 opacity/filter/fill은 수동 확인으로 보낸다. [gradient 진단 도구 회귀](evidence/accessibility-contrast-2026-10-17/mask-harness.log)는 원래 글자색과 배경이 같은 부분도 포함하는지 확인한다. antialias 픽셀색을 CSS foreground로 계산하지 않으며 기준값을 반올림해 통과시키지 않는다([W3C 대비 설명](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)).

보류된 축약/아이콘 고유5개는 [390/1440 DOM·Enter 동작 검사](evidence/accessibility-contrast-2026-10-17/control-names.log)로 역할·표시 문구·계산된 이름·상태와 실제 이전/다음 이동을 확인했다. `글`은 `글 편집`에 포함되며, 화살표 기호는 기능 이름을 제공한다([W3C 이름 설명](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html)). 원래 incomplete를 삭제하거나 전체 자동 검사 pass로 바꾸지 않는다. programmatic focus 후 Enter 검사이며, 실제 스크린리더·순차 Tab 순서·음성 조작의 완료 증거가 아니다.

[checkpoint](evidence/accessibility-contrast-2026-10-17/checkpoint.json)는 당시 source/측정값/단위 coverage와 범위를 소유한다. 큰 기본 원작 표지와 열린 dialog는 아래 후속 근거를 참조한다. 서재의 다른 목재/이미지 배경·사용자 지정 색과 실제 보조 기술은 별도 조건으로 남긴다.

## 실제 Chrome 200%·400% 확대

2026-10-18 후속: [실제400% native checkpoint](evidence/chrome-native-zoom-2026-10-18/checkpoint.json)에서 아래 기록에 남았던 실제 확대 native 연결을 확인했다. Chrome의 실제400% 표시와475×194 CSS/DPR8을 기록하고, AX·Enter 소리 시작 후 iframe BODY에 남은 초점이 Tab/Shift+Tab으로 이탈하지 못하는 결함을 재현했다. host의 이탈 조건에 native BODY/HTML을 추가했다. 기존 canvas 경로와 SDK 입력 컨트롤의 기본 동작은 유지한다.

수정 후 실제 Chrome400%에서 Tab→의미 summary→44px 선택지 전체 접근, Enter 선택→native 렌더 확인→이전 읽은 컷→대체 선택을 확인했다. 실제 선택지는 제공판에서 만든 독립 사본의 기존 컷을 편집기에서 선택해 재생했으며 원고/Flow를 주입하거나 수정하지 않았다. 90.25px auto-scroll 패널 안에서44px 버튼이 전부 보이는 근거를 남겼다. 실제100% UI/1900px/DPR2 복원과 전용 탭 닫기까지 확인했다.

자동 native 회귀는 BODY 양방향만 실패하고 canvas 양방향은 통과한 RED, 수정 뒤 본문 이탈/기존 선택·되돌림·대체 선택2검사 통과를 구분한다. 이 자동 검사는475×194 CSS 모의이며, 위 실제 Chrome 조작 근거와 별개다. 원고·전체 works·iframe 동일성은 자동 검사에서 비교했다. 실제 Chrome 동선은 독립 사본/기존 컷 선택을 사용했으며 별도 전체 작품 export 비교는 수행하지 않았다. Windows/Chromebook/Android 실물·실제 스크린리더·전체 접근성/성능/제품 출시 검증은 여전히 남아 있다. 아래2026-10-17 기록과 불변 checkpoint는 당시 상태로 보존한다.

native400% 후속에서44px 선택지가20dvh/overflow hidden의 약38.85px 패널에 잘리는 문제를 실제 Chrome으로 재현했다. 초점 패널의 최대 높이를 사용 가능한 viewport 기준으로 바꾸고 overflow auto를 적용했다. [수정 checkpoint](evidence/semantic-viewport-2026-10-17/checkpoint.json)에 실제 실패·수정 후475×194 host1통과를 기록한다. Work 설정이 로컬 브라우저 사용을 비활성화해 수정 후 실제 Chrome 재확인과100% 배율 정리는 수행하지 못했다. 마지막400% 상태이며 탭 자동 정리 여부도 미확인이다. CSS 모의 통과를 실제 확대 통과로 바꾸지 않는다.

같은 수정 후보의 [native 영향 확인](evidence/semantic-viewport-2026-10-17/native-impact-checkpoint.json)은 별도 자동화 브라우저의475×194 CSS viewport에서 실제 Ren’Py 갈래·되돌리기·메뉴/편집 복귀1검사 통과를 기록한다.44px 선택지가 높이90px의 auto-scroll 패널과 viewport 안에 온전히 들어오고, 원고·iframe이 유지됐다. 실제 사용자 Chrome 제어는 여전히 비활성임을 한 번 확인했으며 이를 우회하지 않았다. 이 근거는 실제 native 처리+CSS geometry이며 실제400% 배율 post-fix 확인과 구분한다.

Mac의 실제 Chrome UI에서 새 검사 탭을200%·400%로 확대했다. native 메뉴의 배율 표시와 CSS viewport1885→942→471px을 함께 기록했으며 CSS zoom이나 viewport override는 사용하지 않았다. [checkpoint](evidence/chrome-zoom-2026-10-17/checkpoint.json)에 서재/계정·책 선택 도구·책 시작·400% 대본 입력/다음 컷·작품 설정 진입의 실제 UI 동작과 geometry를 보존한다. 측정한 가로 범위에는 넘침이 없고, 낮은 높이에서는 세로 스크롤로 도구에 접근했다. 이번 범위에서 제품 코드를 변경할 결함은 확인하지 않았다.

원래100% 배율로 복원하고 새 탭/전용3144 서버를 닫았다. 문서 client 폭의15px 차이는 스크롤바 상태에 따른 것이며 native UI의100% 표시로 복원을 확인했다. page screenshot은 CSS viewport bitmap이므로 실물 픽셀 확대의 근거는 native 배율 표시다. 기준 창이1885px이어서400%는471px이며, 이전320px CSS 재배치 검사와 구분한다. 실제 목표 Windows/Chromebook/Android·스크린리더·400% native 재생·전체 저작 보존 비교의 완료를 주장하지 않는다. 계정은 API proxy 없는 검사 origin의 오류/오프라인 도구를 확인했다.

## 지연된 장면 응답과 초점 소유권

`accessibility-focus-ownership.spec.ts`는 host acknowledgment harness의 `sceneRendered`를 보류해 초점 복귀가 현재 revision 확인 전에 일어나지 않는지 검사한다. 실제 renderer가 아닌 지연 응답 제어 검사다. 초기 결과에서 조기 복귀를 재현했고, 저장 봉투의 시각 갱신을 원고 변경으로 오판한 나머지 실패는 분리했다. Web은 `runtime.rendered===scene.revision`을 복귀 조건에 포함하고, focusin/pointerdown/window blur의 의도 이동을 React render와 독립적으로 추적해 과거 복귀 요청을 취소한다.

[checkpoint](evidence/accessibility-focus-ownership-2026-10-17/checkpoint.json)는 지연3경우 통과와 자동 진행1경우의 별도 후속 통과를 구분한다. 자동 설정 입력의 이름에서 `초`를 누락한 검사 오류도 보존했다. 같은 정적 후보에서 영향받는 실제 native 갈래 연결1검사도 통과했다. 원고·모든 works project는 전체 비교하며 읽기 동선에 따라 정상 갱신되는 봉투 시각은 저작 문서와 구분한다. 실제 스크린리더·물리기기·모든 지연/자동 조합의 완료를 주장하지 않는다.

## native 선택·되돌리기와 의미 텍스트의 키보드 연결

`accessibility-choice-native.spec.ts`는 검증된 두 갈래 작품을 실제 가져오기 UI로 열고, 승인된 기존 음원 `audio:music:score-calm`을 첫 컷에 지정해 native 소리 시작→의미 선택지→이전 컷→다른 갈래→설정/Escape→편집 복귀를 검사한다. 첫 실행의 무음 fixture 활성화 요구는 설정 오류로 구분한다. 두 번째 실제 RED에서는 Core 경로/본문은 정상이나 native가 Tab을 소비하고 버튼 제거 후 BODY로 초점이 유실되는 것을 확인했다.

Web은 같은 origin iframe document의 실제 canvas Tab만 처리해 텍스트 summary/읽기 메뉴로 연결한다. 키보드 DOM 조작의 초점 유실은 해당 revision의 장면 확인 후 복구하며, 다른 컨트롤로 이동했거나 포인터로 선택하면 복귀하지 않는다. 새 runtime 명령이나 시각 렌더러는 없다. [checkpoint](evidence/accessibility-choice-native-2026-10-17/checkpoint.json)에 동일 정적 후보의 실제 native1검사 통과·초기 실패·원고/iframe 보존·포인터 비탈취 확인을 기록한다. 이는390 CSS폭의 한 작품 경로이며 모든 자동 진행/지연 상황·실제 보조 기술·실물 기기를 증명하지 않는다.

## native 첫 소리의 키보드 활성화

`accessibility-audio-keyboard.spec.ts`는 새 브라우저 context에서 실제 Ren’Py 첫 소리 잠금을 Enter·Space로 각각 활성화한다. 잠긴 current RuntimeScene의 matching native acknowledgment에만 canvas의 Tab/button 의미를 추가하고, 해제·새 장면·편집/음원 없는 장면에는 원래 SDK 속성을 복원한다. native 대기 화면에만 두 키를 처리하며 중복 unlock은 재생·연출 시계를 다시 시작하지 않는다. 별도 renderer나 protocol 명령은 추가하지 않는다.

[checkpoint](evidence/accessibility-audio-keyboard-2026-10-17/checkpoint.json)에 초기 실제 native2실패, 새 shared runtime→Web 순차 빌드, 최종 실제 native2통과, bridge12검사 및 presenter19검사를 기록한다. 책 시작을 Enter로 실행하고 실제 Tab으로 canvas에 도달한 뒤 키 한 번으로 AudioContext running·음악 시작1회·초기 scene/경로/원고 보존·canvas 속성 복원을 확인했다. AudioContext 생성자는 테스트용 Proxy로 실제 생성 객체를 관찰하며 resume/play나 입력을 대행하지 않는다. 초기 SDK 내부 전역 경로 추정 실패와 관찰을 보완한 후속 실행을 구분한다. 이는 실제 청취·스크린리더·물리 기기 검증이 아니다.

VM에서 실행하는 bridge의 V8 coverage 시도는 계측되지 않아0%로 실패했으므로80% 달성 근거로 쓰지 않는다. 초기 bridge fixture의 version/fade 누락과 오래된 presenter engine mock 오류도 제품 RED와 구분해 보존한다. 실제 native 실패와 후속 통과가 입력 동선 근거다.

## 읽기 메뉴·의미 텍스트의 상태와 키보드 복귀

`accessibility-reader.spec.ts`는 명시적인 protocol acknowledgement harness로 실제 Core의 선택 흐름을 만들고 RuntimeScene과 DOM 화자/본문/선택지 일치, 메뉴 busy 상태, Tab 이탈, 설정 dialog 경계, 저장/불러오기/지난기록 및 확인 취소 후 초점 복귀를 검사한다. 호스트1440/390 두 검사는 실제 Ren’Py·스크린리더 증거가 아니다. 상단 메뉴의 초점 이탈 시 닫기, 의미 선택지의 busy 비활성, 읽기 도구 group, 저장 슬롯의 별도 설명 연결, 공유 dialog Tab 경계 및 확인 취소/전체 닫기 복귀를 보완했다.

저장 슬롯의 raw axe는 별도 보존한다. 고유하게 표시된 `button[data-player-slot]`만 번호 주 이름과 모든 설명 ID의 유일성/내용·계산된 설명을 확인한 뒤 scanner 불일치로 분류한다. 빈 위치와 채워진 위치를 검사하며 다른 node/rule은 제외하지 않는다. 초기 fixture/parser 오류, 실제 RED, 추가 focus 실패, 후속 통과는 서로 다른 경로에 남긴다.

`accessibility-reader-native.spec.ts`는 interception 없이 실제 로컬 Ren’Py Web/WASM을 로드해390폭에서 메뉴/설정/Escape/Tab 이탈 후 의미 버튼으로 다음 컷에 진행하고 같은 iframe과 전체 원고가 유지되는지 확인한다. 첫 검사는 소리 활성화 입력을 빠뜨려 진행 잠금에서 실패했으며, 무대의 실제 사용자 입력으로 소리를 활성화한 후 통과했다. 키보드만으로 최초 소리를 활성화하는 기능의 완료를 주장하지 않는다. 현재 source·실행·raw·native 결과와 한계는 [checkpoint](evidence/accessibility-reader-2026-10-17/checkpoint.json)가 소유한다. 기존 runtime package/Core/저장 형식은 변경하지 않았다.

## 긴 작성 문구와 책 시작의 의미 연결

`accessibility-authored-metadata.spec.ts`는 긴 제목·소개·부제·작가의 말과 한국어/공백 없는 Latin 저자를 가진 작품을 실제 `.knolstory` 가져오기 확인 경로로 준비한다. 책 선택 저자 문구가320px 화면에서 약997px까지 이어지는 문제에 `overflow-wrap:anywhere`를 적용했다. 책 시작의 고쳐쓰기에는 group을, 읽기 버튼에는 기존 주 이름을 유지하면서 별도 보조 설명을 연결하고 제목/설명 참조는 고유 ID를 사용한다.

[checkpoint](evidence/accessibility-authored-metadata-2026-10-17/checkpoint.json)는 세 CSS viewport의 최종3검사 통과·초기 실패·원본/최종 산출물을 소유한다. 서비스 본문의 정확한 전체 문구와 모든 줄의 가로 범위, 각 문구 첫·마지막 줄의 viewport/client clipping 영역 내 도달을 확인한다. 요소 상자 정렬과 글자 Range의 차이 때문에 잘못 실패했던 진단은 실제 글줄을 제한된 횟수만큼 스크롤해 확인하도록 보완했다. 숨김/clip 경계를 제외하지 않으며 최종 geometry를 기록한다. 실제 작품 정보·대본 편집 진입 후 전체 project와 works도 비교한다.

책 시작의 raw axe는 보존한다. 표시된 `button[data-book-start-action]`의 주 문구가 계산된 이름이고 보조 문구가 계산된 설명이며 참조 ID가 고유한 두 버튼만 별도 scanner 불일치로 분류한다. 다른 node/rule을 제외하지 않는다. 이는 모든 사용자 문구/중간 줄의 세로 가림·graphic cover 글자 맞춤·실제 확대/스크린리더/기기·전체 WCAG 검증이 아니다.

## 책 선택·시작 화면의 좁고 낮은 viewport

`accessibility-reflow.spec.ts`는 선녀와 나무꾼 원작의 선택·시작 화면을 CSS viewport320×256,640×360,320×740에서 검사한다. [W3C reflow 설명](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)의 좁은 CSS 폭을 참조하지만 실제 Chrome 확대 조작이나 [텍스트만 확대](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)를 수행한 증거는 아니다. 640×360의 낮은 높이 CSS가 작품 메타 정보와 판본 안내를 숨기던 규칙 두 개를 제거하고 기존 세로 스크롤로 접근하게 했다.

[checkpoint](evidence/accessibility-reflow-2026-10-17/checkpoint.json)에 동일 정적 후보3검사 통과·소스 hash·한계를 기록한다. 메타 문구의 표시, 가로 overflow, 도구를 연 뒤 활성 컨트롤의 강제 클릭 없는 trial actionability와 선택/서재 복귀, 전체 선택 원고 및 기존 작품 보존을 확인한다. CSS visible 판정이 모든 글자 픽셀의 잘림 방지나 긴 사용자 원고 재배치까지 증명하지는 않는다. 초기 로그는 실제 판본 안내 숨김과 잘못된 검사 선택자/작품 등록 비교를 구분한다. 작업 중 같은 출력 경로를 재사용해 원래 초기 이미지·trace·raw를 유실했으므로 그 자료가 보존됐다고 주장하지 않는다. 최종 자료는 별도 `final-artifacts`에 보존했다.

## 기본 원작의 큰 표지·미리보기 대비

네 원작의 책 선택 미리보기와 책 시작 앞표지를 390/1440 폭에서 측정했다. 모바일 미리보기 제목은 fitting 이후 약14.73px bold여서 일반 글자 기준4.5가 필요했고, 기본 금색의 약3.72 대비는 미달했다. 큰 표지의 작은 부제도 미달했다. 기본 classic에서 명시적 `titleColor`와 사용자 편집 `design`이 없을 때 테마 본문 ink를 모든 크기에 사용하도록 공용 resolver를 보완했다. 저장 데이터·이미지·글자 크기·배치는 바꾸지 않는다.

[최종 checkpoint](evidence/accessibility-large-cover-2026-10-17/checkpoint.json)에 실제 두 검사·64문구의 측정값, 초기 RED, 실패·최종 raw 이미지와 단위45검사 coverage를 보존한다. 큰 글자 기준은 실제 계산된24px 또는 굵기700 이상18.67px 이상이며 나머지는4.5로 판정한다. 표지 진입의 의도된 저장 전환을 canonical 원작 ID로 기다린 뒤 측정 전후 활성 원고와 모든 작품 project 전체가 일치하는지 확인한다. 첫 보존 검사에서 이 전환을 기다리지 않아 발생한 경합 기록도 남겼다. 이는 작은 부제의 읽기 편함·확대/재배치·실물 보조 기술이나 모든 사용자 지정 표지의 완료를 증명하지 않는다.

## 열린 책 선택·준비·표지·복구 화면

`accessibility-dialogs.spec.ts`는 열린 책 선택 창, 작품 준비, 표지 편집, 복구 기록을 별도로 검사한다. modal은 실제 열린 dialog 내부를 context로 삼아 뒤의 비활성 서재를 검사 범위와 혼동하지 않는다. 책 선택 창의 `닫기` 이름과 행동별 주 문구/보조 설명을 실제 computed name/description으로 확인하고, 설명 ID의 고유성·Tab 경계·Escape/Enter 닫기·원래 초점 복귀를 검증한다. 표지 조정의 이름 있는 group과 표지 취소/복구 기록 작성 후 활성 원고·전체 작품 보존도 확인한다.

보조 설명은 [W3C ARIA1](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA1)의 같은 문서 내 ID 연결 방식으로 제공한다. 자동 검사의 label-in-name 항목은 전역 제외하지 않는다. 현재 root 내부의 visible 행동 요소에 한정해 실제 주 문구가 이름이고 보조 문구가 설명임을 확인한 경우에만 별도 scanner 불일치로 기록하며 원문을 유지한다. 실제 보조 기술의 낭독 완료로 집계하지 않는다.

책 선택 창 상단 안내와 판본 표시의 부족한 대비를 실제 배경에서 확인하고 불투명 받침색만 추가했다. 표지 적용 버튼의 최초 낮은 값은 글자 밖 모서리 paint가 포함된 진단값이었다. 측정 helper는 독립 흑백 mask와 실제 Text node Range 사각형을 함께 사용해 선택 문구의 진단 영역을 제한한다. 단일 스타일이 아닌 대상은 수동 검토로 남긴다. 첫 border fixture는 보완 전에도 통과했으므로 `border-mask-red.log`라는 파일명과 달리 RED 근거로 쓰지 않는다.

최종 동일 정적 후보의 [8개 검사](evidence/accessibility-dialogs-2026-10-17/final.log)가 통과했다. 두 폭에서 각각34개 선택 문구를 측정했다. [checkpoint](evidence/accessibility-dialogs-2026-10-17/checkpoint.json)에 실제 실패/원문·scoped 측정·형식/원고 보존과 한계를 연결한다. 전체 화면/모든 상태/큰 작성 표지의 대비·실제 스크린리더·음성 입력·실물 기기는 별도다.

## 공개 전달과 확인 한계

미확인 레거시 그림 421개와 그 그림이 포함된 스크린샷, SDK/cache/생성 runtime은 Git에 올리지 않는다. 공개 source CI는 private corpus 없이 준비 도구 실패 사례·타입·린트·source coverage·정적 build를 검사한다. 로컬 full media/native 결과와 구분한다. `media-provenance.py --release free`는 미확인 미디어 때문에 실패해야 하며 이 gate를 우회하지 않는다.

실제 학교 Windows PC·크롬북·Android 기기의 성능/입력/장시간 메모리, 교실 네트워크 및 사람의 음원 청취 승인과 서비스 공개 출시는 이번 자동 검사 결과로 승인하지 않는다. 재현 기록은 아래 검증 문서의 이번 실행 결과를 따른다.

## 2026-10-08 실제 실행 근거

시작 시 `codex/book-entry-cover@8e4655a`는 원격과 일치하고 작업 트리는 깨끗했으며 PR #1은 열린 초안이었다. 기존 문서 commit은 CI skip 상태였고, 문서가 가리키는 `c443c93`의 source CI 성공을 별도로 확인했다. 책 소개·서재·고급 표지·8작품의 기존 완료 감사를 읽고 이 기능들을 재구현하지 않았다.

같은 컴퓨터의 `.cache/cross-machine`에 source와 이번 수정만 복사했다. 프로젝트 의존성·레거시 그림·SDK·runtime이 없는 상태에서 권한 있는 421파일 복원, frozen 설치, SDK/Web/폰트 세 파일의 실제 다운로드와 해시 검증, native/static build 및 브라우저 실행을 통과했다. 빌드 후 같은 prepare를 재실행해 검증된 캐시 재사용도 통과했다. 전역 pnpm/브라우저 캐시는 재사용 가능하므로 새 OS나 다른 실물 컴퓨터의 검증으로 주장하지 않는다.

최종 구성에서 준비 도구 21개, TS 단위/계약/통합 794개, 정적 host 51개(반대 native 경로 25개 skip), DPR 1/1.5/2 세 개, Chromium 153 및 설치된 Google Chrome 154의 8작품 actual Ren’Py 진입을 확인했다. 표지를 편집한 기존 흥부는 227/225컷을 엔딩까지 재생하고 슬롯·기록·재시작·편집 복귀와 archive 전체 일치를 확인했다. 타입·린트·정적 build·production audit와 1341개 미디어 해시가 통과했다. TS coverage는 statement 93.20%/branch 89.66%/line 97.84%이며 구성된 package/web-lib 범위다. React/Python 전체 coverage로 확대해 주장하지 않는다. 개발 의존성 braces의 기존 미수정 경고는 남는다.

검증 중 SDK 재생성 bytecode 오인, 표지 글꼴의 native 중복 복사, 정적 export 캐시의 오래된 runtime, 소개 재방문 직후 100ms 저장 경합, `/probe`의 Next payload 폴더 우선 문제를 수정했다. 관련 실패 사례를 먼저 확인한 뒤 수정 및 회귀 검사를 통과했다. 독립 코드/보안 검토에서 지적된 manifest 추가 파일·정적 runtime 비교 문제도 수정했으며 최종 중대 지적은 없었다.

[완료 감사와 범위](evidence/reproducible-test-environment/completion-audit.json), [통합 verify 로그](evidence/reproducible-test-environment/verify.log), [전체 host](evidence/reproducible-test-environment/host-regression.log), [DPR](evidence/reproducible-test-environment/dpr.log), [Chrome 8작품](evidence/reproducible-test-environment/chrome-eight-entry.log), [재실행 prepare](evidence/reproducible-test-environment/repeat-prepare.log). 로그의 기기 경로는 placeholder로 정규화하고 반복 진행률·HTTP access 줄은 생략했다.

[흥부 고정 입력](evidence/reproducible-test-environment/heungbu-native-input.knolstory)과 [native 경로 기록](evidence/reproducible-test-environment/heungbu-native-reading.json)은 같은 project ID와 SHA256을 확인해 별도 보관했다. 뒤의 host 검사가 표지 파일을 다시 생성해도 native 입력이 바뀌지 않는다. 그림이 들어간 실제 화면과 trace는 local/ignored 상태다. 무료 공개 release gate는 1280개 미확인 distributed media 때문에 exit1로 차단됨을 확인했으며 공개 배포하지 않았다.

자체 점검(agent-self-evaluation): 정확성 4/5(실제 native/해시·파일 일치; 물리 기기 제외), 완결성 4/5(대상 흐름/자동화 완료; Windows/학교 기기 별도), 명확성 4/5(공개 source CI와 권한 로컬 native 구분), 실행 가능성 4/5(단일 준비·복구·이동 안내; 레거시 기존 권한 필요), 간결성 4/5(기존 감사 유지, 재현 근거만 분리). 평균 4.0/5. 다음 검증은 실제 학교 기기의 입력/성능과 공개 미디어 권리 증빙이다.


2026-10-08 화면 정정: 준비 도구의 같은 복원 명령이 목재 방/선반/상판 화분/전경 2개/사각 포스터 4개/로고의 UI 10개를 추가로 복원한다. 서재의 검색·새 작품·파일 가져오기는 접힌 작품 관리에서 연다. 원본 첨부 소개 구도와 현재 옹고집 표지 호환 및 이번 검증은 [디자인 정정 문서](library-book-design-parity.md#2026-10-08-첨부-원본-소개와-조용한-서재-상단-정정)에 기록한다. 이전 감사 수치는 당시 실행의 기록이다.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.

## 로컬 정적 서버의 미디어 위치 이동 — 2026-10-21

`scripts/serve-test-build.py`는 단일 HTTP 바이트 범위의 시작-끝·시작 이후·뒤에서 N바이트 요청을206과 Content-Range/Content-Length로 제공한다. 범위가 잘못되면416을 반환한다. 일반 파일·확장자 없는 경로는 기존 처리를 유지한다. 이는 HTML audio의 원본 사용 구간 이동을 실제 브라우저에서 검증하는 데 필요하다. 범위 미지원200 응답으로 위치 이동을 반복하는 상태를 음원 재생 성공으로 처리하지 않는다. 서버 코드 변경 후에만 해당 로컬 프로세스를 확인하여 다시 시작한다. 운영 서버의 부분 응답이나 물리 기기 재생은 이 로컬 근거와 구분한다. [수정·실제 미디어 검사](evidence/audio-audition-2026-10-21/checkpoint.json).


## Android 휴대폰의 USB 편집 검증 준비 -- 2026-10-23

실기기 검사는 개발 Mac의 브라우저 viewport 모의와 별도로 기록한다. USB 제품명이 보이는 것과 `adb devices`의 허용된 `device` 상태도 구분한다. 이번 준비에서는 삼성 Android USB 연결을 확인했고, 연결 도구는 Git에서 제외된 `.cache/android-tools-20261023/platform-tools/`에만 두었다. 현재 USB 디버깅 허용은 사용자의 휴대폰 조작을 기다린다. 이 준비를 실기기 편집 통과로 기록하지 않는다.

[Google의 Platform Tools](https://developer.android.com/tools/releases/platform-tools)와 [Chrome의 Android 원격 디버깅 안내](https://developer.chrome.com/docs/devtools/remote-debugging)를 따른다. USB 디버깅은 사용자가 켜고 휴대폰의 연결 허용 창을 직접 처리한다. 기존 연결 승인을 일괄 취소하거나 브라우저 데이터·개인 파일을 지우지 않는다.

허용된 기기가 하나인지 확인한 뒤 대상 기기를 지정해 개발 서버의 포트만 USB로 전달한다. `adb reverse tcp:15401 tcp:15401`은 이미 실행 중인 Mac의 loopback 검사 서버를 휴대폰의 같은 포트로 연결하는 단계다. 여러 기기가 있으면 반드시 대상 기기를 지정한다. LAN 전체에 검사 서버를 공개하거나 운영 사이트에 검사 작품을 업로드할 필요는 없다. 실제 검증에서는 독립 검사 탭과 작품 사본을 사용한다.

검증 순서는 다음과 같다.

1. 기기 모델·Android·Chrome 버전과 세로 화면의 실제 viewport를 기록한다. 키보드 닫힘/열림을 나누어 현재 컷의 글과 저장 상태·메뉴 접근성을 확인한다.
2. 한국어를 실제 키보드로 입력하고 조합 중 컷 이동·장 이동·메뉴 열기에서 글이 사라지거나 겹치지 않는지 확인한다. 프로토콜로 값을 넣는 동작은 실제 키보드 조합 검증과 구분한다.
3. 이전/현재/다음 컷 이동, 기본 편집·글·배경·인물 편집, 선택지 작성과 재생 후 편집 복귀를 확인한다. 가로 화면에서는 실제 회전 후 화면 비율·버튼 겹침·가상 키보드 영역을 따로 기록한다.
4. 음향·연출을 켠 독립 작품에서 통합 편집의 한 손가락 이동·두 손가락 확대·보조선·상세 창을 확인한다. 확대는 보기 설정만 바꾸며 작품 내용은 보존되어야 한다.
5. 실제 작품 파일을 휴대폰에 저장하고 파일 선택기를 통해 다시 연다. 다운로드 버튼 호출·임시 보관만으로 실제 파일 저장/재열기를 통과 처리하지 않는다. 수정한 글과 조건·음향/연출·자산 ID를 내보낸 파일 전체로 대조한다.

검사 결과에는 통과·실패·미실행과 실제 입력/자동화 방법을 남긴다. 종료 시 이번에 만든 USB 포트 전달만 `adb reverse --remove tcp:15401`로 해제하고 검사 탭을 정리한다. 사용자 기존 탭·다운로드 파일은 일괄 삭제하지 않는다. USB 디버깅을 처음 켰다면 사용자에게 원래 상태 복원 방법을 안내한다. 화면·로그에는 개인 알림·기기 일련번호를 남기지 않는다.

## 정적 전달 후보 검사 — 2026-10-29

[ADR0026](../decisions/0026-static-reading-authoring-and-optional-api.md)의 정적 웹 독립을 위한 사전 검사다. 현재 로컬 준비용 산출물을 그대로 공개할 수 있다는 뜻이 아니다. 재현 환경의 Web 정적 빌드 뒤 다음을 실행한다.

```sh
pnpm delivery:inventory --output .cache/static-delivery-inventory.json
pnpm delivery:check --output .cache/static-delivery-check.json
```

첫 명령은 읽기전용 인벤토리이며 두 번째는 차단 사유가 있으면 종료 코드1이다. `--root`로 별도 정적 후보를 검사할 수 있다. 보고서는 검사 대상 안에 쓰지 않는다. 원고·파일·레거시 원본을 바꾸거나 업로드하지 않는다. Asset ID와 기존 권리 기록의 해시·고지 자료, runtime 필수 파일·누락·용량을 대조한다. 미확인 런타임 컨테이너도 차단하며 MIME은 확장자 기반의 후보 정보라 실제 응답 Content-Type·코덱·CORS·Range 검증을 대신하지 않는다.

현재 Pages 크기/개수 기본 제한은 [공식 문서](https://developers.cloudflare.com/pages/platform/limits/)의 파일당25MiB/무료20,000개다. `--max-file-bytes`/`--max-files`는 다른 검토 후보의 용량 조건을 비교하는 인자이며 실제 호스팅 한도나 권리 제한을 해제하지 않는다. `runtime.zip`은 개발용 전체 다운로드 자료이므로 웹 서비스 산출물에서 제외할 대상으로 진단한다. `passesPreflight`는 이 도구의 범위 통과이며 공개 배포 승인·전체 제품 완성을 뜻하지 않는다. 실제 CDN/대용량 경로 후보와8판본의 참조 충족·API 없는 첫 실행 검증이 별도로 필요하다.

로컬 실행 후보는 새 디렉터리에 준비한다. Pages 단독 목표에는 `--pages-only`를 사용한다. 실행에 필요하지 않은 `runtime.zip`을 제외한 뒤에도 파일당 한도를 넘는 파일이 있으면 출력 생성 전에 실패한다. 이 인자가 없으면 큰 파일은 `objects`로 분리하므로 Pages 단독 충족으로 해석하지 않는다.

```sh
pnpm delivery:prepare --pages-only --output .cache/pages-candidate
KNOL_STATIC_CANDIDATE=.cache/pages-candidate pnpm test:e2e:static
pnpm delivery:preview --candidate .cache/pages-candidate --port 3000
```

준비 명령은 원본 파일 바이트·서비스 경로를 보존하고 전체 다운로드용 묶음만 후보에서 제외한다. `manifest.json`과 권리 검사 결과는 서비스 루트 밖에 둔다. 미리보기는 루프백에서 두 저장 영역을 같은 출처로 제공하며 온라인 API는 없다. 파일/해시·Range·버전 캐시의 로컬 확인용이며 실제 Pages 응답이나 CDN 캐시를 대신하지 않는다. 미리보기 동안 후보 파일을 수정하지 않는다. 권리 검사 실패는 이 후보를 만든 것으로 해제되지 않는다.

패키징 변경 후에는 `runtime:build → Web build → 후보 준비` 순서를 지키고, `.agents/skills/runtime-qa/SKILL.md`의 정적 전달 절차를 따른다. 현재 결과와 한계는 [패키지 축소 근거](evidence/static-delivery-2026-10-29/pages-audio-checkpoint.json)에서 확인한다.

2026-10-31부터 `runtime:build`는 `runtime/renpy.data.br`과 `runtime/renpy.wasm.br`도 만든다. 원본을 brotli 11로 압축하고, 풀었을 때 원본과 바이트가 같아야 남긴다(`spikes/renpy-web/transport.py`). 공개 주소의 edge Worker가 브라우저가 br을 받을 때 이 사본을 `Content-Encoding: br`로 보낸다. 범위 요청과 Pages 단독 주소는 원본을 그대로 받는다. 감사는 이 사본을 원본과 같은 실행 묶음으로 분류해 같은 검토 차단을 적용하고, 원본이 없으면 `missing-transport-source`로 막는다. 공개 주소에서 사본 전달을 확인할 때는 `pnpm delivery:verify … --expect-brotli`를 쓴다. 로컬 미리보기는 압축 협상을 하지 않으므로 이 경로를 대신 확인하지 않는다. [근거](evidence/startup-speed-2026-10-31/checkpoint.json).

## 인물 상대 크기 파생 이미지 복원 — 2026-10-30

고정 원본을 보유한 개발 환경에서 `python3 -m pip install Pillow==11.3.0`을 준비한다. 원본 그림의 권리가 새로 승인되는 것은 아니다. `restore-legacy-media.py`는 기록된 원본 해시를 확인한 뒤 어린 인물 파생본을 재생성하고 현재 카탈로그 해시·geometry를 대조한다. 원본이 이미 있는 환경에서는 다음 명령으로 파생본만 복원할 수 있다.

```sh
python3 scripts/prepare-character-stature-assets.py --restore --manifest .cache/character-stature-transform.json
```

`--restore`는 현재 카탈로그를 바꾸지 않는다. 해시·geometry가 다르면 도구/원본 차이를 확인하고, 정상 파일을 임의 새 버전으로 승인하지 않는다. 처음 변환 정책을 변경하는 개발 작업에서만 `--restore` 없이 실행하고 카탈로그·프로비넌스·실제 장면을 함께 검토한다. 파생 WebP도 원본의 배포 권리 경계를 상속하므로 비공개 미디어와 같은 방식으로 보관한다. 다른 컴퓨터에서 `env:prepare`를 사용할 때도 이 의존성과 원본이 필요하다.

이미지 경로의 runtime contract를 변경하면 호스트 TypeScript만 빌드하지 않는다. `pnpm runtime:build → pnpm --filter @knolstory/web build`로 iframe 안의 생성 계약까지 맞춘 뒤 가로/세로 읽기·편집·파일 재열기를 확인한다. [현재 검증](evidence/character-relative-size-2026-10-30/fix-checkpoint.json).
