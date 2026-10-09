# 표시 영역 구도와 연출·오디오 제작

## 구현 계약

StoryDocument v5의 기존 의미를 유지하며 선택적 `Chapter.audio`, `StoryLine.audio`, `presentation.backgroundFocal/backgroundFit`, `StageActorEntry.motion`을 추가했다. 구형 작품에는 새 필드가 필요 없다. 문서에는 자산 ID와 의미 있는 설정만 저장하고, 화면 픽셀이나 Ren’Py 코드·캐시 경로를 저장하지 않는다.

RuntimeScene contractVersion 1에는 선택적 `viewportVersion:1`, 논리 무대 크기, `textboxRect`, `dialogueStyle`, 배경의 최종 `rect`, actor motion version1, audio version1을 추가했다. 새 호스트는 이 계약을 이해하는 공유 Ren’Py presenter와 함께 배포해야 한다. 기존 렌더러로 새 확장을 보내 동작한다고 가정하지 않는다.

Runtime Core가 실제 표시 영역의 비율을 받아 모든 위치를 계산한다. 세로는 논리 폭720, 가로는1280을 사용하며 높이는 비율에서 계산한다. Web은 그 결과와 동일한 좌표계로 iframe·편집 손잡이를 투영한다. Ren’Py는 동일 인스턴스의 가상 화면 크기를 바꾸고 전달된 배경·인물·글상자를 표시한다. Web 이야기 렌더러는 없다.

## 기본 구도와 호환

화면 구도 선택은 현재 표시 영역, 데스크톱16:9, 휴대폰 세로9:20, 가로20:9를 제공한다. 선택은 편집기 보기 상태이며 작품의 인물 좌표를 변경하지 않는다. 배경 중심 x/y와 화면 채우기/전체 그림 보이기 선택은 작품 설정으로 저장한다. 새 표시 영역의 기본값은 화면 채우기이며, 전체 장면 그림을 보존해야 하는 컷은 전체 그림 보이기로 여백을 허용할 수 있다. 실제 원본 이미지 크기를 사용해 cover/contain과 중심에 따른 최종 사각형을 Core에서 계산한다.

표시 영역을 전달하지 않는 기존 호출은1280×720의 기존 계산을 유지한다. 새 편집·재생에서는 투명 여백을 포함한 캔버스 높이 대신 실제 알파 실루엣의 높이를 기준으로 크기를 보정한다. 일반 사람 대비 작은 인물의 기본 실루엣 높이는98%이며, 사용자가 지정한 배율은 그 위에 그대로 적용한다. 기존 Asset ID, stage actor key, xAnchor, 배율, 중앙·원본 방향, 무인물·POV 컷은 보존한다. 동물·소품·탈것의 별도 비율은 유지한다.

모바일 세로 기본 글상자는 높이 약66% 지점에서 시작하고 인물 발끝 기준은85%다. 얼굴이 위로 잘리지 않도록 보정하며 하반신은 글상자 뒤에 가린다. 좌우 일부 잘림을 허용해 전신을 보여주려는 과도한 축소를 피한다. 여러 인물은 표시 공간에 맞춰 안전 배치를 적용한다. 새 기본값의 시각적 변화는 문서 데이터의 자동 재작성이나 마이그레이션이 아니다.

세로 편집에서는 읽기 좋은 무대 때문에 입력 영역이 사라지지 않도록 전체 편집 흐름의 스크롤과 활성 입력 영역의 최소 높이를 확보했다. 가로 편집은 무대와 도구를 나눠 표시한다.

## 연출과 오디오 규칙

화면 효과는 무대 전체에, look은 배경·인물에, 인물 강조와 motion은 지정 인물에 적용한다. 인물별로 서서히 등장·퇴장 또는 출발 가로 위치에서 최종 배치로 이동 중 한 동작을 선택한다. 동작 시간과 시작 대기를 저장한다. 효과의 기본 지속 시간은 UI에 안내하고 전환 시간은 직접 설정한다. 같은 컷의 문서·구도 갱신은 연출을 재시작하지 않는다. 확인형 전환 완료는 revision 대신 컷 진입 identity에 묶어, 화면 크기나 동작 설정을 바꿔도 진행을 다시 잠그지 않는다. 엔딩으로 넘어가는 것은 새 컷 진입이 아니므로 마지막 컷의 효과음을 반복하지 않는다. 구도 미리보기의 글 크기는 실제 표시 배율에서 읽기 좋은 크기를 확보하도록 계산한다. 실제 진입·재시작은 별도 presentationEntry로 구분한다. 동작 줄이기는 최종 인물 상태를 즉시 적용하고 기존 화면 효과·전환의 규칙도 따른다.

장 진입 시 장 기본 음악 지시를 적용하고 컷의 명시적 음악 재생/변경·정지 지시를 적용한다. 생략/유지는 앞 컷의 상태를 이어받는다. 실제 방문 경로를 해석하므로 선택지 합류에서 다른 가지의 음악이 섞이지 않는다. 동일 경로의 음악·반복 설정은 컷 이동이나 표시 영역 갱신 때문에 다시 시작하지 않으며 음량은 갱신한다.

이전으로 이동하면 축소된 방문 경로의 음악 상태를 복원한다. 처음부터/다시 읽기는 새 audio session으로 음악을 처음부터 시작한다. 새로고침의 이어읽기는 저장된 컷·선택 경로를 복원하고 그 컷의 원하는 음악을 처음부터 시작한다. 음악의 초 단위 재생 위치는 작품·이어읽기 저장 대상이 아니다. 엔딩에서는 마지막 음악 지시를 유지하며, 편집 모드로 돌아오면 음악과 효과음은 정지한다.

효과음은 장 진입당 장 설정 최대4개, 컷 진입당 컷 설정 최대4개를 각 음량·지연으로 실행한다. 장 안의 다음 컷에서는 장 효과음을 반복하지 않는다. 이전 컷의 미실행 효과음은 취소한다. 전환 화면이 있는 컷은 전환 완료 후 효과음 지연과 인물·화면 연출을 시작한다. 같은 컷 수정은 효과음을 반복하지 않는다. 오디오를 사용하는 재생에서 아직 게임 내부 입력이 없으면 Ren’Py가 ‘소리 켜고 시작’ 화면을 표시한다. 실제 무대 입력 전에는 음악·효과음과 연출 시계를 실행하지 않고 host 진행도 보류한다. 무대를 누르면 음악·효과음·연출을 함께 시작한다. 이후 컷 이동은 다시 잠그지 않는다.

## 자산 보관

기본 공유 자산은 숲·밤 음악, 종·발걸음 WAV4개이며 생성 방법과 원본은 `apps/web/public/assets/audio/README.md`에 기록했다. 오디오도 이미지처럼 안정적인 자산 ID를 사용하고 registry에서 런타임 경로로 해석한다.

사용자 WAV/MP3/OGG는 `knolstory-audio-assets-v1` IndexedDB에 저장한다. 파일 서명, 크기, SHA-256을 검증하고 `audio:custom:<hash>:<extension>` ID를 발급한다. `.knolstory` 파일의 최상위 `audioResources` 첨부 표에는 실제 사용한 자료의 bytes를 base64로 보관한다. StoryDocument의 project에는 바이너리가 없다. 전체 파일20MB, 파일당5MB, 가져오는 오디오 첨부 표의 base64 총합20MB 한도를 적용한다. 파일 경계와 native 설치 경계 모두 안전한 ID·경로·해시를 검증한다.

이전 파일처럼 첨부 표가 없는 작품도 읽는다. 사용자 오디오를 참조하는데 파일과 보관함 모두에 자료가 없으면 가져오기를 거부하고 현재 작품을 보존한다. 다른 브라우저로 파일을 복원할 때도 자산 ID와 bytes를 함께 복원한다. 기본 자산만 있는 작품은 IndexedDB 오디오 보관함이 불가능해도 재생·파일 내보내기에 불필요한 의존을 갖지 않는다.

## 완료 기준별 검증

| 기준 | 증거와 확인 내용 |
|---|---|
| A 실제 자산 분기 작품 | `tests/fixtures/responsive-audio.json`의6컷: 작은/큰 두 인물, 중앙 한 인물, 무인물, 나 시점, 시각 연출, 음악 유지/정지/변경 두 엔딩. E2E에서 실제 사용자 음악·효과음을 등록하고 파일 복원 뒤 native 재생한다. |
| B 화면 구도 | native E2E가1280×720,720×1600,1280×576 preset의 실제 엔진 크기/투영 비율을 검사한다. 실제390×844 세로 편집과844×390 가로 읽기 화면도 캡처한다. Core 테스트는 네 대표 작품 모든 컷을 세로/가로로 컴파일하고, 얼굴 상단·하반신 글상자 겹침·98% 실루엣·직접 배치·focal crop·미리보기 실제 글 배율을 검사한다. |
| C 연출·음악 재생 | native verifier에서 실제 음악 get_pos 증가, 컷 간 동일 시작 횟수, SE channel의 실제 사용자 path, 진입당 한 번, 재시작 session을 검사한다. 실제 픽셀로 등장/퇴장/이동, 같은 컷 수정의 연출 시계 보존, 줄인 동작의 즉시 최종 상태를 검사한다. E2E는 두 분기·음악 정지/변경·이전으로 음악 복원·reload 이어읽기와 기존7효과/2look/3전환 검증을 연결한다. |
| D 저장과 휴대 복원 |1280px/390px host E2E에서 편집→자동 저장→reload→파일 내보내기→별도 browser context 가져오기→실제 audio 미리 듣기. native E2E도 새 context에서 파일 bytes를 복원하고 실제 사용자 음악/효과음 path를 재생한다. 파일 왕복 뒤 project 전체 동일성을 검사한다. |
| E 기존 작품 | 기존 domain/compatibility fixtures와 네 작품 편집·파일·native 재생, 전체 흐름·분기·구도/드래그 회귀 테스트. 문서에 저장된 ID/연결/직접 배치를 변경하지 않고 새 기본 렌더 차이는 위 규칙과 캡처로 기록한다. 초기화는 legacy side override도 제거해 파일 복원 뒤 수동 값이 되살아나지 않는 테스트를 포함한다. |
| F 검사·결과 | 아래 최종 검사 집계와 실제 evidence를 참조한다. |

### 가져올 수 있는 작품 파일

[숲에서 고르는 두 길 · .knolstory](evidence/responsive-audio/branching-demo.knolstory)는 실제 배경·인물·음악·효과음과 등장/이동을 포함한다. 종소리와 밤 음악의 실제 bytes를 함께 보관하며, 별도 브라우저에서 가져와 두 native 엔딩까지 검증했다.

### 화면 증거

- [데스크톱](evidence/responsive-audio/native-desktop.png)
- [세로9:20 미리보기](evidence/responsive-audio/native-portrait.png)
- [실제 휴대폰 세로 표시 영역](evidence/responsive-audio/native-phone-auto.png)
- [휴대폰 가로 읽기 · 전체 표시 폭](evidence/responsive-audio/native-phone-landscape-reading.png)
- [나 시점 · 인물 없는 글상자](evidence/responsive-audio/first-person-text-only.png)
- [실제 엔진 인물 이동 최종 상태](evidence/responsive-audio/actor-motion-final.png)
- [오디오 시작 화면 · 입력 전 음악/효과음/연출 대기](evidence/responsive-audio/audio-start-gate.png)
- [native 음악 위치·오디오 path·엔진 좌표 보고](evidence/responsive-audio/native-verification.json)

### 범위의 한계

실제 Android 하드웨어·스피커 품질·지연 예산과 Safari는 이번 Chrome 브라우저 검증에서 주장하지 않는다. 배경의 자동 인물/중요 지점 인식은 제공하지 않으며 중심과 전체 그림 보이기를 직접 선택한다. 음악의 초 단위 위치 저장은 지원하지 않고 이어읽기의 컷·분기와 원하는 음악 상태를 복원한다. 임의의 audio mixer/구간 편집·무제한 파일·온라인 공유는 이번 목표에 포함하지 않는다. 새로운 확장을 지원하지 않는 구형 편집기의 재저장으로 첨부와 motion이 보존된다고 보장하지 않는다.

### 최종 검사 집계

- TypeScript unit/contract/integration:672개 통과. coverage lines99.81%, statements97.61%, branches94.53%, functions97.92%.
- Host E2E30개와 실제 Ren’Py story E2E14개 통과.25개 skip은 프로젝트별 host/native 중복 제외이며 해당 경로는 다른 프로젝트에서 실행했다.
- 실제 runtime DPR1/1.5/2의3개 추가 E2E 통과.
- 실제 presenter 검증,7효과/2look/3전환 refinement 검증, 동적 화면·오디오·사용자 파일·인물 motion native verifier 통과. actual .rpy helper7개 Python unit 테스트 통과.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, pinned Ren’Py Web build, `git diff --check` 통과.

검증 명령은 `pnpm test:coverage`, `pnpm exec playwright test --project=host --project=stories-runtime`, `pnpm test:e2e:runtime`, `pnpm test:presenter`, `node spikes/renpy-web/verify-presentation-refinement.mjs`, `node spikes/renpy-web/verify-responsive-audio.mjs`, `python3 spikes/renpy-web/presenter-unit-test.py`이다. 브라우저 QA는 지속 dev server를 사용하고 각 실행 출력 폴더를 분리했다.
