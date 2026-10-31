---
status: open
created: 2026-10-13
from: codex
to: any
scope: apps/new-knolstory
picked_up_by:
picked_up_at:
---

# 다른 로컬의 기존 음원과 CC0 확보본 병합

## 다음 세션의 목적
개발 중인 로컬의 기존 음원과 이번 확보본을 대조하고, 기존 작품의 음원 ID와 이용 조건을 보존하면서 공용 음원 목록을 늘린다.

## 현재 상태
- [확인] 이후 편집용 83개를 추가하여 현재 전체 490개·배경음 66곡·환경음 19개다. `docs/assets/CC0_EDITOR_EXPANSION.md`와 `assets/metadata/audio/cc0-editor-expansion.json`을 참고한다. 기존 작품별 표는 바꾸지 않았다.
- [확인] 앞선 작품용 배경음 6곡 확보 시점에는 전체 407개·BGM 28곡이었다. `docs/assets/CC0_BGM_SUPPLEMENT.md`와 최신 장·컷 표를 초기 제안서보다 우선한다. 모든 컷 범위에 음악 후보가 있으며 무음은 연출 선택으로 남겼다. 정확한 효과음 부족은 계속 비움이다.
- [확인] 음원 확보 상태는 `docs/assets/CC0_AUDIO_GUIDE.md`, 검증 기록은 `docs/assets/CC0_AUDIO_QA.md`에 기록했다.
- [확인] `assets/audio-preview.html` 위쪽에서 BGM과 환경음을 함께 재생하고 각각 볼륨·단독 듣기로 비교할 수 있다. 세 가지 조합의 브라우저 동시 재생을 확인했으며 청취 적합성 판정은 남아 있다.
- [확인] 앱 소스와 기존 `STATUS.md`는 수정하지 않았다. 확보본은 별도 음원 staging 브랜치·Release로 전달하며 앱 런타임에는 등록하지 않았다. GitHub 수납 경로는 `audio-staging/cc0-2026-10-13/`, Release 태그는 `audio-cc0-staging-2026-10-13-v1`이다. 이 문서의 경로는 독립 확보본 폴더를 기준으로 한다.
- [미확인] 다른 개발 로컬의 미커밋 코드와 기존 음원 파일·목록에는 접근하지 못했다.

## 결정과 이유
- 신규 파일은 `assets/*/audio/cc0/`와 `audio.cc0.*` ID 영역에 배치했다. 기존 음원의 파일명이나 ID를 임의로 변경하지 않는다.
- 개별 페이지에서 CC0가 확인되지 않은 후보는 제외했다. `assets/licenses/audio/excluded/`는 제외 근거 자료이며 음원 파일은 없다.
- 장면 설명은 제작자 설명과 파일명에 근거한 활용 후보다. 청취 완료 상태로 오해하지 않는다.

## 먼저 읽을 파일
- `docs/assets/CC0_EDITOR_EXPANSION.md` — 현재 작품에 배정하지 않은 편집용 83개의 종류·한국어 제목·활용·반복·재생 파일·출처.
- `docs/assets/CC0_BGM_SUPPLEMENT.md` — 추가 6곡의 실제 파일·ID·출처·반복 안내. M11~M13의 자동 반복을 보장하지 않는다.
- `docs/assets/CC0_AUDIO_QA.md` — 검증 상태와 남은 확인 사항.
- `docs/assets/CC0_AUDIO_GUIDE.md` — 음원 설명과 병합 비교 명령.
- `docs/assets/STORY_AUDIO_PROPOSAL.md` — legacy 원작·각색 네 작품의 연속 구간 음원 제안. 실제 뉴놀스토리 대본과 대조한 뒤 선곡한다. 미확보 칸은 임의 대체하지 않는다.
- `docs/assets/STORY_AUDIO_TABLES.md` — 작품별 장·컷 범위 음원 표와 모든 실제 장 ID 대응표. 시간·날씨·문 종류를 컷 단위로 확인한 범위를 따른다.
- `docs/assets/story-audio-cue-tables.json` — 텍스트 제안표의 시작·끝 컷 ID와 검증 기록. 실제 StoryDocument나 실행용 오디오 계약이 아니다.
- `docs/assets/story-audio-proposal-evidence.json` — 제안의 깃허브 버전·파일 해시·원작과 각색 장 식별자·음원 ID.
- `assets/CC0_AUDIO_README.md` — 폴더 역할·재실행 방법.
- `assets/metadata/audio/cc0-library.json` — 안정적 신규 ID와 파일·해시·권리 정보.

## 다음 할 일
1. 실제 개발 로컬의 상태를 확인하고 미커밋 작업을 보존한다. Release ZIP의 크기·SHA-256을 첨부 manifest와 비교한 뒤 별도의 빈 `package` 폴더에 푼다. 기존 개발 저장소 루트에 풀거나 기존 파일 위에 덮어쓰지 않는다. 전체 파일 검증 후 필요한 신규 음원만 선택적으로 통합한다.
2. `scripts/compare_cc0_audio.py`로 기존 음원 폴더와 기존 JSON 목록을 읽어 비교한다. 스키마가 다르면 경로 필드 매핑만 조정한다.
3. 동일 바이트의 기존 음원은 기존 ID를 유지하고 신규 ID 별칭 연결을 검토한다. 동일 파일명만으로 중복 처리하지 않는다. 기존 음원 라이선스를 CC0로 변경하지 않는다.
4. 실제 Asset Registry 스키마와 Ren'Py Web 채널에 연결한 뒤 음량·반복·대사 간섭을 확인한다.

## 해 봤지만 안 된 것
- 이 환경의 `story-maker` 로컬에서 음원 확장자 파일을 조사했으나 0개였다. 다른 개발 로컬에서 비교해야 한다.
- CC0 공식 legalcode HTML 저장은 사이트 HTTP 403으로 실패했다. 개별 제작자 배포 페이지와 ZIP 동봉 라이선스는 보관되어 있다.

## 주의
- 라이선스 재점검은 `docs/assets/CC0_LICENSE_AUDIT.md`를 따른다. 490개·39개 자료 모두 저장본/현재 필드 CC0 단독 표기. BY·BY-NC 혼입 없음. 동봉 6개 문서와 해변의 Freesound 원본도 확인했다. 선택적 출처 안내 수집 누락 13건을 보충했고 최초 증거를 보존했다. 다른 개발 로컬의 기존 음원에는 이 결론을 적용하지 않는다.
- 확보용 JSON은 최종 registry의 확정 스키마가 아니다.
- 기존 Asset ID와 원래 권리 조건을 보존한다. 신규 ID를 도입할 때 구버전 작품에 대한 resolver 별칭을 고려한다.
- 기존 공용 문서나 앱 코드를 ZIP 내용으로 통째로 덮어쓰지 않는다.

## 추천 스킬
- `.agents/skills/asset-pipeline/SKILL.md` — ID·원본·재생본·버전 경로 관리.
