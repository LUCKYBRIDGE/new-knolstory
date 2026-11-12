# 뉴놀스토리 CC0 음원 안내

2026-10-13 확보 · 중복 제거 후 **490개** · **39개 배포 자료**

이 문서는 확보한 음원의 종류, 장면 활용 후보, 출처와 병합 방법을 한곳에 정리한 자료입니다. 분위기 설명은 제작자의 설명과 파일명에 근거한 활용 제안이며, 전체 청취 평가를 완료했다는 의미는 아닙니다.

## 바로 들어보기

[검색·분류·청취 목록](../../assets/audio-preview.html)을 브라우저에서 열면 파일을 직접 들을 수 있습니다. 목록은 자동 재생하지 않으며 초기 볼륨은 35%입니다. 제목과 태그로 검색하고, 필요한 분류만 표시할 수 있습니다.

### 배경음과 환경음 함께 비교하기

청취 화면 위쪽에서 배경음 66개와 환경음 19개를 각각 선택해 동시에 재생할 수 있습니다. 마을 음악+새소리, 잔잔한 음악+비, 달밤 음악+폭풍우의 세 가지 조합을 시작점으로 제공합니다. 배경음 22~25%, 환경음 8~12%는 비교용 시작값이며 작품의 최종 믹싱 수치는 아닙니다.

재생 중 **배경음만 듣기 → 환경음만 듣기 → 함께 듣기**를 눌러 비교합니다. 단독 듣기는 한 채널을 음소거하므로 두 소리의 재생 위치는 계속 흐릅니다. 환경음이 멜로디나 대사를 가리는지, 음악의 악기·속도와 장소가 어울리는지, 천둥 같은 순간 소리가 지나치게 튀는지 확인합니다. 환경음 볼륨을 낮춘 상태에서 조금씩 올려 보세요. 두 파일은 각자 반복하며 연결부 청취는 별도로 확인합니다.

목록에서 개별 파일을 재생하면 함께 듣기는 정지합니다. 검색·분류는 함께 듣기를 멈추지 않으며, 모두 정지는 두 채널과 목록 재생을 모두 멈춥니다. 이 화면은 확보한 에셋의 비교용이며 앱 런타임 통합은 별도 작업입니다.

## 확보 현황

| 종류 | 개수 | 찾을 수 있는 소리 |
|---|---:|---|
| 배경음악 | 66 | 동화, 일상, 마을, 카페, 여행, 회상, SF, 어두운 판타지, 칩튠·전자음악 |
| 자연·장소 환경음 | 19 | 비, 천둥, 새, 강물, 바람, 장작불, 해변 파도, 물·기포 |
| 인물 동작·물체 효과음 | 213 | 발걸음, 문, 책, 옷, 동전, 물체, 물튀김·기포·슬라임 질감 |
| 동물 합성 효과음 | 7 | 새, 귀뚜라미, 개구리, 모기 등 합성음 |
| 버튼·선택 효과음 | 100 | 클릭, 확인, 선택, 오류, 화면 조작 |
| 전환·엔딩 음악 | 85 | 선택 결과, 장면 전환, 끝맺음 |

## 사용 전에 알아둘 점

- 모든 신규 음원은 개별 배포 페이지에 CC0가 명시된 파일입니다. 원본 배포 자료와 제작자 표기를 보관했습니다.
- 파일 전체 디코딩과 SHA-256 검사는 통과했습니다. 장면 적합성·잡음·반복 연결부 청취 검토는 남아 있습니다.
- 중세풍 BGM은 한국 전통 악기 음악과 구분합니다. 동물 합성음은 실제 동물 녹음과 구분합니다.
- 반복 가능 표시는 제작자가 안내한 내용입니다. 실제 런타임에서는 연결부와 대사 간섭을 청취 확인합니다.
- 같은 이름이나 같은 분위기만으로 기존 음원을 삭제하지 않습니다. 번호별 변형은 별도 소리이며, 완전히 같은 바이트의 2개 파일만 중복 별칭으로 정리했습니다.
- 게인 제안은 재생 시 적용할 값입니다. 원본 음량을 변경하지 않았으며, 피크가 큰 파일은 추가로 낮추도록 메타데이터에 기록했습니다.

## 기존 로컬 음원과 합치는 방법

새 음원 ID는 `audio.cc0.<출처 묶음>.<파일명>` 형식이고, 재생본은 `assets/runtime/audio/cc0/<출처 묶음>/v1/` 아래에 있습니다. 기존 음원 ID·파일·라이선스는 유지하면서 새 음원만 추가합니다. 기존 작품이 참조하는 ID를 신규 ID로 임의 치환하지 않습니다.

이번 환경의 새 저장소와 로컬 legacy 저장소에서 기존 음원 파일은 발견하지 못했습니다. 개발 중인 다른 로컬의 음원과 실제 중복 비교는 아직 하지 못했습니다. 다음 검사 명령을 그 로컬에서 실행하면 파일 해시·동일 이름·ID 충돌을 보고서로 만들며 기존 파일은 수정하지 않습니다.

```powershell
python scripts/compare_cc0_audio.py --existing-root "기존 음원 또는 기존 프로젝트 폴더" --existing-catalog "기존 음원 JSON 목록" --output "docs/assets/cc0-merge-check.json"
```

기존 JSON 목록이 없으면 `--existing-catalog`를 생략합니다. JSON은 배열 또는 `assets` 배열을 가진 객체를 지원하며, 파일 연결은 `sourcePath`, `runtimePath`, `path`, `src`, `url` 필드를 읽습니다. 다른 스키마면 필드 매핑을 먼저 조정해야 합니다. 동일 바이트는 기존 ID를 보존하고 새 ID를 별칭으로 연결할 후보입니다. 인코딩·편집이 다른 파일은 해시가 달라 청취나 오디오 지문 비교가 추가로 필요합니다. 기존 음원의 이용 조건을 신규 CC0로 바꾸지 않습니다.

## 곡별·파일별 설명

표의 길이는 실제 재생 파일에서 읽었습니다. 파일명을 함께 표시하므로 별도 로컬의 음원과 대조하기 쉽습니다. 효과음 설명은 파일명과 묶음 분류에 근거한 용도 안내입니다.

### 배경음악

| 이름 · 원본 파일 | 길이 | 설명 | 출처 |
|---|---:|---|---|
| 옛날 옛적에 · once_upon_a_time_loop | 57.6초 | 동화 분위기의 피아노·오케스트라 음악. 이야기의 도입이나 밝은 장면에 활용할 후보입니다. | [TAD](https://opengameart.org/content/once-upon-a-time-loop) |
| 평화로운 옛 마을 · Loop_The_Bards_Tale | 57.7초 | 류트·플루트 중심의 중세풍 음악. 평화로운 마을과 옛이야기 도입에 활용할 후보입니다. | [RandomMind](https://opengameart.org/content/medieval-the-bards-tale) |
| 오래된 여관 · Loop_The_Old_Tower_Inn | 50.0초 | 중세풍 여관을 배경으로 한 음악. 마을에서 쉬거나 인물들이 대화하는 장면에 활용할 후보입니다. | [RandomMind](https://opengameart.org/content/medieval-the-old-tower-inn) |
| 즐거운 장터 · Loop_Market_Day | 64.9초 | 밝은 중세풍 장터 음악. 장날이나 활기찬 마을 장면에 활용할 후보입니다. | [RandomMind](https://opengameart.org/content/medieval-market-day) |
| 마을 축제 · Loop_Minstrel_Dance_0 | 56.3초 | 경쾌한 중세풍 춤 음악. 축제나 즐거운 결말에 활용할 후보입니다. | [RandomMind](https://opengameart.org/content/medieval-minstrel-dance) |
| 달이 떠오르는 밤 · Rising_Moon_0 | 224.7초 | 바람 부는 밤을 위한 판타지 음악. 달밤이나 신비로운 장소에 활용할 후보입니다. | [RandomMind](https://opengameart.org/content/fantasy-rising-moon) |
| 신비로운 숲의 음악 · Forest_Ambience | 44.7초 | 숲을 소재로 한 잔잔한 배경음악입니다. 자연 새소리 녹음과 구분하여 숲속 탐험 장면에 활용합니다. | [TinyWorlds](https://opengameart.org/content/forest-ambience) |
| 새로운 아침 · New Sunrise | 136.7초 | 영화 장면을 위해 제작자가 작곡한 음악입니다. 새 출발이나 아침 장면에 활용할 후보입니다. | [nene](https://opengameart.org/content/new-sunrise) |
| 긴박한 추격 · determined_pursuit_loop | 108.0초 | 빠른 현악·호른·드럼이 있는 긴박한 오케스트라 반복 음악. 추격이나 시간에 쫓기는 장면에 활용할 후보입니다. | [Emma_MA](https://opengameart.org/content/determined-pursuit-epic-orchestra-loop) |
| 보물을 찾아서 · treasure_hunter_0 | 65.1초 | 단순한 오케스트라 반복 음악. 보물 찾기나 모험 장면에 활용할 후보입니다. | [TAD](https://opengameart.org/content/treasure-hunter) |
| 내가 집이라 부르는 곳 · Calm1 - A Place I Call Home | 46.5초 | 잔잔한 RPG용 반복 음악입니다. 인물의 대화·휴식·일상 장면에 활용할 후보입니다. 개별 곡명의 한국어 의미는 아래 제목에 반영했습니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-4-calm) |
| 어린 시절 친구들 · Calm2 - Childhood Friends | 102.9초 | 잔잔한 RPG용 반복 음악입니다. 인물의 대화·휴식·일상 장면에 활용할 후보입니다. 개별 곡명의 한국어 의미는 아래 제목에 반영했습니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-4-calm) |
| 평화로운 날들 · Calm3 - Peaceful Days | 64.0초 | 잔잔한 RPG용 반복 음악입니다. 인물의 대화·휴식·일상 장면에 활용할 후보입니다. 개별 곡명의 한국어 의미는 아래 제목에 반영했습니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-4-calm) |
| 모래성 · Calm4 - Sand Castles | 71.1초 | 잔잔한 RPG용 반복 음악입니다. 인물의 대화·휴식·일상 장면에 활용할 후보입니다. 개별 곡명의 한국어 의미는 아래 제목에 반영했습니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-4-calm) |
| 여름의 추억 · Calm5 - Summer Memories | 65.5초 | 잔잔한 RPG용 반복 음악입니다. 인물의 대화·휴식·일상 장면에 활용할 후보입니다. 개별 곡명의 한국어 의미는 아래 제목에 반영했습니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-4-calm) |
| 순수한 마음 · Calm6 - Innocence | 71.1초 | 잔잔한 RPG용 반복 음악입니다. 인물의 대화·휴식·일상 장면에 활용할 후보입니다. 개별 곡명의 한국어 의미는 아래 제목에 반영했습니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-4-calm) |
| 마음을 전하는 피아노 · pianoemo139_0 | 204.7초 | 부드러운 피아노 독주곡. 회상이나 마음을 전하는 장면에 활용할 후보입니다. | [Tozan](https://opengameart.org/content/piano-emotional-solo-139) |
| 첫 빛과 꿈 · first_light_particles_0 | 131.7초 | 부드러운 피아노와 앰비언트 패드 중심의 음악. 꿈·첫 빛·회상·조용한 탐험 장면에 활용할 후보입니다. | [Yoiyami](https://opengameart.org/content/first-light-particles-%E2%80%93-cc0-atmospheric-pianoambient-track) |
| 노을 지는 들판 · sunset_plains | 329.7초 | 부드러운 기타·패드·선율의 차분한 음악. 들판이나 조용한 풍경, 인물의 생각을 표현할 후보입니다. | [Yoiyami](https://opengameart.org/content/sunset-plains) |
| 학교의 하루 · SchoolDay | 85.3초 | 학교와 추억을 소재로 한 피아노 배경음악입니다. 원곡·비 효과 포함·맑은 날 효과 포함 버전이 있습니다. 이 파일은 기본 버전입니다. | [KiluaBoy](https://opengameart.org/content/school-day-rain-sun-loop) |
| 학교의 하루 · SchoolDayRain | 85.3초 | 학교와 추억을 소재로 한 피아노 배경음악입니다. 원곡·비 효과 포함·맑은 날 효과 포함 버전이 있습니다. 이 파일은 비 효과 포함 버전입니다. | [KiluaBoy](https://opengameart.org/content/school-day-rain-sun-loop) |
| 학교의 하루 · SchoolDaySun | 85.3초 | 학교와 추억을 소재로 한 피아노 배경음악입니다. 원곡·비 효과 포함·맑은 날 효과 포함 버전이 있습니다. 이 파일은 맑은 날 효과 포함 버전입니다. | [KiluaBoy](https://opengameart.org/content/school-day-rain-sun-loop) |
| 물속의 신비 · TylerSong3_Normal | 44.0초 | 제작자가 수중 분위기와 정확한 반복 지점을 안내한 앰비언트 음악입니다. 용궁·바닷속 풍경의 후보이며 실제 물소리 녹음은 아닙니다. | [cynicmusic](https://opengameart.org/content/aquaria) |
| 물길을 따라 탐색 · Exploration Theme | 134.4초 | 제작자가 신스·피아노와 은은한 수중 느낌, 연속 반복을 안내한 음악입니다. 별주부의 물길 이동·탐색에 활용할 후보입니다. | [CleytonKauffman](https://opengameart.org/content/exploration-theme) |
| 오래된 비밀 · ancient_mysteries | 120.0초 | 제작자가 신비로운 선율과 긴장 분위기를 안내한 반복 음악입니다. 도술·비밀·의심의 후보이며 국악이나 전통 궁중음악은 아닙니다. | [sperrylion](https://opengameart.org/content/ancient-mysteries) |
| 불안과 긴장 · Komiku - It's time for adventure vol 2 - 12 Tension_0 | 201.0초 | 제작자가 RPG의 불안·긴장으로 분류한 음악입니다. 욕심·대립·협상에 낮게 깔 후보이며 강한 부분은 청취 후 조정합니다. 반복 연결은 보장되지 않습니다. | [Loyalty Freak Music](https://opengameart.org/content/tension) |
| 쓸쓸한 생활 · softpiano8 | 122.7초 | 제작자가 부드럽고 슬픈 피아노로 설명한 곡입니다. 곤궁한 생활·소외·겨울 장면에 낮게 깔 후보입니다. 반복 연결은 보장되지 않습니다. | [Tozan](https://opengameart.org/content/pianosoft8) |
| 그리움과 고백 · emotional_piano_solo_0 | 76.8초 | 제작자가 느리고 감성적인 곡의 피아노 독주 버전으로 공개한 파일입니다. 그리움·고백·뒤늦은 후회에 활용할 후보입니다. 반복 연결은 보장되지 않습니다. | [Centurion_of_war](https://opengameart.org/content/emotional-piano-0) |
| 전자음악과 미래 장면 · 3xBlast - 1001 Serum Patches | 109.3초 | 제작자가 여러 스타일을 모아 반복용으로 렌더링한 음악입니다. 제목 소재를 참고한 후보: 전자음악과 미래 장면. 실제 감정·악기·속도와 장면 적합성은 청취 후 결정합니다. | [3xBlast](https://opengameart.org/content/3xblast-free-music-pack-15-songs) |
| 전자 리듬과 활동 · 3xBlast - 4xTheFloor | 12.8초 | 제작자가 여러 스타일을 모아 반복용으로 렌더링한 음악입니다. 제목 소재를 참고한 후보: 전자 리듬과 활동. 실제 감정·악기·속도와 장면 적합성은 청취 후 결정합니다. 20초 미만의 짧은 반복 소재이므로 장편 곡과 구분해 선택합니다. | [3xBlast](https://opengameart.org/content/3xblast-free-music-pack-15-songs) |
| 뒤쪽의 낯선 기척 · 3xBlast - Behind You | 57.6초 | 제작자가 여러 스타일을 모아 반복용으로 렌더링한 음악입니다. 제목 소재를 참고한 후보: 뒤쪽의 낯선 기척. 실제 감정·악기·속도와 장면 적합성은 청취 후 결정합니다. | [3xBlast](https://opengameart.org/content/3xblast-free-music-pack-15-songs) |
| 자유로운 여행 · 3xBlast - Free as a Bird | 64.0초 | 제작자가 여러 스타일을 모아 반복용으로 렌더링한 음악입니다. 제목 소재를 참고한 후보: 자유로운 여행. 실제 감정·악기·속도와 장면 적합성은 청취 후 결정합니다. | [3xBlast](https://opengameart.org/content/3xblast-free-music-pack-15-songs) |
| 카페에서 일하는 하루 · 3xBlast - I Work in a Cafe Part-Time | 64.0초 | 제작자가 여러 스타일을 모아 반복용으로 렌더링한 음악입니다. 제목 소재를 참고한 후보: 카페에서 일하는 하루. 실제 감정·악기·속도와 장면 적합성은 청취 후 결정합니다. | [3xBlast](https://opengameart.org/content/3xblast-free-music-pack-15-songs) |
| 대결과 게임풍 모험 · 3xBlast - I'll Blast You To Next Week | 82.2초 | 제작자가 여러 스타일을 모아 반복용으로 렌더링한 음악입니다. 제목 소재를 참고한 후보: 대결과 게임풍 모험. 실제 감정·악기·속도와 장면 적합성은 청취 후 결정합니다. | [3xBlast](https://opengameart.org/content/3xblast-free-music-pack-15-songs) |
| 자전거로 학교 가기 · 3xBlast - I'm Biking to School | 9.0초 | 제작자가 여러 스타일을 모아 반복용으로 렌더링한 음악입니다. 제목 소재를 참고한 후보: 자전거로 학교 가기. 실제 감정·악기·속도와 장면 적합성은 청취 후 결정합니다. 20초 미만의 짧은 반복 소재이므로 장편 곡과 구분해 선택합니다. | [3xBlast](https://opengameart.org/content/3xblast-free-music-pack-15-songs) |
| 신스 음악의 장면 · 3xBlast - Just Add Synths | 13.7초 | 제작자가 여러 스타일을 모아 반복용으로 렌더링한 음악입니다. 제목 소재를 참고한 후보: 신스 음악의 장면. 실제 감정·악기·속도와 장면 적합성은 청취 후 결정합니다. 20초 미만의 짧은 반복 소재이므로 장편 곡과 구분해 선택합니다. | [3xBlast](https://opengameart.org/content/3xblast-free-music-pack-15-songs) |
| 자동화와 미래 · 3xBlast - Now That's Automation v54 | 72.5초 | 제작자가 여러 스타일을 모아 반복용으로 렌더링한 음악입니다. 제목 소재를 참고한 후보: 자동화와 미래. 실제 감정·악기·속도와 장면 적합성은 청취 후 결정합니다. | [3xBlast](https://opengameart.org/content/3xblast-free-music-pack-15-songs) |
| 활기찬 등굣길 · 3xBlast - Skate Fast, Stay in School | 22.9초 | 제작자가 여러 스타일을 모아 반복용으로 렌더링한 음악입니다. 제목 소재를 참고한 후보: 활기찬 등굣길. 실제 감정·악기·속도와 장면 적합성은 청취 후 결정합니다. | [3xBlast](https://opengameart.org/content/3xblast-free-music-pack-15-songs) |
| 전자 리듬의 장면 · 3xBlast - Snare to the Left | 123.4초 | 제작자가 여러 스타일을 모아 반복용으로 렌더링한 음악입니다. 제목 소재를 참고한 후보: 전자 리듬의 장면. 실제 감정·악기·속도와 장면 적합성은 청취 후 결정합니다. | [3xBlast](https://opengameart.org/content/3xblast-free-music-pack-15-songs) |
| 학교의 비밀 · 3xBlast - Spy in the Skool | 114.3초 | 제작자가 여러 스타일을 모아 반복용으로 렌더링한 음악입니다. 제목 소재를 참고한 후보: 학교의 비밀. 실제 감정·악기·속도와 장면 적합성은 청취 후 결정합니다. | [3xBlast](https://opengameart.org/content/3xblast-free-music-pack-15-songs) |
| 희망이 섞인 슬픔 · 3xBlast - That Optimisticly Sad Part | 22.7초 | 제작자가 여러 스타일을 모아 반복용으로 렌더링한 음악입니다. 제목 소재를 참고한 후보: 희망이 섞인 슬픔. 실제 감정·악기·속도와 장면 적합성은 청취 후 결정합니다. | [3xBlast](https://opengameart.org/content/3xblast-free-music-pack-15-songs) |
| 친구들이 해 주는 일 · 3xBlast - That's What Friends Do | 86.7초 | 제작자가 여러 스타일을 모아 반복용으로 렌더링한 음악입니다. 제목 소재를 참고한 후보: 친구들이 해 주는 일. 실제 감정·악기·속도와 장면 적합성은 청취 후 결정합니다. | [3xBlast](https://opengameart.org/content/3xblast-free-music-pack-15-songs) |
| 슬픈 장면 · 3xBlast - The Sad Part | 42.7초 | 제작자가 여러 스타일을 모아 반복용으로 렌더링한 음악입니다. 제목 소재를 참고한 후보: 슬픈 장면. 실제 감정·악기·속도와 장면 적합성은 청취 후 결정합니다. | [3xBlast](https://opengameart.org/content/3xblast-free-music-pack-15-songs) |
| 햇살 비치는 해안 · Town3 - Sunshine Coast | 112.3초 | 마을·시장·휴식·인물의 일상 대화를 위한 게임풍 음악 후보입니다. 한국 전통 음악으로 분류하지 않습니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-2-towns) |
| 활기찬 시장 · Town4 - Bazaar | 110.3초 | 마을·시장·휴식·인물의 일상 대화를 위한 게임풍 음악 후보입니다. 한국 전통 음악으로 분류하지 않습니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-2-towns) |
| 고향 마을 · Town1 - Home Town | 90.0초 | 마을·시장·휴식·인물의 일상 대화를 위한 게임풍 음악 후보입니다. 한국 전통 음악으로 분류하지 않습니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-2-towns) |
| 시간이 멈춘 마을 · Town2 - Where Time Stands Still | 75.5초 | 마을·시장·휴식·인물의 일상 대화를 위한 게임풍 음악 후보입니다. 한국 전통 음악으로 분류하지 않습니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-2-towns) |
| 초원 탐험 · Exploration1 - Grasslands | 71.5초 | 초원·기지·광산·밤·잠입·섬을 소재로 한 탐험 음악입니다. 파일명에 맞는 장소·여행 장면에서 비교합니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-1-exploration) |
| 비밀 기지 · Exploration2 - Military Base | 88.6초 | 초원·기지·광산·밤·잠입·섬을 소재로 한 탐험 음악입니다. 파일명에 맞는 장소·여행 장면에서 비교합니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-1-exploration) |
| 광산 탐험 · Exploration3 - Tha'el Mines | 60.0초 | 초원·기지·광산·밤·잠입·섬을 소재로 한 탐험 음악입니다. 파일명에 맞는 장소·여행 장면에서 비교합니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-1-exploration) |
| 초원의 밤 · Exploration4 - Prairie Nights | 92.9초 | 초원·기지·광산·밤·잠입·섬을 소재로 한 탐험 음악입니다. 파일명에 맞는 장소·여행 장면에서 비교합니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-1-exploration) |
| 조심스러운 잠입 · Exploration5 - Sneaking Around | 92.0초 | 초원·기지·광산·밤·잠입·섬을 소재로 한 탐험 음악입니다. 파일명에 맞는 장소·여행 장면에서 비교합니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-1-exploration) |
| 열대 섬 · Exploration6 - Tropical Island | 53.3초 | 초원·기지·광산·밤·잠입·섬을 소재로 한 탐험 음악입니다. 파일명에 맞는 장소·여행 장면에서 비교합니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-1-exploration) |
| 오래된 악의 깨어남 · Evil1 - Ancient Evil Awakens | 92.9초 | 지하 묘지·마녀·악의 등장 등 어두운 판타지 후보입니다. 인물 대사를 압도하는지 청취 후 선택합니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-3-evil) |
| 지하 묘지 · Evil2 - Catacombs | 81.0초 | 지하 묘지·마녀·악의 등장 등 어두운 판타지 후보입니다. 인물 대사를 압도하는지 청취 후 선택합니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-3-evil) |
| 위기의 세계 · Evil3 - Apocalypse | 58.5초 | 지하 묘지·마녀·악의 등장 등 어두운 판타지 후보입니다. 인물 대사를 압도하는지 청취 후 선택합니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-3-evil) |
| 마녀의 은신처 · Evil4 - Witch's Lair | 80.0초 | 지하 묘지·마녀·악의 등장 등 어두운 판타지 후보입니다. 인물 대사를 압도하는지 청취 후 선택합니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-3-evil) |
| 저편에서 들리는 속삭임 · Evil5 - Whispers From Beyond | 81.1초 | 지하 묘지·마녀·악의 등장 등 어두운 판타지 후보입니다. 인물 대사를 압도하는지 청취 후 선택합니다. | [SubspaceAudio](https://opengameart.org/content/jrpg-pack-3-evil) |
| 상점 음악의 라디오 버전 · Buy Something! (Radio Edit) | 88.0초 | 보사노바 느낌의 상점·카페·가벼운 일상 음악입니다. Radio Edit는 스피커에서 들리는 듯한 별도 음색 버전으로, 기본판과 중복 파일이 아닙니다. | [CleytonKauffman](https://opengameart.org/content/shop-theme) |
| 상점에서 잠시 쉬기 · Buy Something! | 88.0초 | 보사노바 느낌의 상점·카페·가벼운 일상 음악입니다. Radio Edit는 스피커에서 들리는 듯한 별도 음색 버전으로, 기본판과 중복 파일이 아닙니다. | [CleytonKauffman](https://opengameart.org/content/shop-theme) |
| 가벼운 보사노바 · 8bit Bossa | 59.6초 | 보사노바와 게임풍 음색을 결합한 음악입니다. 카페·쉬는 시간·가벼운 대화에 비교할 후보입니다. | [Joth](https://opengameart.org/content/bossa-nova) |
| 낯선 진실 · The Surreal Truth | 58.9초 | 제작자가 약 1분 반복용으로 안내한 어두운 SF 음악입니다. 우주선·제어실·미지의 장소에 쓰는 음악이며 실제 기계실 녹음은 아닙니다. | [Joth](https://opengameart.org/content/ambience-pack-1-sci-fi-horror) |
| 위험한 제어실 · Infestation in the Control Room | 47.6초 | 제작자가 약 1분 반복용으로 안내한 어두운 SF 음악입니다. 우주선·제어실·미지의 장소에 쓰는 음악이며 실제 기계실 녹음은 아닙니다. | [Joth](https://opengameart.org/content/ambience-pack-1-sci-fi-horror) |
| 마지막 항해 기록 · Final Captain's Log | 58.9초 | 제작자가 약 1분 반복용으로 안내한 어두운 SF 음악입니다. 우주선·제어실·미지의 장소에 쓰는 음악이며 실제 기계실 녹음은 아닙니다. | [Joth](https://opengameart.org/content/ambience-pack-1-sci-fi-horror) |
| 어두운 깊은 곳 · The Depths of Hell | 59.1초 | 제작자가 약 1분 반복용으로 안내한 어두운 SF 음악입니다. 우주선·제어실·미지의 장소에 쓰는 음악이며 실제 기계실 녹음은 아닙니다. | [Joth](https://opengameart.org/content/ambience-pack-1-sci-fi-horror) |
| 정체불명의 생물 · Cage of the Cryptid | 58.9초 | 제작자가 약 1분 반복용으로 안내한 어두운 SF 음악입니다. 우주선·제어실·미지의 장소에 쓰는 음악이며 실제 기계실 녹음은 아닙니다. | [Joth](https://opengameart.org/content/ambience-pack-1-sci-fi-horror) |

### 자연·장소 환경음

| 이름 · 원본 파일 | 길이 | 설명 | 출처 |
|---|---:|---|---|
| 비 내리는 장면 · 1 | 27.0초 | 25~45초 길이의 반복 가능한 비 소리 녹음 묶음입니다. 비가 오는 창밖이나 날씨 장면에 활용할 후보입니다. | [Ylmir](https://opengameart.org/content/rain-loopable) |
| 비 내리는 장면 · 2 | 26.0초 | 25~45초 길이의 반복 가능한 비 소리 녹음 묶음입니다. 비가 오는 창밖이나 날씨 장면에 활용할 후보입니다. | [Ylmir](https://opengameart.org/content/rain-loopable) |
| 비 내리는 장면 · 3 | 45.0초 | 25~45초 길이의 반복 가능한 비 소리 녹음 묶음입니다. 비가 오는 창밖이나 날씨 장면에 활용할 후보입니다. | [Ylmir](https://opengameart.org/content/rain-loopable) |
| 비 내리는 장면 · 4 | 37.5초 | 25~45초 길이의 반복 가능한 비 소리 녹음 묶음입니다. 비가 오는 창밖이나 날씨 장면에 활용할 후보입니다. | [Ylmir](https://opengameart.org/content/rain-loopable) |
| 비와 천둥이 치는 밤 · Dark_Rainy_Night(ambience) | 278.8초 | 비와 천둥이 있는 어두운 밤 분위기의 환경음. 폭풍우나 긴장감 있는 야외 장면에 활용할 후보입니다. | [kindland](https://opengameart.org/content/rain-and-thunders) |
| 자연 풍경 · park_ambience_birds | 448.9초 | 호주 애들레이드 공원에서 겨울에 녹음한 환경음입니다. 새·작은 강과 낙차·넓은 들판의 바람을 각각 담았습니다. 이 파일은 새와 나무 주변 소리입니다. | [Thimras](https://opengameart.org/content/park-ambiences) |
| 자연 풍경 · park_ambience_river | 516.0초 | 호주 애들레이드 공원에서 겨울에 녹음한 환경음입니다. 새·작은 강과 낙차·넓은 들판의 바람을 각각 담았습니다. 이 파일은 작은 강과 물의 낙차 소리입니다. | [Thimras](https://opengameart.org/content/park-ambiences) |
| 자연 풍경 · park_ambience_wind | 256.8초 | 호주 애들레이드 공원에서 겨울에 녹음한 환경음입니다. 새·작은 강과 낙차·넓은 들판의 바람을 각각 담았습니다. 이 파일은 들판의 바람 소리입니다. | [Thimras](https://opengameart.org/content/park-ambiences) |
| 편집용 벽난로의 장작불 · fire | 29.3초 | 장작이 타는 벽난로 환경음입니다. 실내 난롯가·야영 장면에서 거리와 음량을 조절할 후보입니다. | [PagDev](https://opengameart.org/content/fireplace-sound-loop) |
| 편집용 해변 파도 · wave_01_cc0-18363__jasinski__alkaibeach | 4.0초 | 해변 파도 녹음에서 추출한 짧은 변형입니다. 바닷가용이며 수중이나 작은 강 소리로 분류하지 않습니다. 장편 연속 반복은 보장되지 않습니다. | [jasinski (Submitted by qubodup )](https://opengameart.org/content/beach-ocean-waves) |
| 편집용 해변 파도 · wave_02_cc0-18363__jasinski__alkaibeach | 2.5초 | 해변 파도 녹음에서 추출한 짧은 변형입니다. 바닷가용이며 수중이나 작은 강 소리로 분류하지 않습니다. 장편 연속 반복은 보장되지 않습니다. | [jasinski (Submitted by qubodup )](https://opengameart.org/content/beach-ocean-waves) |
| 편집용 해변 파도 · wave_03_cc0-18363__jasinski__alkaibeach | 2.2초 | 해변 파도 녹음에서 추출한 짧은 변형입니다. 바닷가용이며 수중이나 작은 강 소리로 분류하지 않습니다. 장편 연속 반복은 보장되지 않습니다. | [jasinski (Submitted by qubodup )](https://opengameart.org/content/beach-ocean-waves) |
| 편집용 해변 파도 · wave_04_cc0-18363__jasinski__alkaibeach | 3.5초 | 해변 파도 녹음에서 추출한 짧은 변형입니다. 바닷가용이며 수중이나 작은 강 소리로 분류하지 않습니다. 장편 연속 반복은 보장되지 않습니다. | [jasinski (Submitted by qubodup )](https://opengameart.org/content/beach-ocean-waves) |
| 편집용 기포 반복 환경음 · loop_bubbles_1 | 4.4초 | 기포의 반복 환경음 후보입니다. 대사 아래에서 작게 깔고 연결부는 청취 확인합니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 기포 반복 환경음 · loop_bubbles_02 | 7.3초 | 기포의 반복 환경음 후보입니다. 대사 아래에서 작게 깔고 연결부는 청취 확인합니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 비 반복 환경음 · loop_rain | 6.8초 | 비의 반복 환경음 후보입니다. 대사 아래에서 작게 깔고 연결부는 청취 확인합니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 반복 환경음 · loop_water_01 | 3.4초 | 물의 반복 환경음 후보입니다. 대사 아래에서 작게 깔고 연결부는 청취 확인합니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 반복 환경음 · loop_water_02 | 7.0초 | 물의 반복 환경음 후보입니다. 대사 아래에서 작게 깔고 연결부는 청취 확인합니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 반복 환경음 · loop_water_03 | 3.5초 | 물의 반복 환경음 후보입니다. 대사 아래에서 작게 깔고 연결부는 청취 확인합니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |

### 인물 동작·물체 효과음

| 이름 · 원본 파일 | 길이 | 설명 | 출처 |
|---|---:|---|---|
| 발걸음과 이야기 동작 · beltHandle1 | 277ms | 허리띠를 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · beltHandle2 | 477ms | 허리띠를 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · bookClose | 231ms | 책을 덮는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · bookFlip1 | 769ms | 책장을 넘기는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · bookFlip2 | 430ms | 책장을 넘기는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · bookFlip3 | 231ms | 책장을 넘기는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · bookOpen | 154ms | 책을 여는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · bookPlace1 | 277ms | 책을 내려놓는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · bookPlace2 | 354ms | 책을 내려놓는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · bookPlace3 | 261ms | 책을 내려놓는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · chop | 240ms | 내리치는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · cloth1 | 661ms | 옷이나 천을 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · cloth2 | 415ms | 옷이나 천을 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · cloth3 | 477ms | 옷이나 천을 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · cloth4 | 384ms | 옷이나 천을 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · clothBelt | 722ms | 옷이나 천을 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · clothBelt2 | 753ms | 옷이나 천을 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · creak1 | 661ms | 삐걱이는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · creak2 | 830ms | 삐걱이는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · creak3 | 338ms | 삐걱이는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · doorClose_1 | 675ms | 문을 닫는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · doorClose_2 | 612ms | 문을 닫는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · doorClose_3 | 714ms | 문을 닫는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · doorClose_4 | 603ms | 문을 닫는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · doorOpen_1 | 919ms | 문을 여는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · doorOpen_2 | 1.4초 | 문을 여는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · drawKnife1 | 400ms | 칼을 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · drawKnife2 | 446ms | 칼을 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · drawKnife3 | 477ms | 칼을 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · dropLeather | 415ms | 가죽 물건을 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · footstep00 | 249ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · footstep01 | 282ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · footstep02 | 242ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · footstep03 | 269ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · footstep04 | 323ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · footstep05 | 276ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · footstep06 | 242ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · footstep07 | 256ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · footstep08 | 256ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · footstep09 | 215ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · handleCoins | 846ms | 동전을 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · handleCoins2 | 338ms | 동전을 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · handleSmallLeather | 338ms | 가죽 물건을 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · handleSmallLeather2 | 308ms | 가죽 물건을 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · knifeSlice | 600ms | 칼을 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · knifeSlice2 | 569ms | 칼을 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · metalClick | 446ms | 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · metalLatch | 261ms | 금속 걸쇠를 조작하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · metalPot1 | 1.5초 | 금속 냄비를 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · metalPot2 | 938ms | 금속 냄비를 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 발걸음과 이야기 동작 · metalPot3 | 907ms | 금속 냄비를 다루는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/rpg-audio) |
| 물체와 충돌 · footstep_carpet_000 | 145ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_carpet_001 | 145ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_carpet_003 | 145ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_concrete_000 | 106ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_concrete_001 | 108ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_concrete_002 | 113ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_concrete_003 | 110ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_concrete_004 | 114ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_grass_000 | 778ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_grass_001 | 674ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_grass_002 | 692ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_grass_003 | 669ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_grass_004 | 590ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_snow_000 | 374ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_snow_001 | 374ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_snow_002 | 374ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_snow_003 | 374ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_snow_004 | 374ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_wood_000 | 250ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_wood_001 | 252ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_wood_002 | 251ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_wood_003 | 252ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · footstep_wood_004 | 248ms | 걷거나 이동하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactBell_heavy_000 | 1.5초 | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactBell_heavy_001 | 1.7초 | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactBell_heavy_002 | 697ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactBell_heavy_003 | 654ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactBell_heavy_004 | 302ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGeneric_light_000 | 139ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGeneric_light_001 | 118ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGeneric_light_002 | 140ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGeneric_light_003 | 138ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGeneric_light_004 | 140ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGlass_heavy_000 | 241ms | 유리가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGlass_heavy_001 | 429ms | 유리가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGlass_heavy_002 | 247ms | 유리가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGlass_heavy_003 | 172ms | 유리가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGlass_heavy_004 | 399ms | 유리가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGlass_light_000 | 210ms | 유리가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGlass_light_001 | 210ms | 유리가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGlass_light_002 | 210ms | 유리가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGlass_light_003 | 210ms | 유리가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGlass_light_004 | 210ms | 유리가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGlass_medium_000 | 543ms | 유리가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGlass_medium_001 | 543ms | 유리가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGlass_medium_002 | 543ms | 유리가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGlass_medium_003 | 543ms | 유리가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactGlass_medium_004 | 543ms | 유리가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMetal_heavy_000 | 168ms | 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMetal_heavy_001 | 359ms | 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMetal_heavy_002 | 117ms | 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMetal_heavy_003 | 207ms | 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMetal_heavy_004 | 134ms | 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMetal_light_000 | 352ms | 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMetal_light_001 | 252ms | 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMetal_light_002 | 236ms | 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMetal_light_003 | 482ms | 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMetal_light_004 | 213ms | 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMetal_medium_000 | 272ms | 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMetal_medium_001 | 143ms | 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMetal_medium_002 | 119ms | 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMetal_medium_003 | 254ms | 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMetal_medium_004 | 109ms | 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMining_000 | 937ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMining_001 | 869ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMining_002 | 805ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMining_003 | 992ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactMining_004 | 830ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlank_medium_000 | 779ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlank_medium_001 | 779ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlank_medium_002 | 779ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlank_medium_003 | 779ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlank_medium_004 | 779ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlate_heavy_000 | 489ms | 접시가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlate_heavy_001 | 352ms | 접시가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlate_heavy_002 | 494ms | 접시가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlate_heavy_003 | 347ms | 접시가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlate_heavy_004 | 559ms | 접시가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlate_light_000 | 542ms | 접시가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlate_light_001 | 655ms | 접시가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlate_light_002 | 489ms | 접시가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlate_light_003 | 528ms | 접시가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlate_light_004 | 657ms | 접시가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlate_medium_000 | 609ms | 접시가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlate_medium_001 | 616ms | 접시가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlate_medium_002 | 515ms | 접시가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlate_medium_003 | 654ms | 접시가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPlate_medium_004 | 534ms | 접시가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPunch_heavy_000 | 649ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPunch_heavy_001 | 536ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPunch_heavy_002 | 458ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPunch_heavy_003 | 474ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPunch_heavy_004 | 536ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPunch_medium_000 | 430ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPunch_medium_001 | 405ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPunch_medium_002 | 541ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPunch_medium_003 | 455ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactPunch_medium_004 | 543ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactSoft_heavy_000 | 505ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactSoft_heavy_001 | 572ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactSoft_heavy_002 | 572ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactSoft_heavy_003 | 544ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactSoft_heavy_004 | 501ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactSoft_medium_000 | 118ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactSoft_medium_001 | 183ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactSoft_medium_002 | 135ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactSoft_medium_003 | 140ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactSoft_medium_004 | 147ms | 물체나 인물의 움직임을 표현하는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactTin_medium_000 | 159ms | 얇은 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactTin_medium_001 | 174ms | 얇은 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactTin_medium_002 | 134ms | 얇은 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactTin_medium_003 | 215ms | 얇은 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactTin_medium_004 | 178ms | 얇은 금속 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactWood_heavy_000 | 313ms | 나무 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactWood_heavy_001 | 313ms | 나무 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactWood_heavy_002 | 313ms | 나무 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactWood_heavy_003 | 313ms | 나무 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactWood_heavy_004 | 313ms | 나무 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactWood_light_000 | 266ms | 나무 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactWood_light_001 | 266ms | 나무 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactWood_light_002 | 266ms | 나무 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactWood_light_003 | 266ms | 나무 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactWood_light_004 | 266ms | 나무 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactWood_medium_000 | 333ms | 나무 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactWood_medium_001 | 333ms | 나무 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactWood_medium_002 | 333ms | 나무 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactWood_medium_003 | 333ms | 나무 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 물체와 충돌 · impactWood_medium_004 | 333ms | 나무 물체가 부딪히는 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다. | [Kenney](https://kenney.nl/assets/impact-sounds) |
| 편집용 기포 단발음 · bubble_01 | 696ms | 기포 단발음을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 기포 단발음 · bubble_02 | 360ms | 기포 단발음을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 기포 단발음 · bubble_03 | 547ms | 기포 단발음을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 슬라임 질감 · slime_01 | 473ms | 슬라임 질감을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 슬라임 질감 · slime_02 | 450ms | 슬라임 질감을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 슬라임 질감 · slime_03 | 570ms | 슬라임 질감을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 슬라임 질감 · slime_04 | 472ms | 슬라임 질감을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 슬라임 질감 · slime_05 | 456ms | 슬라임 질감을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 슬라임 질감 · slime_06 | 414ms | 슬라임 질감을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 슬라임 질감 · slime_07 | 450ms | 슬라임 질감을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 슬라임 질감 · slime_08 | 529ms | 슬라임 질감을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 슬라임 질감 · slime_09 | 654ms | 슬라임 질감을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 슬라임 질감 · slime_10 | 585ms | 슬라임 질감을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 슬라임 질감 · slime_11 | 410ms | 슬라임 질감을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 슬라임 질감 · slime_12 | 230ms | 슬라임 질감을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 슬라임 질감 · slime_13 | 574ms | 슬라임 질감을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 슬라임 질감 · slime_14 | 448ms | 슬라임 질감을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 슬라임 질감 · slime_15 | 495ms | 슬라임 질감을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 슬라임 질감 · slime_16 | 432ms | 슬라임 질감을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 튀김 · splash_01 | 1.4초 | 물 튀김을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 튀김 · splash_02 | 718ms | 물 튀김을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 튀김 · splash_03 | 772ms | 물 튀김을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 튀김 · splash_04 | 1.0초 | 물 튀김을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 튀김 · splash_05 | 1.2초 | 물 튀김을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 튀김 · splash_06 | 456ms | 물 튀김을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 튀김 · splash_07 | 1.3초 | 물 튀김을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 튀김 · splash_08 | 693ms | 물 튀김을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 튀김 · splash_09 | 360ms | 물 튀김을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 튀김 · splash_10 | 318ms | 물 튀김을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 튀김 · splash_11 | 1.1초 | 물 튀김을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 튀김 · splash_12 | 786ms | 물 튀김을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 튀김 · splash_13 | 764ms | 물 튀김을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 튀김 · splash_14 | 559ms | 물 튀김을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |
| 편집용 물 튀김 · splash_15 | 480ms | 물 튀김을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다. | [rubberduck](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) |

### 동물 합성 효과음

| 이름 · 원본 파일 | 길이 | 설명 | 출처 |
|---|---:|---|---|
| 새와 곤충의 합성 효과음 · bird | 726ms | 새·귀뚜라미·개구리·모기 등을 표현한 합성 효과음입니다. 실제 동물 녹음이 아니라 만화적 장면의 소리 후보입니다. | [Aj_](https://opengameart.org/content/birdcricketfrog-and-mosquito-sounds) |
| 새와 곤충의 합성 효과음 · bird2 | 1.2초 | 새·귀뚜라미·개구리·모기 등을 표현한 합성 효과음입니다. 실제 동물 녹음이 아니라 만화적 장면의 소리 후보입니다. | [Aj_](https://opengameart.org/content/birdcricketfrog-and-mosquito-sounds) |
| 새와 곤충의 합성 효과음 · birdNight | 840ms | 새·귀뚜라미·개구리·모기 등을 표현한 합성 효과음입니다. 실제 동물 녹음이 아니라 만화적 장면의 소리 후보입니다. | [Aj_](https://opengameart.org/content/birdcricketfrog-and-mosquito-sounds) |
| 새와 곤충의 합성 효과음 · cricket | 206ms | 새·귀뚜라미·개구리·모기 등을 표현한 합성 효과음입니다. 실제 동물 녹음이 아니라 만화적 장면의 소리 후보입니다. | [Aj_](https://opengameart.org/content/birdcricketfrog-and-mosquito-sounds) |
| 새와 곤충의 합성 효과음 · cricket2 | 3.3초 | 새·귀뚜라미·개구리·모기 등을 표현한 합성 효과음입니다. 실제 동물 녹음이 아니라 만화적 장면의 소리 후보입니다. | [Aj_](https://opengameart.org/content/birdcricketfrog-and-mosquito-sounds) |
| 새와 곤충의 합성 효과음 · distressedMosquito | 351ms | 새·귀뚜라미·개구리·모기 등을 표현한 합성 효과음입니다. 실제 동물 녹음이 아니라 만화적 장면의 소리 후보입니다. | [Aj_](https://opengameart.org/content/birdcricketfrog-and-mosquito-sounds) |
| 새와 곤충의 합성 효과음 · frog | 292ms | 새·귀뚜라미·개구리·모기 등을 표현한 합성 효과음입니다. 실제 동물 녹음이 아니라 만화적 장면의 소리 후보입니다. | [Aj_](https://opengameart.org/content/birdcricketfrog-and-mosquito-sounds) |

### 버튼·선택 효과음

| 이름 · 원본 파일 | 길이 | 설명 | 출처 |
|---|---:|---|---|
| 버튼과 화면 조작 · back_001 | 64ms | 뒤로 이동에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · back_002 | 70ms | 뒤로 이동에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · back_003 | 93ms | 뒤로 이동에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · back_004 | 73ms | 뒤로 이동에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · bong_001 | 123ms | 알림 음에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · click_001 | 100ms | 클릭에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · click_002 | 10ms | 클릭에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · click_003 | 10ms | 클릭에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · click_004 | 10ms | 클릭에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · click_005 | 10ms | 클릭에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · close_001 | 148ms | 닫기에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · close_002 | 314ms | 닫기에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · close_003 | 314ms | 닫기에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · close_004 | 323ms | 닫기에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · confirmation_001 | 290ms | 확인에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · confirmation_002 | 539ms | 확인에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · confirmation_003 | 322ms | 확인에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · confirmation_004 | 490ms | 확인에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · drop_001 | 110ms | 떨어지는 음에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · drop_002 | 191ms | 떨어지는 음에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · drop_003 | 191ms | 떨어지는 음에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · drop_004 | 287ms | 떨어지는 음에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · error_001 | 165ms | 오류 안내에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · error_002 | 165ms | 오류 안내에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · error_003 | 534ms | 오류 안내에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · error_004 | 103ms | 오류 안내에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · error_005 | 500ms | 오류 안내에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · error_006 | 500ms | 오류 안내에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · error_007 | 192ms | 오류 안내에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · error_008 | 139ms | 오류 안내에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · glass_001 | 278ms | 유리 느낌 알림에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · glass_002 | 125ms | 유리 느낌 알림에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · glass_003 | 124ms | 유리 느낌 알림에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · glass_004 | 692ms | 유리 느낌 알림에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · glass_005 | 111ms | 유리 느낌 알림에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · glass_006 | 111ms | 유리 느낌 알림에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · glitch_001 | 20ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · glitch_002 | 30ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · glitch_003 | 10ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · glitch_004 | 23ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · maximize_001 | 258ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · maximize_002 | 258ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · maximize_003 | 212ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · maximize_004 | 418ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · maximize_005 | 526ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · maximize_006 | 380ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · maximize_007 | 186ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · maximize_008 | 225ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · maximize_009 | 225ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · minimize_001 | 258ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · minimize_002 | 258ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · minimize_003 | 212ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · minimize_004 | 418ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · minimize_005 | 526ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · minimize_006 | 380ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · minimize_007 | 186ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · minimize_008 | 225ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · minimize_009 | 225ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · open_001 | 148ms | 열기에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · open_002 | 314ms | 열기에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · open_003 | 314ms | 열기에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · open_004 | 323ms | 열기에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · pluck_001 | 102ms | 튕기는 음에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · pluck_002 | 165ms | 튕기는 음에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · question_001 | 491ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · question_002 | 332ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · question_003 | 332ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · question_004 | 332ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · scratch_001 | 139ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · scratch_002 | 139ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · scratch_003 | 123ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · scratch_004 | 325ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · scratch_005 | 325ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · scroll_001 | 1.0초 | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · scroll_002 | 1.0초 | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · scroll_003 | 1.0초 | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · scroll_004 | 1.0초 | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · scroll_005 | 1.0초 | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · select_001 | 43ms | 선택에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · select_002 | 43ms | 선택에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · select_003 | 383ms | 선택에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · select_004 | 383ms | 선택에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · select_005 | 383ms | 선택에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · select_006 | 1.9초 | 선택에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · select_007 | 47ms | 선택에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · select_008 | 47ms | 선택에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · switch_001 | 618ms | 스위치 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · switch_002 | 611ms | 스위치 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · switch_003 | 500ms | 스위치 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · switch_004 | 500ms | 스위치 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · switch_005 | 612ms | 스위치 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · switch_006 | 610ms | 스위치 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · switch_007 | 614ms | 스위치 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · tick_001 | 23ms | 짧은 클릭에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · tick_002 | 23ms | 짧은 클릭에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · tick_004 | 55ms | 짧은 클릭에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · toggle_001 | 139ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · toggle_002 | 139ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · toggle_003 | 139ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |
| 버튼과 화면 조작 · toggle_004 | 66ms | 버튼과 화면 조작에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다. | [Kenney](https://kenney.nl/assets/interface-sounds) |

### 전환·엔딩 음악

| 이름 · 원본 파일 | 길이 | 설명 | 출처 |
|---|---:|---|---|
| 장면 전환과 엔딩 · jingles_NES00 | 1.8초 | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_NES01 | 408ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_NES02 | 391ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_NES03 | 604ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_NES04 | 604ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_NES05 | 906ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_NES06 | 799ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_NES07 | 746ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_NES08 | 622ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_NES09 | 444ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_NES10 | 408ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_NES11 | 834ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_NES12 | 852ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_NES13 | 1.0초 | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_NES14 | 373ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_NES15 | 426ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_NES16 | 515ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_HIT00 | 284ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_HIT01 | 506ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_HIT02 | 524ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_HIT03 | 746ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_HIT04 | 639ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_HIT05 | 613ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_HIT06 | 515ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_HIT07 | 284ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_HIT08 | 284ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_HIT09 | 746ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_HIT10 | 746ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_HIT11 | 959ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_HIT12 | 275ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_HIT13 | 293ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_HIT14 | 417ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_HIT15 | 1.2초 | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_HIT16 | 293ms | 게임풍 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_PIZZI00 | 494ms | 현악 피치카토 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_PIZZI01 | 1.0초 | 현악 피치카토 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_PIZZI02 | 956ms | 현악 피치카토 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_PIZZI03 | 1.1초 | 현악 피치카토 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_PIZZI04 | 564ms | 현악 피치카토 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_PIZZI05 | 536ms | 현악 피치카토 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_PIZZI06 | 690ms | 현악 피치카토 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_PIZZI07 | 1.3초 | 현악 피치카토 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_PIZZI08 | 569ms | 현악 피치카토 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_PIZZI09 | 569ms | 현악 피치카토 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_PIZZI10 | 797ms | 현악 피치카토 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_PIZZI11 | 792ms | 현악 피치카토 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_PIZZI12 | 993ms | 현악 피치카토 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_PIZZI13 | 881ms | 현악 피치카토 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_PIZZI14 | 923ms | 현악 피치카토 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_PIZZI15 | 811ms | 현악 피치카토 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_PIZZI16 | 462ms | 현악 피치카토 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_SAX00 | 391ms | 색소폰 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_SAX01 | 888ms | 색소폰 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_SAX02 | 870ms | 색소폰 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_SAX03 | 1.1초 | 색소폰 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_SAX04 | 391ms | 색소폰 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_SAX05 | 462ms | 색소폰 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_SAX06 | 515ms | 색소폰 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_SAX07 | 1.7초 | 색소폰 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_SAX08 | 391ms | 색소폰 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_SAX09 | 373ms | 색소폰 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_SAX10 | 639ms | 색소폰 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_SAX11 | 622ms | 색소폰 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_SAX12 | 852ms | 색소폰 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_SAX13 | 781ms | 색소폰 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_SAX14 | 746ms | 색소폰 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_SAX15 | 604ms | 색소폰 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_SAX16 | 408ms | 색소폰 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_STEEL00 | 933ms | 스틸 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_STEEL01 | 1.4초 | 스틸 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_STEEL02 | 1.4초 | 스틸 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_STEEL03 | 1.4초 | 스틸 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_STEEL04 | 909ms | 스틸 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_STEEL05 | 945ms | 스틸 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_STEEL06 | 1.4초 | 스틸 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_STEEL07 | 1.6초 | 스틸 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_STEEL08 | 801ms | 스틸 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_STEEL09 | 586ms | 스틸 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_STEEL10 | 909ms | 스틸 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_STEEL11 | 825ms | 스틸 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_STEEL12 | 1.3초 | 스틸 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_STEEL13 | 1.1초 | 스틸 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_STEEL14 | 1.4초 | 스틸 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_STEEL15 | 945ms | 스틸 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |
| 장면 전환과 엔딩 · jingles_STEEL16 | 909ms | 스틸 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다. | [Kenney](https://kenney.nl/assets/music-jingles) |

## 개발·병합 자료

- [CC0·CC BY·CC BY-NC 재점검 결과와 근거](CC0_LICENSE_AUDIT.md)
- [추가 배경음 6곡과 작품별 활용](CC0_BGM_SUPPLEMENT.md)
- [추후 작품 편집용 추가 음원](CC0_EDITOR_EXPANSION.md)
- [작품별 장·컷 음원 제안표](STORY_AUDIO_TABLES.md)
- [확보본 폴더와 재실행 안내](../../assets/CC0_AUDIO_README.md)
- [전체 음원 JSON 목록](../../assets/metadata/audio/cc0-library.json)
- [표 계산용 CSV 목록](../../assets/metadata/audio/cc0-library.csv)
- [제작자·배포 URL·다운로드 해시](../../assets/metadata/audio/cc0-sources.json)
- [전체 디코딩 검사 요약](../../assets/metadata/audio/cc0-validation.json)
- [공식 CC0 안내](https://creativecommons.org/publicdomain/zero/1.0/)

이 자료는 음원 확보 단계의 문서입니다. 앱 Asset Registry 등록, Ren'Py Web 재생 검증, 기존 로컬 음원의 라이선스 확인은 추후 통합 작업에서 진행합니다.
