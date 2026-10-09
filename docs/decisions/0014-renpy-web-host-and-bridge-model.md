# ADR 0014 — Ren'Py Web 호스팅과 Bridge 모델

**Status:** Proposed — Ren'Py Web spike 결과로 세부 확정 후 Accepted

## 배경

ADR 0002·0003은 “Ren'Py가 RuntimeScene을 소비한다”까지만 정했다. 구현을 시작하려면 다음이 정해져야 한다.

- 재생 상태(현재 컷, 선택 경로, 읽기 진행)를 누가 소유하는가
- Web ↔ Ren'Py 통신 방식과 순서·중복 처리
- 편집 중 빠른 연속 변경 처리
- 자산·폰트를 런타임에 공급하는 방식

Ren'Py Web(Emscripten/WASM)의 알려진 제약:
- Ren'Py → JS: `renpy.emscripten.run_script*` 호출 가능
- JS → Ren'Py: 공식 Web 문서는 `window.renpy_exc`, `window.renpy_get`, `window.renpy_set`를 안내한다. pinned SDK의 `web/renpy-pre.js`에서 동작을 확인하고 polling 방식과 비교한다. "공식 push API 없음"이라는 초기 가정은 사용하지 않는다.
- 단일 스레드, 백그라운드 이미지 preload 제한, CSS 반응형 없음, 모바일 오디오는 사용자 입력 후 재생

## 제안 결정

### 1. 재생 상태는 Web 호스트의 Runtime Core가 소유한다

```text
StoryDocument ──► runtime-core (JS, 호스트) ──► RuntimeScene ──► Ren'Py (presenter)
                       ▲                                              │
                       └──────── RuntimeEvent (advance/choice/…) ─────┘
```

- Ren'Py는 **StoryDocument를 절대 받지 않는다.** 컷 단위로 완전히 해석된 RuntimeScene만 받는다.
- Flow 해석, 다음 컷 결정, 선택 경로 history, 이어읽기 저장은 runtime-core가 한다.
- Ren'Py의 save/load, rollback, preferences, quick menu는 비활성화한다.
- 같은 RuntimeScene + 같은 prefs → 같은 화면 (결정적 재현). 이전 컷·임의 컷 미리보기·이어읽기 모두 “해당 컷의 RuntimeScene 로드”로 처리한다. 레거시 연출 v2의 “각 컷에 최종 상태를 명시 저장” 원칙과 일치한다.

### 2. Stage Layout은 runtime-core가 계산해 RuntimeScene에 포함한다

- 인물·소품의 최종 좌표·크기·depth·focus 상태를 **논리 좌표계(예: 1920×1080)** 로 확정해 전달한다. Ren'Py는 배치를 계산하지 않고 그대로 표시한다 (ADR 0004).
- Edit Overlay는 같은 RuntimeScene의 좌표를 화면 배율로 변환해 사용한다. 따라서 Overlay와 Stage 정렬은 계약상 보장된다.
- **예외: 텍스트 박스 높이.** 글자 측정은 Ren'Py만 정확히 알 수 있으므로, Ren'Py가 렌더 후 `sceneRendered` 이벤트로 텍스트 박스 실제 rect를 보고한다. Overlay는 이 값을 사용한다.

### 2a. Viewport 투영과 responsive editor shell

Ren'Py 런타임은 고정 논리 Stage를 렌더하고, Web 호스트는 그 Stage를 반응형 편집 Shell 안에 `contain` 방식으로 배치한다. M1b probe의 기준 논리 크기는 `1280×720`이며, M3 RuntimeScene 계약 확정 전까지 측정 결과로만 바꿀 수 있다.

호스트가 소유하는 투영식:

```text
scale = min(containerWidth / logicalWidth, containerHeight / logicalHeight)
stageWidth = logicalWidth * scale
stageHeight = logicalHeight * scale
stageLeft = (containerWidth - stageWidth) / 2
stageTop = (containerHeight - stageHeight) / 2
logicalX = (clientX - containerLeft - stageLeft) / scale
logicalY = (clientY - containerTop - stageTop) / scale
```

- StoryDocument와 RuntimeScene에는 표시 픽셀이 저장되지 않는다. 좌표는 항상 논리 Stage 기준이다.
- Web Edit Overlay는 이 투영식의 inverse transform만 사용한다. 별도 배치 알고리즘을 만들지 않는다.
- DPR은 품질·스크린샷 검증 변수일 뿐, 좌표 계약을 바꾸지 않는다.
- 제품 계약 강화안: `init` 또는 `setViewport` 명령에 `logicalWidth`, `logicalHeight`, `viewportGeneration`, `mode`를 포함하는 방식을 검토한다. 초기 probe에는 아직 이 명령이 없으며 `viewportChanged.rendererRect`를 사용한다.
- Ren'Py는 `config.screen_width` / `config.screen_height`를 논리 Stage와 맞추고, `sceneRendered`에서 렌더된 content rect와 textbox rect를 보고한다.
- 패널 접기, 브라우저 resize, 모바일 orientation change, fullscreen 진입에서 iframe을 재생성하지 않는다. probe는 resize 중 gesture를 취소한다.
- 제품 계약 강화안: generation별 렌더 확인으로 오래된 viewport 이벤트를 거르고, 동기화 전 드래그를 보류한다. 작품 revision이 같은 resize도 독립적으로 확인해야 한다. 구현·실측 전까지 이 보장을 완료로 표시하지 않는다.
- Ren'Py 보고 rect와 호스트 투영 rect의 차이를 감지하고 편집 오버레이를 보류하는 정책은 실제 엔진 viewport 측정 결과에 맞춰 정한다.

### 3. 호스팅: same-origin iframe, 영속 런타임

- Ren'Py Web 빌드는 `apps/web`의 정적 경로(예: `/runtime/<runtimeVersion>/`)에 배포하고 same-origin iframe으로 삽입한다.
- 편집기·플레이어 화면마다 iframe 하나를 유지하며, 컷 이동 때 재생성하지 않는다.
- 한 페이지에 동시 활성 런타임은 1개를 원칙으로 한다 (메모리).
- 초기 responsive probe는 iframe 내부 viewport를 1280×720으로 고정하고 iframe 전체를 Web에서 contain 배율로 축소한다. Ren'Py 8.5.3의 최소 내부 표시 높이 256px 때문에 작은 iframe의 직접 resize는 canvas clipping과 Overlay 오차를 만들었다. 이 방식의 모바일 가독성·GPU/메모리 비용은 별도로 측정한다.

### 4. Bridge 프로토콜 v1

전송:
- 호스트 → Ren'Py: same-origin iframe에 source/origin을 검증하는 `postMessage`로 명령을 전달하고, bridge 큐의 최신 scene을 Ren'Py가 가져간다. 초기 probe는 screen timer 50ms를 사용한다. polling 간격·입력 debounce·공식 JS API 사용 여부는 실제 반영 지연과 CPU 비용으로 정한다. ≤33ms를 검증 전 요구값으로 고정하지 않는다.
- Ren'Py → 호스트: `run_script("knolBridge.emit(<json>)")`.

공통 envelope:
```json
{ "protocol": 1, "seq": 42, "revision": 17, "type": "loadScene", "payload": {} }
```
- `seq`: 메시지 순서. 수신 측은 중복·역순 메시지를 버린다.
- `revision`: 편집 리비전(단조 증가). Ren'Py는 최신 revision만 렌더하고, 처리 중 더 새 revision이 오면 이전 것을 버린다 (빠른 타이핑 대응).

명령 (호스트 → Ren'Py, 초안):
| type | 용도 |
|---|---|
| `init` | contractVersion, mode(`edit`/`play`), prefs |
| `loadScene` | RuntimeScene 전체 표시 (전환 연출 포함 여부 지정) |
| `patchScene` | 텍스트·화자 등 소규모 변경 (spike 결과에 따라 `loadScene`로 통합 가능) |
| `setPrefs` | reducedMotion, textSpeed, volume, 글상자 기본 높이, 인물 표시 배율 |
| `setViewport` | 표시 컨테이너 변경, fullscreen/orientation/panel 상태 변경에 따른 viewportGeneration 갱신 |
| `preload` | 다음 컷 후보의 자산 ID 목록 |
| `reset` | 런타임 상태 초기화 |

이벤트 (Ren'Py → 호스트, 초안):
| type | 용도 |
|---|---|
| `ready` | runtimeVersion, 지원 contractVersion 범위 |
| `sceneRendered` | sceneId, revision, viewportGeneration, content rect, textbox rect, 렌더 소요 시간 |
| `advanceRequested` | 사용자가 다음으로 진행 요청 |
| `choiceSelected` | choiceId |
| `presentationDone` | 전환/연출 완료 (진행 제어용) |
| `audioUnlockNeeded` | 모바일 오디오 잠금 상태 알림 |
| `error` | code, message, sceneId |

- 모든 payload는 `runtime-contract`의 스키마로 양쪽에서 검증한다.
- 초기 responsive probe는 `runtime-contract`의 TypeScript guard에서 생성한 JS validator를 iframe에서도 사용한다. 최종 RuntimeScene v1 전체와 JSON Schema 생성은 M3에서 수행하며 probe 구현을 M3 완료로 간주하지 않는다.
- 호스트는 `ready`의 contractVersion 범위가 맞지 않으면 런타임을 사용하지 않고 오류 화면을 보인다 (조용한 폴백 렌더러 없음).

### 5. 자산·폰트 공급

- StoryDocument는 논리 Asset ID만 저장한다. runtime-core가 Asset ID + asset revision → 런타임 경로로 해석한다.
- 공급 방식 후보 (spike에서 선택):
  - A. 기본 자산을 Ren'Py 빌드에 포함 + progressive download
  - B. 호스트가 URL을 fetch해 Emscripten 가상 FS에 기록 후 Ren'Py가 파일로 로드
- 자산 라이브러리 갱신이 런타임 재빌드를 강제하지 않는 쪽(B 또는 A+B 혼합)을 우선한다.
- 한국어 폰트(UI·본문)는 런타임 빌드에 포함한다. 크기는 성능 예산 대상이다.

### 6. 버전

- `runtimeVersion`(Ren'Py 빌드)과 `contractVersion`(RuntimeScene 스키마)을 분리한다.
- 공유 링크·제출 뷰어는 최신 런타임을 사용하며, 런타임은 지원 contract 범위 내에서 이전 RuntimeScene을 재생할 수 있어야 한다. StoryDocument → RuntimeScene 변환은 항상 현재 runtime-core가 수행하므로, 작품 저장본에 RuntimeScene을 저장하지 않는다.

## 검증

- contract 테스트: fixture StoryDocument → RuntimeScene golden snapshot
- bridge 테스트: seq 역순/중복, revision 폐기, viewportGeneration 불일치, 버전 불일치
- runtime QA 스킬 항목 (지연·메모리·DPR·letterbox 정렬)
- 편집 QA: 빠른 텍스트 입력, Korean IME composition, actor drag 중 resize/orientation change, 패널 접기/펼치기, fullscreen 전환, 좁은 화면 bottom sheet 편집

### 2026-10-07 표시 영역 구도 확장

사용자가 고정16:9 축소 대신 실제 표시 영역에 맞는 구도를 요청했다. M1b 고정 Stage probe는 역사적 측정 기준으로 유지하되, 현재 작품 편집·재생은 Runtime Core가 표시 영역 비율에서 논리 Stage 크기·배경 rect·글상자·인물 좌표를 계산한다. Ren’Py8.5.3의 동일 인스턴스에서 가상 화면 크기를 갱신하며 iframe은 계산된 논리 크기에서 Web 투영으로 표시한다. 별도 Web renderer는 없다. 구도보기와 DPR 변경은 문서 좌표를 수정하지 않는다. RuntimeScene의 선택적 viewportVersion1/audio version1/actor motion version1을 양쪽에서 검증한다. 구체 규칙·파일 첨부·검증은 [반응형 오디오 제작](../architecture/responsive-audio-authoring.md)에 기록한다. ADR 전체의 성능·운영 미확정 항목을 이 확장으로 완료로 간주하지 않는다.
