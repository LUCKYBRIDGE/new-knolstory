# 소리 속성·Pixabay 자료 등록

현재 선택 목록은 [장면 사용·배포 범위](audio-service-rights.md)의61개(CC047/Pixabay 장면용 조건부14)다. 아래40개/61개/14개 검증은 당시 기록으로 보존하며 현재 공용 제공 승인으로 사용하지 않는다.

2026-10-10 사용자 결정: 제시한 14개 Pixabay 후보를 한글 이름으로 등록하고 종류·태그·출처로 찾는다. 이후 상업 이용 가능성이 명확한 CC0 외부 자료21개를 추가 등록했다. 직접 첨부하는 소리에도 같은 속성을 기록한다. 한국어가 들리는 주변 소리와 한국적인 연주곡은 별도 후보로 조사한다.

## 당시 등록과 현재 제외

당시Pixabay14개 원본MP3를 다운로드하고 정상 디코딩·실제 길이·SHA-256을 확인했다. 배경음2, 주변 소리5, 효과음7이 추가되어 당시 총40개가 되었다. 이후 [CC0 등록 목록](../../packages/asset-registry/src/external-cc0-audio.json)21개를 추가해 당시61개가 되었다. 일괄 제외했던14개는 이후 사용자 결정으로 장면용 조건부 선택에 복구하여 현재61개이며, [제외 ID 설명](../../packages/asset-registry/src/audio-service-exclusions.json)과 [권리 감사 기록](evidence/audio-service-rights/decision.json)으로 경위를 보존한다. 승인된 소리의 한글 이름·원명·제작자·출처·이용 조건은 편집기의 접힌 ‘이름·속성·원래 이름’에서 확인한다.

Pixabay의 당시 창작물 사용 기록을 공용 원본 선택·미리 듣기·제공 승인으로 확대하지 않는다. Standalone 배포 제한을 검토해 일괄 제외한 뒤, 최신 사용자 결정으로 선택/장면 결합과 독립 재배포를 구분해 복구했으며 음원 자체의 라이선스를 CC0로 바꾸지 않았다. [현재 권리 결정](audio-service-rights.md), [당시 다운로드·디코딩](evidence/audio-attributes/pixabay-downloads.json).

CC0 자료는 Pixabay와 분리한다. Kenney RPG Audio, OpenGameArt Rain, OpenGameArt Forest Ambience에서 가져온 21개는 CC0-1.0으로 상업적 사용·수정·복사·재배포 허용이 명확한 자료만 등록했다. 출처 표시는 의무가 아니어도 원래 이름, 제작자, 원본 URL, license URL을 보존한다. [상업용 제공처 검토](commercial-audio-sources.md), [다운로드·디코딩·해시](evidence/cc0-audio/downloads.json).

## 속성과 필터

소리 종류는 배경음(background), 주변 소리(ambience), 효과음(effect)다. 기존 재생 kind music/sound와 안정적인ID는 그대로다. 명시된 종류가 없는 기존 사용자 파일은 이전 선택 가능 범위를 유지하며 임의 분류를 저장하지 않는다.

`metadata`는 선택적 검색 속성으로 category와 tags 목록, 선택적 originalName/source를 담는다. 태그는24개 이하·각60자, 원래 이름과 출처는200자 이하이며 중복/빈값/잘못된종류/알수없는키를 거부한다. 원래 음원 설명·기기파일명과 작가의 한글 표시 이름은 구분한다. 추천 태그 외에 ‘한국어’, ‘시장’, ‘가야금’ 등 자유 태그를 직접 쓸 수 있다. 제목의 악기·지역 태그를 실제 음향 판별로 취급하지 않는다.

파일을 첨부하면 현재 입력의 용도를 초기 종류로 주고, 원래 파일명을 기록한다. ‘이름·속성·원래 이름’에서 한글 이름·종류·태그·검색 출처를 수정하고 저장한다. 이름/원명/태그 텍스트 검색과 종류·속성·출처 필터를 AND로 적용한다. 필터 밖의 현재 선택은 보존하며 필터가 작품을 자동 바꾸지 않는다. 명시적인 이용 조건 제공처는 출처 필터에 우선하고 미확인 업로드 placeholder는 검색 출처를 가리지 않는다. 제공처 이름을 쓰는 것만으로 상업 권리가 허용된 것으로 기록하지 않는다.

IDB의 공통 bytes와 작품별 metadata를 분리한다. 다른 작품에서 같은ID를 사용해도 이름/태그/종류/출처가 덮어써지지 않는다. 속성과 이용 조건 편집은 최신 counterpart를 읽어 병합하며 사본도 유지한다.

## 파일·표·DB 연결

StoryDocument6/archive2/JSONB payload1은 유지하고 archive audioResources에 선택적metadata를 보관한다. 검색 속성은 재생 의미를 변경하지 않는 부가 정보다. 속성이 없는 이전 Next 파일은 그대로 읽는다.

새 workbook5는 사용자 음원 정보에 ‘검색 속성 있음/사용 용도/원래 이름/검색 출처’를 추가하고 ‘소리 검색 태그’에 같은음원ID·태그순서·검색태그를 한행씩 작성한다. 단일JSON cell로 숨기지 않는다. 이전 workbook2/3/4를 명시적으로 변환하며, 버전을 낮춘 채 새속성열/태그탭을 넣는 입력은 거부한다. 워크북 시간은 현재4에서 정한 초를 유지한다. 현재 놀스토리는61개 기본 소리와 사용자 소리 metadata를 같은 검색/필터 계약으로 다룬다.

## 한국 소리 후보 — 아직 미등록

사용자의 ‘한국 소리가 들리는’ 요청을 한국어 말소리/현장음과 한국풍음악으로 구분했다. 전자는 주변 소리이며 배경음과 다르다.

| 한글 후보명 | 원본 페이지 | 확인된 설명/길이 | 한계 |
|---|---|---|---|
| 서울거리소리1 | [street_sounds_Seoul](https://pixabay.com/sound-effects/city-street-sounds-seoul-22801/) | Seoul/Korean/Voices/Talking/field-recording, 약1:28 | 실제 한국어 발화·구간/현대소음 청취 미검증 |
| 남대문시장소리1 | [Namdaemun street market](https://pixabay.com/sound-effects/people-namdaemun-street-market-seoul-korea-30462/) | 서울 남대문시장 현장음, 약0:37 | 실제말소리 언어·시대 적합성 미검증 |
| 한국풍연주1 | [Grace in Hanbok](https://pixabay.com/music/folk-grace-in-hanbok-321003/) | instrumental/traditional/Korean culture, 2:01 | AI생성 표시, 한국어노래나 실제국악녹음이라고 주장하지 않음 |
| 한국풍연주2 | [Atlas South Korea](https://pixabay.com/music/orchestral-atlas-south-korea-561030/) | 가야금/태평소/국악/퓨전태그, 2:27 | AI생성 표시, 실제악기/발화미검증 |

출처가 Korean이라고 표시하는 것만으로 한국어가 또렷하게 들린다고 확정하지 않는다. 후보는 추가청취/선택을 위해 남겼으며 이번 승인된14개와 합쳐 자동 등록하지 않는다.

## 검증과 후속

검증은 `evidence/audio-attributes/`에 기록한다. 원본14개 모두 디코딩/파일 hash 확인. 새 속성 archive/XLSX/JSONB 전체 왕복·종류필터·출처태그 조합·작품별복사/재반입·잘못된 metadata거부·이전 양식 변환을 테스트한다. 앱 첨부→한글이름/태그저장→필터→파일내보내기→reload, 실제Ren’Py의 새파일 경로·소리한번재생을 확인한다. 현재 작품에는 소리를 자동 배치하지 않는다.

물리적 스피커/헤드폰에서 전문적청취·반복이음·외국어/한국어구간 검증은 미완료다. 한국후보 추가는청취/선택·권리기록·실제파일/렌더검증 후 새ID로 등록한다. 서버/학급 운영 정책을 이 기능에서 결정하지 않는다. 이전 검증로그/manifest는 당시 상태로 보존한다.


## 이번 검증 결과

- 전체 unit/integration [로그](evidence/audio-attributes/coverage-final.log): 105개 파일/1,082개 통과. Statements93.43%, branches90.97%, functions96.73%, lines98.67%.
- 새 검색·업로드 host [로그](evidence/audio-attributes/host-done.log):2개 통과. 실제 파일 첨부→종류·한글 이름·태그·원명·Pixabay 입력→복합필터→필터밖선택보존→파일반출→재열기. 기존작품별메타데이터·사본·같은bytes의다른작품 보호는unit/integration에서확인했다. PC/태블릿/휴대폰viewport 검사이며실기기증거는아니다.
- 실제 Mac Excel와 Google Sheets에서 [workbook5](evidence/audio-attributes/attributes.xlsx)의 ‘사용자 음원 정보’B3를‘학교종소리3’, ‘소리 검색 태그’C3를‘학교 종’으로수정·저장/반출했다. [Excel 수정본](evidence/audio-attributes/attributes-excel-edited.xlsx), [Google 수정본](evidence/audio-attributes/attributes-google-edited.xlsx), [검사3개 통과](evidence/audio-attributes/external-final.log). 이름/태그외 모든원고·소리원본MP3·권리·속성과JSONB 복원이동일하다. [실제Google시트](https://docs.google.com/spreadsheets/d/1YCkyTK0ycRPtNPEkp6VlP48vVHJ3fbC0zwMjo9Tchnw/edit).
- 새자료의한글목록/원명/출처 링크·등록수14·종류/출처/학교 종/남성 태그필터를 [카탈로그 검사](evidence/audio-attributes/catalog.log)로확인했다. 원본14개는실제파일·디코딩·해시검사가 있다. 전문적인청취/모든장면별믹스·언어판별·loop이음은별도미검증이다.
- 타입·lint·런타임패키지·Web빌드를 수행했다. [타입](evidence/audio-attributes/typecheck-final.log), [lint](evidence/audio-attributes/lint-final.log), [런타임](evidence/audio-attributes/runtime-build-complete.log), [Web](evidence/audio-attributes/build-final.log). 분배미디어의원본해시/출처목록도갱신하고 [provenance 검사](evidence/audio-attributes/provenance-check.log)를통과했다.
- 리뷰에서발견한 kind배열강제변환 허용은문자열검사로수정했다. 새Pixabay디렉터리만RuntimeAudio안전경로허용에추가하며임의외부URL/경로탈출은계속거부한다. [RED](evidence/audio-attributes/boundaries-red.log), [GREEN](evidence/audio-attributes/boundaries-green.log).

추가자료는기존원작/개인작품에자동배치하지않았다. 실제업로드·검색·외부파일왕복과Renderer검증을구분하며JSONB검사는운영DB배포가아니다. 한국후보는선택전추가자료로남긴다. 과거26개/40개증거는기록시점으로보존한다.

Native RenPy final test: [one passed](evidence/audio-attributes/native-done.log), both MP3 background/ambience paths and advancing playback position, bell exactly once. A real incoming telemetry allowlist mismatch was fixed by reusing the command audio path validator. [RED](evidence/audio-attributes/telemetry-red.log), [GREEN](evidence/audio-attributes/telemetry-green.log). Earlier click-race suspicion did not identify the cause; repeated clicks were removed.

CC0 추가 검증: [coverage](evidence/cc0-audio/unit-coverage.log)는108개 파일/1,085개 통과, Statements93.43%, branches91.01%, functions96.73%, lines98.67%. [host](evidence/cc0-audio/host.log)는21개 브라우저 디코딩과 한글 이름/출처 필터/원명 링크를 확인했다. [native](evidence/cc0-audio/native.log)는 숲분위기배경음1, 비소리1, 책장넘기는소리1을 Ren'Py Web Runtime의 배경음·주변 소리·효과음으로 실제 재생했다. [runtime build](evidence/cc0-audio/runtime-build.log), [web build](evidence/cc0-audio/web-build.log), [typecheck](evidence/cc0-audio/typecheck.log), [lint](evidence/cc0-audio/lint.log), [media provenance](evidence/cc0-audio/provenance-check.log)가 통과했다.

현재 원본 파일이 준비된 자료61개와 검색 속성을 실제 편집 화면에 등록했다. 제공처/태그는 검색을 돕는 설명이며 권리 기록과 다르다. 최종 source/evidence는 Pixabay [manifest](evidence/audio-attributes/final-manifest.json)와 CC0 [다운로드 기록](evidence/cc0-audio/downloads.json)에 기록한다. 전달 점검은 정확성4(원본·외부 파일·네이티브 검증), 완결성4(승인된14개+CC0 21개/속성·필터 구현; 한국 후보 청취는 별도), 명료성4(한글 이름/원명/출처 분리), 실행 가능성4(현재 편집기와 파일에서 사용), 간결성4(상태/계약/증거 구분), 평균4.0이다.

## 2026-10-13 등록 라이브러리 편입

위의 날짜가 있는 취득·검증 기록은 당시 범위로 보존한다. 현재 등록 자료의 추가·중복 별칭·출처 설명 검색·반복 기본값·on-demand native 전달은 [편입 계획](cc0-library-integration-plan.md)과 [검증](cc0-library-integration-validation.md)을 따른다. 외부 파일 업로드를 다시 활성화하거나 기존 저장 작품의 메타데이터를 자동 수정하지 않는다.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
