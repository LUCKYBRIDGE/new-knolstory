# 기본 제공 소리 목록

현재2026-10-13: 총530개(배경음78·주변 소리28·효과음424), CC0 516개와 조건부 장면 결합 Pixabay14개다. 기존61개와 같은 취득 파일21개는 기존 ID에 연결하고469개를 추가했다. [편입·목록 manifest·재현](cc0-library-integration-plan.md), [검증](cc0-library-integration-validation.md), [사용·배포 범위](audio-service-rights.md). 원음의 별도 다운로드 기능은 제공하지 않는다.

아래 직접 제작26개와 hash 기록은 초기 기본 자료 기록으로 보존한다. 기기별 사용자 등록 파일은 포함하지 않는다. 직접 제작26개는 배경음10개, 주변 소리4개, 효과음12개다. 원본ID·실제 파일·길이·SHA-256·디코딩 결과는 [검사 기록](evidence/editor-terminology/audio-inventory.json)에 있다.

기본 자료는 프로젝트에서 합성 제작한 소리다. 비·물·새·문 등도 현장 녹음이 아닌 합성 표현이며, 기존 제작 기록은 전문 믹싱/실제 스피커·헤드폰 청취 승인과 구분한다. 배경음의 분위기는 제목과 제작 의도를 요약한 것이며 사용자 작품에 적합한지는 미리 듣기로 고른다. [제작 기록](../../apps/web/public/assets/audio/story-score/README.md), [초기 네 자료](../../apps/web/public/assets/audio/README.md).

## 배경음

| 이름 | 길이(초) | ID |
|---|---:|---|
| 숲의 아침 · 잔잔한 배경음 | 8.00 | `audio:music:forest` |
| 밤의 길 · 차분한 배경음 | 8.00 | `audio:music:night` |
| 계곡의 평온 | 32.00 | `audio:music:score-calm` |
| 작은 발견 | 32.00 | `audio:music:score-curiosity` |
| 다가오는 위기 | 32.00 | `audio:music:score-tension` |
| 남겨진 마음 | 32.00 | `audio:music:score-loss` |
| 함께하는 온기 | 32.00 | `audio:music:score-warmth` |
| 기이한 징조 | 32.00 | `audio:music:score-mystery` |
| 깊은 물의 길 | 32.00 | `audio:music:score-ocean` |
| 새로운 아침 | 32.00 | `audio:music:score-resolve` |

## 주변 소리

| 이름 | 길이(초) | ID |
|---|---:|---|
| 계곡 물소리 | 24.00 | `audio:music:ambience-stream` |
| 잔잔한 비 | 24.00 | `audio:music:ambience-rain` |
| 숲의 바람과 새 | 24.00 | `audio:music:ambience-forest` |
| 바다의 파도 | 24.00 | `audio:music:ambience-ocean` |

## 효과음

| 이름 | 길이(초) | ID |
|---|---:|---|
| 맑은 종소리 | 1.20 | `audio:sound:chime` |
| 가벼운 발걸음 | 0.50 | `audio:sound:step` |
| 멀리서 울리는 천둥 | 5.00 | `audio:sound:sfx-thunder` |
| 나무 문 여닫기 | 1.80 | `audio:sound:sfx-door` |
| 옷자락 움직임 | 1.20 | `audio:sound:sfx-cloth` |
| 흙길 발걸음 | 2.40 | `audio:sound:sfx-steps` |
| 새의 짧은 울음 | 1.50 | `audio:sound:sfx-bird` |
| 제비의 재잘거림 | 1.80 | `audio:sound:sfx-swallow` |
| 박을 두드리기 | 1.30 | `audio:sound:sfx-gourd` |
| 박이 갈라지는 순간 | 1.40 | `audio:sound:sfx-crack` |
| 물에 들어가는 순간 | 2.00 | `audio:sound:sfx-water` |
| 놀라운 발견 | 2.40 | `audio:sound:sfx-sting` |

## CC0 추가 자료

2026-10-10에 상업 이용과 복사·수정·재배포가 허용된 CC0 자료21개를 등록했다. 한글 이름, 원래 파일명, 제작자, 출처, license, hash는 [카탈로그](../../packages/asset-registry/src/external-cc0-audio.json)와 [검증 기록](evidence/cc0-audio/downloads.json)에 있다.

| 분류 | 수 | 대표 이름 |
|---|---:|---|
| 배경음 | 1 | 숲분위기배경음1 |
| 주변 소리 | 4 | 비소리1-4 |
| 효과음 | 16 | 책여는소리1, 책장넘기는소리1-2, 문여는소리1, 발걸음소리1-2, 동전소리1-2, 냄비소리1-2 등 |

## 추가 준비 판단

현재 주변 소리는 숲·계곡·비·바다 중심이며, CC0 비소리가 추가되었지만 학교·시장·마을·부엌 같은 한국 공간 녹음은 아직 부족하다. 효과음은 책·문·발걸음·동전·냄비 등 생활 동작이 보강되었지만 울음·웃음·노크·달리기·동물·전통 도구 표현은 더 필요하다. 배경음은 직접 제작곡과 숲 분위기 CC0가 있으며, 한국풍 장면 음악은 사용자가 생성·다운로드한 결과와 권리 증거를 확인한 뒤 등록한다.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
