# 2026-10-13 공용 CC0 음원 로컬 편입

사용자 결정: GitHub에 정리한 새 음원을 현재 로컬 개발판에 먼저 적용한다. 기존 로컬 음원과 출처·제작자·원본 파일명·설명을 대조한다. 작품 편집에서는 서비스 등록 자료만 선택하며 외부 업로드를 다시 열지 않는다. 기존 작품의 음원·반복·볼륨을 일괄 바꾸거나 추천표를 자동 적용하지 않는다.

## 소스와 중복 판정

고정 소스는 `LUCKYBRIDGE/new-knolstory`의 `chore/cc0-audio-staging-2026-10-13` @ `8ec4c7cda0da51087e8c5ce354648fa9a3b02ced`, release `audio-cc0-staging-2026-10-13-v1`이다. ZIP은 `new-knolstory-cc0-audio-2026-10-13.zip`, 914129933 bytes, SHA256 `255d7662b11c5bbd37c46c7ce8182e25d5ff5f2f95bae6cdb1bc27d3ccb62c43`. 브랜치 전체를 병합하거나 ZIP으로 개발판을 덮어쓰지 않았다.

490개 중 기존61개와 동일한 bytes인21개는 기존 ID에 연결했다. 그중20개는 출처+원본 파일명도 일치하고, 숲 음악1개는 다른 URL이지만 TinyWorlds와 `Forest_Ambience.mp3`가 일치한다. 숲 음악은 자연 녹음으로 분류하지 않는다. 같은 팩의 다른 번호·유사 용도는 중복 확정 근거가 아니므로 보존했다. 비교한530개를 FFmpeg로 완전 디코딩하여 16kHz/stereo/s16 PCM으로 비교했을 때 추가 동일 PCM은0개였다. 이는 서로 다른 편집·손실 압축본의 청취 동등성까지 증명하지 않는다.

추가469개, 공용 선택 목록530개(516 CC0+14 조건부 Pixabay), 별칭23개(기존 중복21+취득 내부 중복2)다. 기존61개의 승인 행·ID·경로·파일 bytes·권리를 보존했다. 새 출처 이름 검색은 기존 canonical 항목을 찾으며 목록에 중복 표시하지 않는다. [편입 manifest](../assets/cc0-staging/integration.json), [출처 비교](evidence/cc0-staging-integration/source-description-comparison.json), [디코딩 비교](evidence/cc0-staging-integration/decoded-comparison.json).

## 구현과 책임

StoryDocument에는 ID와 저작 cue만 저장한다. archive2/StoryDocument7/workbook7/JSONB1을 변경하지 않는다. 원본은 검증한 취득 패키지에 보존하고, 새 runtime 파일은 `/assets/audio/cc0/<pack>/v1/<slug>.ogg|mp3`에 둔다. 새469개는 `delivery=on-demand`이며 공유 시작 ZIP에 포함하지 않는다. 기존61개는 공유 ZIP에 유지한다.

Web host가 현재 RuntimeScene이 참조한 등록 파일만 요청한다. exact bytes/SHA/MIME를 검증하고 선택적인 `serviceAudioResources` 전송 필드로 전달한다. 최대10파일, 파일8MiB, 원본 합계24000000 bytes, 전송 base64 합계32000000자다. 현재 장면 외 Web 요청은 취소·캐시 제거한다. Ren’Py는 참조 경로·SHA·signature·경로 탈출·중복을 재검증하고64MiB LRU에 설치한다. 현재 재생 중인 채널과 지연 cue는 축출하지 않는다. 별도 Web story renderer나 작품별 패키지는 만들지 않는다. [코드](../../apps/web/lib/service-audio-delivery.ts), [native installer](../../renpy/responsive-spike/game/service_audio.py).

새 음원을 명시적으로 선택할 때 반복 기본값은 false다. 기존 cue의 반복·볼륨은 재열기나 매핑 과정에서 수정하지 않는다. 설명과 권장 gain을 보이며 loop 연결부의 전문 청취 승인을 자동 추정하지 않는다. 원음 bytes는 작품 파일/JSONB에 첨부하지 않는다. 기존 저장된 private media 보존 계약과 Pixabay 장면 결합 제한은 그대로다.

## 재현

큰 취득 패키지와 새 runtime 폴더는 Git에서 제외한다. 이 기기의 `.tools/audio-import-2026-10-13/package`에 원본 패키지가 있다. 다른 기기에서는 다음 순서로 복원한다.

1. `gh release download audio-cc0-staging-2026-10-13-v1 --repo LUCKYBRIDGE/new-knolstory --pattern new-knolstory-cc0-audio-2026-10-13.zip --dir .tools/audio-import-2026-10-13`.
2. 위 SHA/크기, ZIP CRC와 경로 안전성을 확인한 뒤 별도 `package` 폴더에 추출한다. 패키지의 `verify_cc0_audio.py`로 source/runtime/출처 evidence를 검증한다(Python3.11+).
3. `python3 scripts/integrate-staged-audio.py --package-root .tools/audio-import-2026-10-13/package`. 기존 파일 hash가 다르면 중단하며 버전 파일을 덮어쓰지 않는다. catalogue/별칭 검색/승인/provenance를 같은 매퍼로 재생성한다.
4. `python3 scripts/media-provenance.py` → `pnpm runtime:build` → `pnpm build` → `pnpm test:service-audio` → `pnpm test:media-provenance` → 관련 unit/native E2E. 실행 중 정적 서버/테스트가 사용하는 출력물을 빌드로 덮지 않는다.

## 검증과 후속

최종 실행 결과는 [검증 기록](cc0-library-integration-validation.md)이 소유한다. package source 검증은490/39 출처, 기존 byte검증61, roundtrip은 추가469+별칭23 모두를 대상으로 한다. 실제 Mac Excel/Google 앱에서 이번 새 파일을 직접 편집한 검증과 물리 Android 청취는 아직 실행하지 않았다.

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| AUDIO-STAGING-LOCAL | 구현·로컬 검증 P1 | 고정 Release, source/hash gate, 단일 presenter | 선택·저장·파일 왕복·재열기·실제 세 채널 재생·편집 복귀 및 기존 권리 보존 |
| AUDIO-LISTENING | 미검증 P2 | 승인 파일과 서비스 기기 | 팩별 대표/반복 후보를 실제 스피커·헤드폰으로 청취하고 loop·음량 metadata를 개별 승인; 기존 cue는 변경하지 않음 |
| AUDIO-DELIVERY-PRODUCTION | 미검증 P1 | 배포 asset 환경·권리 범위·대상 기기 | 느린 망/오프라인/메모리/대용량 cue 실패 복구, 실제 배포 경로와 Pixabay 범위 확인 |
| UX-REGRESSION-NAV | 진행 중 P1 | 최신 compact editor 경로 | 옛 deep-direction 테스트를 현재 경로로 이관하되 순서·시간·반복·취소·전체 파일 보존·native 복귀 조건 유지 |

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
