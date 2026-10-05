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
- JS → Ren'Py: 공식 push API 없음 → Ren'Py 쪽 주기적 polling 필요
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

### 3. 호스팅: same-origin iframe, 영속 런타임

- Ren'Py Web 빌드는 `apps/web`의 정적 경로(예: `/runtime/<runtimeVersion>/`)에 배포하고 same-origin iframe으로 삽입한다.
- 편집기·플레이어 화면마다 iframe 하나를 유지하며, 컷 이동 때 재생성하지 않는다.
- 한 페이지에 동시 활성 런타임은 1개를 원칙으로 한다 (메모리).

### 4. Bridge 프로토콜 v1

전송:
- 호스트 → Ren'Py: 호스트가 iframe `window.knolBridge` 큐에 명령을 넣고, Ren'Py가 periodic callback에서 `run_script_string("knolBridge.drain()")`으로 JSON 배열을 가져간다. 목표 polling 간격 ≤ 33ms (spike에서 비용 측정).
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
| `preload` | 다음 컷 후보의 자산 ID 목록 |
| `reset` | 런타임 상태 초기화 |

이벤트 (Ren'Py → 호스트, 초안):
| type | 용도 |
|---|---|
| `ready` | runtimeVersion, 지원 contractVersion 범위 |
| `sceneRendered` | sceneId, revision, textbox rect, 렌더 소요 시간 |
| `advanceRequested` | 사용자가 다음으로 진행 요청 |
| `choiceSelected` | choiceId |
| `presentationDone` | 전환/연출 완료 (진행 제어용) |
| `audioUnlockNeeded` | 모바일 오디오 잠금 상태 알림 |
| `error` | code, message, sceneId |

- 모든 payload는 `runtime-contract`의 스키마로 양쪽에서 검증한다.
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
- bridge 테스트: seq 역순/중복, revision 폐기, 버전 불일치
- runtime QA 스킬 항목 (지연·메모리·DPR·letterbox 정렬)
