# 음원 라이선스 재점검 — CC0와 CC BY·CC BY-NC 구분

확인일: 2026-10-13

이번 환경에서 확보한 **카탈로그 490개**, **39개 배포 자료**, 동일 바이트 별칭 2개를 점검했다. 개별 배포 페이지의 실제 라이선스 항목을 저장본과 현재 페이지에서 비교했다. **현재 확인된 490개 모두 CC0 단독 표기이며 CC BY·CC BY-NC 혼입은 발견하지 못했다.**

다른 개발 로컬의 기존 음원은 이 점검에 포함되지 않는다. 그 로컬 파일을 새 CC0 분류로 덮어쓰면 안 된다.

## 라이선스 차이

| 구분 | 출처 표기 | 상업적 사용 | 이번 확보본 |
|---|---|---|---:|
| [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | 저작권 이용 조건으로 의무 아님 | 가능 | 490개 |
| [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 적절한 크레딧·라이선스 링크·변경 표시 필요 | 가능 | 0개 |
| [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) | BY의 표기 조건에 더해 비상업 조건 | 해당 라이선스만으로 상업적 사용 불가 | 0개 |

무료 다운로드는 CC0를 뜻하지 않는다. CC BY는 상업적 사용이 가능하지만 표기 조건을 지켜야 하며, BY-NC는 비상업 조건이 추가된다. 위 표는 4.0의 대표 조건 비교이고 다른 버전은 해당 원문을 확인한다. CC0는 법이 허용하는 범위의 권리 포기다. [공식 설명](https://creativecommons.org/publicdomain/zero/1.0/)도 제3자 권리·저작권 상태를 보증하지 않는다.

## 실제 검사 방법과 결과

- 39개 원본 배포 페이지 HTML의 음원 라이선스 필드와 CC0 공식 링크를 읽었다. 모음 제목·검색 결과·사이트 하단 저작권 표시는 판정 근거로 사용하지 않았다.
- 39개 현재 배포 페이지도 다시 내려받았다. 모두 해당 음원 라이선스 항목에 CC0만 표기되어 있었다. 재확인 HTML과 SHA-256을 별도로 보관하여 처음 확보한 증거를 덮어쓰지 않았다.
- 490개 파일의 다운로드 URL이 확보 당시 해당 페이지의 실제 파일 목록에 있는지 확인했다. 원본·재생본 SHA-256, CC0 분류와 출처 표기 의무 없음 메타데이터가 일치했다.
- Kenney 네 묶음의 License.txt, 3xBlast ReadMe.txt, Exploration Theme readme.txt 등 6개 동봉 문서에 CC0·선택적 크레딧 안내를 확인했다. BY·NC 충돌을 발견하지 못했다.
- 2개 중복 별칭은 CC0 확인된 본항목과 원본 바이트가 같았다. 개수를 부풀리는 다른 라이선스 음원이 아니다.
- 해변 파도 4개는 재배포 자료이므로 [jasinski의 Freesound 원본](https://freesound.org/people/jasinski/sounds/18363/)도 확인했다. 원본도 CC0이며 제작자 표시가 일치했다.
- 이 점검은 공개된 배포 선언·파일 대응·이용 조건을 확인한 것이다. 모든 작곡·샘플·녹음의 최초 권리자가 누구인지 독립 조사한 결론은 아니다.

## 발견하여 수정한 수집 문제

라이선스 분류 자체의 BY/NC 혼동은 없었다. 다만 초기 수집기는 OpenGameArt의 Copyright/Attribution Notice 필드 이름을 잘못 찾아 일부 선택적 출처 안내를 누락했다. 수집기를 수정했고, 현재 안내를 `cc0-sources.json`에 보충했다. 기존 HTML과 초기 안내 값은 보존했다. 누락 항목은 다음과 같다.

| 배포 자료 | 안내의 의미 | 처리 |
|---|---|---|
| [oga-determined-pursuit](https://opengameart.org/content/determined-pursuit-epic-orchestra-loop) | 선택적 크레딧·제작자 링크 또는 CC0 안내. 의무 조건 발견 없음. | 최신 안내·증거 경로 보충 |
| [oga-piano-emotional](https://opengameart.org/content/piano-emotional-solo-139) | 선택적 크레딧·제작자 링크 또는 CC0 안내. 의무 조건 발견 없음. | 최신 안내·증거 경로 보충 |
| [oga-first-light](https://opengameart.org/content/first-light-particles-%E2%80%93-cc0-atmospheric-pianoambient-track) | 선택적 크레딧·제작자 링크 또는 CC0 안내. 의무 조건 발견 없음. | 최신 안내·증거 경로 보충 |
| [oga-sunset-plains](https://opengameart.org/content/sunset-plains) | 선택적 크레딧·제작자 링크 또는 CC0 안내. 의무 조건 발견 없음. | 최신 안내·증거 경로 보충 |
| [oga-rain-thunder](https://opengameart.org/content/rain-and-thunders) | 선택적 크레딧·제작자 링크 또는 CC0 안내. 의무 조건 발견 없음. | 최신 안내·증거 경로 보충 |
| [oga-school-day](https://opengameart.org/content/school-day-rain-sun-loop) | 선택적 크레딧·제작자 링크 또는 CC0 안내. 의무 조건 발견 없음. | 최신 안내·증거 경로 보충 |
| [oga-aquaria](https://opengameart.org/content/aquaria) | 선택적 크레딧·제작자 링크 또는 CC0 안내. 의무 조건 발견 없음. | 최신 안내·증거 경로 보충 |
| [oga-exploration-theme](https://opengameart.org/content/exploration-theme) | 선택적 크레딧·제작자 링크 또는 CC0 안내. 의무 조건 발견 없음. | 최신 안내·증거 경로 보충 |
| [oga-ancient-mysteries](https://opengameart.org/content/ancient-mysteries) | 선택적 크레딧·제작자 링크 또는 CC0 안내. 의무 조건 발견 없음. | 최신 안내·증거 경로 보충 |
| [oga-pianosoft8](https://opengameart.org/content/pianosoft8) | 선택적 크레딧·제작자 링크 또는 CC0 안내. 의무 조건 발견 없음. | 최신 안내·증거 경로 보충 |
| [oga-editor-3xblast](https://opengameart.org/content/3xblast-free-music-pack-15-songs) | 선택적 크레딧·제작자 링크 또는 CC0 안내. 의무 조건 발견 없음. | 최신 안내·증거 경로 보충 |
| [oga-editor-shop](https://opengameart.org/content/shop-theme) | 선택적 크레딧·제작자 링크 또는 CC0 안내. 의무 조건 발견 없음. | 최신 안내·증거 경로 보충 |
| [oga-editor-fire](https://opengameart.org/content/fireplace-sound-loop) | 선택적 크레딧·제작자 링크 또는 CC0 안내. 의무 조건 발견 없음. | 최신 안내·증거 경로 보충 |

특히 “Music by …”, 제작자 사이트 링크, “credit appreciated”만 적힌 경우를 CC BY 의무로 바꾸지 않았다. CC0 필드와 본문·동봉 문서를 함께 읽었다. Kenney·3xBlast·Exploration Theme 등은 크레딧이 필수가 아니라고 명시하고 있다. 그래도 제작자·원본 URL은 향후 자발적 크레딧과 추적을 위해 유지한다.

## CC0가 아니어서 제외했던 후보

| 후보 | 저장 당시 라이선스 | 현재 카탈로그 포함 |
|---|---|---|
| [oga-birdsong](https://opengameart.org/content/birdsong-background-loop) | CC-BY 3.0 | 미포함 |
| [oga-crickets](https://opengameart.org/content/crickets) | CC-BY 3.0 | 미포함 |
| [oga-fire](https://opengameart.org/content/fire-loop) | CC-BY 3.0 | 미포함 |
| [oga-running-water](https://opengameart.org/content/running-water) | GPL 2.0, GPL 3.0, CC-BY-SA 3.0 | 미포함 |
| [oga-thunder](https://opengameart.org/content/thunder) | CC-BY 3.0 | 미포함 |

예를 들어 Fire Loop의 CC BY 자료는 제외했고, 이후 확보한 Fireplace Sound loop는 다른 제작자의 별도 CC0 파일이다. 제목·소재가 비슷하다고 동일 라이선스로 취급하지 않았다. 제외 폴더에는 검토 자료만 있으며 사용 목록에 그 음원의 다운로드 URL이 들어 있지 않다.

[OpenGameArt FAQ](https://opengameart.org/content/faq#q-multilicense)는 여러 라이선스가 제시되면 하나를 선택할 수 있다고 설명한다. 이번 확보는 그중 CC0를 임의로 골라 표시한 사례도 없이, 실제 필드에 **CC0 단독**으로 표시된 39개 자료다. 관련 유료팩·다른 업로더의 리믹스·모음 전체까지 CC0라고 확대하지 않는다.

## 39개 배포 자료별 점검표

| 배포 자료 | 고유 파일 수 | 저장본 / 현재 항목 | 재확인 증거 |
|---|---:|---|---|
| [kenney-interface](https://kenney.nl/assets/interface-sounds) | 100 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/kenney-interface/audit.json) |
| [kenney-rpg](https://kenney.nl/assets/rpg-audio) | 51 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/kenney-rpg/audit.json) |
| [kenney-impact](https://kenney.nl/assets/impact-sounds) | 128 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/kenney-impact/audit.json) |
| [kenney-jingles](https://kenney.nl/assets/music-jingles) | 85 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/kenney-jingles/audit.json) |
| [oga-once-upon-a-time](https://opengameart.org/content/once-upon-a-time-loop) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-once-upon-a-time/audit.json) |
| [oga-bards-tale](https://opengameart.org/content/medieval-the-bards-tale) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-bards-tale/audit.json) |
| [oga-old-tower-inn](https://opengameart.org/content/medieval-the-old-tower-inn) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-old-tower-inn/audit.json) |
| [oga-market-day](https://opengameart.org/content/medieval-market-day) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-market-day/audit.json) |
| [oga-minstrel-dance](https://opengameart.org/content/medieval-minstrel-dance) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-minstrel-dance/audit.json) |
| [oga-rising-moon](https://opengameart.org/content/fantasy-rising-moon) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-rising-moon/audit.json) |
| [oga-forest-ambience](https://opengameart.org/content/forest-ambience) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-forest-ambience/audit.json) |
| [oga-new-sunrise](https://opengameart.org/content/new-sunrise) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-new-sunrise/audit.json) |
| [oga-determined-pursuit](https://opengameart.org/content/determined-pursuit-epic-orchestra-loop) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-determined-pursuit/audit.json) |
| [oga-treasure-hunter](https://opengameart.org/content/treasure-hunter) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-treasure-hunter/audit.json) |
| [oga-jrpg-calm](https://opengameart.org/content/jrpg-pack-4-calm) | 6 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-jrpg-calm/audit.json) |
| [oga-piano-emotional](https://opengameart.org/content/piano-emotional-solo-139) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-piano-emotional/audit.json) |
| [oga-first-light](https://opengameart.org/content/first-light-particles-%E2%80%93-cc0-atmospheric-pianoambient-track) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-first-light/audit.json) |
| [oga-sunset-plains](https://opengameart.org/content/sunset-plains) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-sunset-plains/audit.json) |
| [oga-rain](https://opengameart.org/content/rain-loopable) | 4 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-rain/audit.json) |
| [oga-rain-thunder](https://opengameart.org/content/rain-and-thunders) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-rain-thunder/audit.json) |
| [oga-animal-synth](https://opengameart.org/content/birdcricketfrog-and-mosquito-sounds) | 7 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-animal-synth/audit.json) |
| [oga-school-day](https://opengameart.org/content/school-day-rain-sun-loop) | 3 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-school-day/audit.json) |
| [oga-park](https://opengameart.org/content/park-ambiences) | 3 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-park/audit.json) |
| [oga-aquaria](https://opengameart.org/content/aquaria) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-aquaria/audit.json) |
| [oga-exploration-theme](https://opengameart.org/content/exploration-theme) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-exploration-theme/audit.json) |
| [oga-ancient-mysteries](https://opengameart.org/content/ancient-mysteries) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-ancient-mysteries/audit.json) |
| [oga-tension](https://opengameart.org/content/tension) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-tension/audit.json) |
| [oga-pianosoft8](https://opengameart.org/content/pianosoft8) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-pianosoft8/audit.json) |
| [oga-emotional-piano-solo](https://opengameart.org/content/emotional-piano-0) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-emotional-piano-solo/audit.json) |
| [oga-editor-3xblast](https://opengameart.org/content/3xblast-free-music-pack-15-songs) | 15 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-editor-3xblast/audit.json) |
| [oga-editor-jrpg-towns](https://opengameart.org/content/jrpg-pack-2-towns) | 4 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-editor-jrpg-towns/audit.json) |
| [oga-editor-jrpg-exploration](https://opengameart.org/content/jrpg-pack-1-exploration) | 6 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-editor-jrpg-exploration/audit.json) |
| [oga-editor-jrpg-evil](https://opengameart.org/content/jrpg-pack-3-evil) | 5 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-editor-jrpg-evil/audit.json) |
| [oga-editor-shop](https://opengameart.org/content/shop-theme) | 2 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-editor-shop/audit.json) |
| [oga-editor-bossa](https://opengameart.org/content/bossa-nova) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-editor-bossa/audit.json) |
| [oga-editor-scifi](https://opengameart.org/content/ambience-pack-1-sci-fi-horror) | 5 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-editor-scifi/audit.json) |
| [oga-editor-fire](https://opengameart.org/content/fireplace-sound-loop) | 1 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-editor-fire/audit.json) |
| [oga-editor-beach](https://opengameart.org/content/beach-ocean-waves) | 4 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-editor-beach/audit.json) |
| [oga-editor-water](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) | 40 | CC0 / CC0 | [HTML 해시·항목·본문·안내](../../assets/licenses/audio/audit-2026-10-13/oga-editor-water/audit.json) |

## 파일별 확인 자료

GitHub 공개본은 Freesound HTML에 포함된 사이트 측 Mapbox 토큰만 제거했다. 최초 저장 원문은 로컬에 보존하고, [공개본 정제 기록](../../assets/metadata/audio/publication-redactions.json)에 원문 해시와 공개본 해시를 함께 기록한다. 원문 해시를 담은 감사 기록과 공개 HTML 바이트의 차이는 이 기록으로 대조한다. CC0 항목·제작자·음원 파일은 변경하지 않았다.

- [490개 파일별 판정 CSV](../../assets/metadata/audio/cc0-license-audit.csv)
- [전체 감사 결과 JSON](../../assets/metadata/audio/cc0-license-audit.json)
- [음원별 안정적 ID·원본·재생본·라이선스](../../assets/metadata/audio/cc0-library.json)
- [보충한 출처 안내와 다운로드 기록](../../assets/metadata/audio/cc0-sources.json)

재점검 명령: `python scripts/audit_audio_licenses.py`. 감사 문서와 출처 안내 보충: `python scripts/write_audio_license_report.py`. 음원·작품·Asset ID는 이 과정에서 변경하지 않는다. 재점검 후 제3자 원본 확인 HTML도 보존한다.
