# 뉴놀스토리 CC0 음원 확보본

이 묶음은 다른 로컬에서 개발 중인 `new-knolstory`에 추후 병합하기 위한 음원 준비 작업입니다. 확보 날짜는 2026-10-13이며, 저장소 참고 기준은 `d58f99d75289c929153cf4a8ad0f0b7cd5a36155`입니다.

## 파일 찾기

- `audio-preview.html`: 검색·분류·개별 청취와 배경음+환경음 동시 비교가 가능합니다. 위쪽 함께 듣기에서 두 채널의 볼륨을 각각 조절하고 단독 듣기로 비교합니다. 아래 목록은 한 번에 한 음원만 재생되며 초기 볼륨은 35%입니다.
- `source/audio/cc0/`: 제작자가 배포한 원본. 편집이나 재변환에 사용합니다.
- `runtime/audio/cc0/`: 재생용 OGG 또는 MP3. 이미 OGG/MP3인 원본은 재압축하지 않았습니다. WAV는 Vorbis 품질 4로 변환했고 원본은 보존했습니다.
- `metadata/audio/cc0-library.json`: 음원별 고정 ID, 분류, 한국어 제목·태그, 원본과 재생본 경로, 길이, SHA-256, 라이선스 근거, 검증 결과입니다.
- `metadata/audio/cc0-library.csv`: 음원 목록을 스프레드시트에서 볼 때 사용합니다.
- `metadata/audio/cc0-sources.json`: 배포자와 실제 다운로드 URL, 원본 파일/압축파일 해시입니다.
- `metadata/audio/cc0-validation.json`: 전체 디코딩, 중복, 신호 레벨 검사 요약입니다.
- `metadata/audio/cc0-editor-expansion.json`: 추후 작품 편집용으로 추가한 83개의 ID·설명·출처·파일 목록입니다. 기존 작품의 장·컷 표에는 배정하지 않았습니다.
- `licenses/audio/cc0/`: 각 배포 페이지의 HTML, 당시 확인 정보, 배포 ZIP에 들어 있던 라이선스 문서입니다.
- `licenses/audio/excluded/`: CC0가 아니어서 음원을 받지 않은 후보의 확인 자료입니다. 이 후보들은 음원 목록에 포함하지 않습니다.

## 선정과 확인 기준

Kenney와 OpenGameArt의 개별 배포 페이지에 CC0가 명시된 음원만 확보했습니다. 모음의 제목이나 검색 결과만으로 CC0라고 판단하지 않았습니다. Kenney ZIP의 동봉 라이선스에서도 CC0를 확인했습니다. 배포 페이지의 제작자 표기는 그대로 기록합니다. 한국어 제목과 태그는 검색을 위한 편집 정보입니다.

같은 곡의 여러 포맷은 한 곡으로 관리하고, 번호가 다른 효과음 변형은 각각 보존합니다. 원본 바이트가 같은 파일은 카탈로그에서 중복 별칭으로 기록합니다. 징글의 개수는 독립적인 장편 BGM 개수와 구분합니다. 동물 합성음은 실제 현장 녹음과 구분해 표시합니다. 중세풍 음악은 한국 전통 악기 녹음으로 분류하지 않습니다.

검사는 실제 파일을 끝까지 디코딩하고, 메타데이터·경로·해시를 확인하는 방식입니다. 청취에 의한 장면 적합성, 잡음, 반복 연결부 검토는 아직 완료하지 않았습니다. `loop.publisherClaimed`는 제작자 설명/파일명의 반복 표기이며, `loop.auditionVerified`는 false입니다. 모든 음원은 `acquired-awaiting-audition` 상태입니다.

권장 게인은 BGM·환경음 -6 dB, 효과음·징글 -3 dB이며 파일 자체의 음량을 변경한 값이 아닙니다. 실제 작품의 대사와 함께 청취한 뒤 조절합니다. 변환한 OGG에서 0 dBFS보다 큰 피크가 검출되는 경우도 검증 요약에 남겼습니다.

공식 CC0 안내: https://creativecommons.org/publicdomain/zero/1.0/

## 다른 로컬에 병합할 때

1. 아래 에셋 폴더와 `scripts/audio*`, `scripts/*audio*.py`를 가져옵니다. `describe_cc0_audio.py`가 사용하는 `describe_editor_audio.py`와 표 보완용 `supplement_story_audio.py`도 포함합니다. 앱 실행 코드나 기존 공용 상태 문서를 통째로 덮어쓰지 않습니다.
2. `metadata/audio/cc0-library.json`은 **확보용 메타데이터**입니다. 개발 중인 실제 Asset Registry의 스키마에 맞춰 매핑합니다. 기존 Asset ID는 보존하고 새 ID의 중복 여부를 확인합니다. 파일별 `revision`은 1입니다.
3. 선택 UI는 분류·태그를 읽고, Asset resolver는 ID를 `runtimePath`로 연결합니다. 학생 작품에는 공용 바이너리가 아니라 고정 ID를 저장합니다.
4. Ren'Py Web에서 BGM·환경음·효과음의 채널, 정지, 음량, 반복 처리를 확인합니다. 아직 런타임에 등록하거나 앱 코드에 연결하지 않았습니다.
5. Git으로 가져갈 때 원본 배포 ZIP(`source/audio/cc0/_downloads/`), `.tools/`, `exports/`는 제외합니다. 이동용 ZIP의 경로는 독립 확보본 폴더 기준입니다. 별도의 빈 `package` 폴더에 풀고 기존 개발 저장소 루트에 덮어쓰지 않습니다.

## 다시 확보하거나 검증할 때

CC BY·CC BY-NC와 혼동했는지 재점검한 결과와 39개 자료별 증거는 [라이선스 분석](../docs/assets/CC0_LICENSE_AUDIT.md)에 있습니다. 이번 확보본 490개는 모두 CC0 단독 표기이며 다른 개발 로컬의 기존 음원은 포함하지 않습니다. 현재 출처 안내를 보충하되 초기 저장 HTML과 안내 값을 보존했습니다.

```powershell
python -m pip install --target .tools/audio-python -r scripts/audio-requirements.txt
python scripts/inspect_audio_sources.py
python scripts/prepare_cc0_audio.py --verified-on YYYY-MM-DD
python scripts/describe_cc0_audio.py
python scripts/supplement_story_audio.py
python scripts/verify_cc0_audio.py
```

`--verified-on`에는 실제로 배포 페이지를 다시 확인한 날짜를 넣습니다. 재실행은 기존 원본 다운로드를 재사용합니다. 재생본은 이전 목록의 원본·재생본 해시가 일치할 때만 재사용하며, 원본이 바뀌면 revision을 올려 새 버전 경로에 만듭니다. 새 배포 버전은 라이선스와 기존 작품 호환을 다시 확인해야 합니다.

음원별 설명과 기존 로컬 병합 비교 명령은 `docs/assets/CC0_AUDIO_GUIDE.md`를 참고합니다. 다른 포맷의 동일 곡은 바이트 해시만으로 판별되지 않습니다. 기존 음원에 신규 CC0 권리를 덮어씌우지 않습니다.
