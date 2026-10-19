# ADR0019 — 소리 검색 속성과 외부 자료 출처

Status: Accepted for current authoring scope (2026-10-10 사용자 요구).

작품 저작에 소리를 쉽게 찾아 사용하도록 category(배경음/주변소리/효과음), tags, originalName, source를 선택적 AudioMetadata로 기록한다. 기존 자료 ID·music/sound 재생 kind·RuntimeAudio 의미는 유지한다. ‘검색 출처’는 제공처 이름이고 provenance의 원본 URL·권리 기록과 구분한다. 입력한Pixabay 문자열은 권리 허가 증명으로 사용하지 않는다.

- 직접 첨부 파일은 현재 입력 용도를 기본값으로 제안하고 종류/한글이름/자유태그/원명/출처를 저장한다. 기존 속성 없는 파일은 임의 분류하지 않는다.
- 공통 bytes와 작품별 metadata 오버레이를 재사용하며 다른 작품의 이름/속성/출처를 덮어쓰지 않는다. 속성/권리 편집은 최신 상대 정보를 보존한다.
- archive2의 audioResources에 선택적 metadata를 추가한다. StoryDocument6·JSONB payload1은 유지한다. 검색 정보는 음향 재생 의미 변경이 아니다. 구형 파일의 metadata 부재를 그대로 지원하고 알 수 없는 metadata 키/값은 거부한다. 이전 앱의 새 필드 지원을 보장하지 않으며 현재 Next 파일은 최신 검증기로 읽는다.
- workbook5에 metadata 일반 열과 소리 검색 태그 정규 행을 추가한다. 현재4의 초 단위는 유지하고2/3/4→5를 명시적으로 변환한다.
- 출처/종류/태그 필터를 텍스트 검색과 함께 적용하고 현재 선택을 자동 변경하지 않는다. 한글 이름은 표시용이며 원명·제작자·원본 URL·이용 조건은 접힌 상세에서 확인한다.
- 사용자가 승인한 Pixabay14개를 상업/비상업 창작물에 포함하는 용도로 등록한다. Pixabay Content License와 standalone 제한/Content ID를 기록하고 CC0 직접제작 자료와 구분한다. 이야기 서비스 전체 또는 작품 파일 안의 첨부를 standalone 재배포로 단정하지 않는다.

자료 언어·악기·반복 적합성을 제목만으로 확인된 사실로 만들지 않는다. 한국어 현장음/한국풍 연주는 추가 후보를 구분해 조사하며 실제 청취·등록 검증 전 자동 적용하지 않는다. [계약·검증](../architecture/audio-attributes-and-import.md).

[ADR0018](0018-authoring-seconds-and-terminology.md)의 당시 workbook4를 이번 속성 확장 범위에서만 대체한다. 사용자 문구·기존 Next 보호·원음 bytes/권리 기록·Core와 Ren’Py 책임은 유지한다.
