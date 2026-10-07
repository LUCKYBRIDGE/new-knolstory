# 기존 원작·놀스토리의 연출·음향 강화

## 범위와 현재 조사

새 테스트 이야기를 만들지 않는다. 고정 레거시18da4fc의 기존 네 놀스토리2635컷과 네 원작335컷, 총2970컷/242장을 대상으로 기존 대본·ID·Flow·자산·직접 배치를 보존한다. 우선 선녀와 나무꾼의 장면 표현을 확인하고 같은 공통 런타임/자료실을 사용해 흥부와 놀부·옹고집전·별주부전의 원작과 각색에도 확장한다.

원작 fixture는 현재 별도로 존재했으나 서재에 진입 경로가 없었다. `classicStories`는 고정 기준 getClassicReading 의존 소스를 읽기 전용으로 추출해 전체 데이터 일치를 확인한 원고다. 서재 ‘원작’에서 네 작품을 직접 읽고 기존 놀스토리 목록과 구분한다. 원고의 project/chapter/cut ID와 내용은 재작성하지 않는다.

## 제작·권리 원칙

비용·구매·새 계정·유료 API를 사용하지 않는다. 이번 초기 음원 묶음은 원곡·외부 녹음 샘플을 사용하지 않는 독립 합성/작곡이다. 재현 스크립트와 seed·음원 해시·제작 방식·CC0-1.0 기록을 함께 보관한다. 자연 환경음은 합성 근사이며 현장 녹음이라고 주장하지 않는다.

8개32초 음악(평온/발견/위기/상실/온기/의심/바다/결심), 4개24초 환경음(물가/비/숲/바다), 10개 짧은 사건 효과음(천둥/문/옷/발걸음/새/제비/박/충격/물/강조)을 후보로 확보했다. 실제 장면과 함께 판단하고 단순 음원 수나 peak/RMS 검사만으로 작품의 청취 품질 완료를 주장하지 않는다. 생성된 파일·수치 검사와 최종 작품 재생 근거를 구분한다.

- 제작: `scripts/create-story-soundtrack.py`
- 원본 제작/권리·해시: `apps/web/public/assets/audio/story-score/manifest.json`, 같은 폴더 README
- 공통 자산 ID/경로: `packages/asset-registry/src/story-score.json`
- 재생은 기존 Core→Ren’Py에서 담당하고 새로운 Web 무대를 만들지 않는다.

## Ren’Py 기능 참조

[Ren’Py 공식 전환](https://www.renpy.org/doc/html/transitions.html), [ATL/Transform](https://www.renpy.org/doc/html/transforms.html), [오디오 채널](https://www.renpy.org/doc/html/audio.html)을 참조한다. 공식 최신 문서는8.5.4이며 이 저장소는8.5.3을 고정한다. 실제 적용은 로컬 고정 SDK 소스·빌드·재생으로 확인하고 SDK를 임의로 업그레이드하지 않는다. 장면 연출 의도는 StoryDocument에, 픽셀 위치/배치는 Core에, 실제 전환·ATL·소리 실행은 공통 Ren’Py presenter에 둔다.

## 검증 진행

원작14개 계약 검사가 네 원고335컷 compile·자산 해석·전체 도달/엔딩·읽기 복원·파일 왕복과 baseline 전체 값을 검증했다. 서재 원작 진입은 실패하는 UI검사부터 추가해 연결한다. 음원22개 공통 ID 해석/Ogg파일/권리 manifest 검사는 실패 확인 후 자료실 연결을 구현한다.

기존8작품의 연출·음향 적용과 아래의 실제 native 재생 검증을 완료했다. 사람의 청취 품질 승인과 기존 자료의 공개 출시 권리 확정은 완료로 표시하지 않는다.

## 작품별 편집된 기준표

현재 연출표는8작품242장을126개 명시적 장면 그룹으로 묶고131개의 정확한 컷 참조를 포함한다. 선녀와 나무꾼59/8, 흥부와 놀부11/9, 옹고집전18/7, 별주부전14/5(놀스토리/원작)다. 각 참조에는 실제 컷ID·대본 문장·연출 의도가 있다. 불필요한 선택 전 암전, 행동을 하지 않은 문장에 붙었던 문 소리, 생각 속 ‘그 순간’ 강조음을 제거했다. 이 기준표는 출력파일과 함께 검증되며 문자열을 재생 때 매칭해 임의로 효과를 넣지 않는다.

`node scripts/export-directed-stories.cjs`는 원본 fixture를 변경하지 않고 전체2970컷의 강화본8개를 `evidence/existing-story-enhancement/`에 내보낸다. 기존 사용자 수정 작품은 카탈로그 보강을 재적용하지 않는다. 공식/pristine 판에만 적용하며 기존 직접 편집 호환 진입은 기존 데이터로 유지한다.

ElevenLabs 연결도 확인했으나 무료 생성물은 상업 사용 권한이 없고 비상업 공유도 출처 표시가 필요하다는 [공식 안내](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform)를 확인했다. 이번 자유로운 작품 파일/공통 음원 배포에는 해당 생성물을 포함하지 않았다. 연결됐다는 사실만으로 배포 조건을 충족한 것으로 취급하지 않는다.

박 효과음은 기존 낮은 악기 타격에서 불규칙한 목재 공명/접촉 소리로, 문은 마찰·삐걱임과 걸쇠 소리로 좁혀 보완했다. 제작·해시/디코딩·대역 검사와 한계는 음원 폴더의 `sonic-review.json`에 기록했다. 실제 녹음·국악기 샘플·사람의 청취 승인으로 표시하지 않는다.

## 확인된 Ren’Py 구현

고정8.5.3의 실제 native Fade/Dissolve를 `screens` layer에 적용한다. 자동 암전/흰전환/부드러운 전환은 실제 이전/다음 screen을 전환하고, 확인형/시점 전환의 설명·버튼 오버레이 의미는 유지한다. native 전환만 그리면서 기존 오버레이 timer를 제거하면 진행 잠금이 풀리지 않는 결함을 발견했고, 별도 완료 timer→presentationDone을 유지해 수정했다.

인물 등장·퇴장·이동은 실제 ATL linear로 구현하되 Core의 최종 rect/offset을 사용한다. 렌더 revision이 바뀌어도 실제 컷 진입 clock에서 경과/남은 시간을 계산해 처음부터 다시 움직이지 않는다. 오디오 첫 입력 대기·전환 완료 뒤 효과음 시작·줄인 동작·재시작/저장 복원 identity를 유지한다. 환경음은 native 별도 채널이며 장 진입/실제 읽은 경로의 명시 재생·유지·정지를 해석한다.

실제 native dissolve 중간/최종 픽셀, white fade 완료, 같은 진입 재연출 없음, ATL 동작 중 수정·최종 상태를 `verify-native-direction.mjs`로 확인했다. 기존 presenter, presentation refinement, responsive audio(환경음만의 시작·음악과 동시 재생·유지/정지/편집 정지) 검사도 통과했다. 증거는 [native 중간 전환](evidence/existing-story-enhancement/native-runtime/during-dissolve.png), [최종 전환](evidence/existing-story-enhancement/native-runtime/final-dissolve.png), [ATL 시작](evidence/existing-story-enhancement/native-runtime/atl-start.png), [같은 진입 수정 후 ATL 최종](evidence/existing-story-enhancement/native-runtime/atl-same-entry-final.png)에 보관한다.

## 검토 범위의 정직한 구분

원작335컷은 전체 경로를 실제 읽고, 놀스토리는 작품마다 첫 선택의 서로 다른 두 경로를 엔딩까지 읽는다. 이는 놀스토리 모든 조합의 전수 UI 재생이 아니다. 대신 전체2970컷/242장과131컷 연출 참조의 구조·자산·원문 보존을 계약 검사로 검증하고, 실제 경로에서 음악/환경음/효과음과 저장·기록·파일 보존을 추가 검증한다. 실제 음원 디코딩·native 채널/시간 진행과 사용자의 청취 취향 승인을 구분한다. 합성 음원의 자연음 현실감이나 사람의 청취 승인에 대해 수행하지 않은 검증을 주장하지 않는다.

## ElevenLabs 생성물 추적과 이후 교체

ElevenLabs 무료 생성물을 앞으로 시험할 때는 음원별 provider/generation ID, 생성 날짜, 생성 당시 요금제, 원본 파일 SHA256, 확인한 이용 조건 URL과 확인 날짜, 상업/재배포 허용 여부, 필요한 출처 표시, 상업화 전 교체 필요 여부, 후속 asset ID를 기록한다. 나중의 유료 전환을 과거 무료 생성물의 소급 권리 변경으로 간주하지 않는다. 권리 확보가 확인되지 않으면 재생성하거나 별도 음원으로 교체한다.

현재 배포용22음원과 강화8작품에는 ElevenLabs 생성물이 포함되지 않았다. `apps/web/public/assets/audio/story-score/third-party-audio-policy.json`의 currentElevenLabsAssets는 빈 목록이다. 앞으로 시험할 음원은 공통 asset ID에서 Chapter/Line의 music/ambience/sounds 참조를 추적하고, 원본 파일을 덮어써 이력을 잃지 않는다. 같은 의미의 음원은 기록된 자산 revision으로 교체하고, 의미가 다르면 새 ID와 명시적 참조 이동을 사용한다. 공식 작품뿐 아니라 저장·가져온 작품과 내보내기 첨부도 확인 대상이다.

## 전체 미디어 출처·권리 기록

사용자의 추가 지침에 따라 ElevenLabs뿐 아니라 배포되는 모든 이미지·음원·효과 자료·폰트를 `packages/asset-registry/src/media-provenance.json`에 전수 기록한다. 파일 경로·실제SHA256·자료 종류·자산ID·제공처·원본 경로·권리자·라이선스·상업 이용/재배포/출처표기 조건·생성 요금제·상업화 전 검토/교체 여부와 기존 작품의 참조 위치를 기록한다. 레거시의 ‘놀퀴즈’ copyright 표시는 보존하되, 그 문자열만으로 무료/상업 재배포 권한을 확인했다고 표시하지 않는다. 불명확한 자료는 unknown/unverified와 검토 필요 상태다.

`python3 scripts/media-provenance.py --check`는 현재 public/runtime 및 native game의 모든 미디어 파일이 기록되고 해시가 맞는지 검사한다. 검증된 권리 증빙은 `media-provenance-overrides.json`에 해당해시와 함께 기록해 목록 재생성 때 잃지 않으며 파일이 바뀌면 재검토를 요구한다. 업로드/가져온 음원도 미확인 출처 기록을 생성하고, optional provenance로 제공처·제작일/당시요금제·generation ID·조건URL·원본해시·후속자산ID를 .knolstory 첨부와 함께 보존한다.

무료 배포도 재배포 권리가 확인되지 않거나 금지된 경우 허용하지 않는다. 필요한 출처 표기를 제공하지 않으면 배포 판정도 불가하다. 무료 비상업 배포만 허용되는 자료는 별도 표시하고 상업 출시 전 교체·추가권리확보 대상으로 추적한다. `mediaReleaseDecision` 단위 검사로 이 규칙을 확인한다. 현재 권리가 미확인인 기존 자료에 대한 실제 공개/상업 출시 권리 정리는 완료됐다고 주장하지 않으며, 이 목표는 로컬 작품 강화와 검증이다. 공개 출시에는 그 항목의 증빙 확인이나 교체가 먼저 필요하다.

전체 미디어 권리 감사는 누락 없이 목록을 만드는 검사와 무료/상업 배포 가능 판정을 분리한다. `--release free` 또는 `--release commercial`은 재배포 권리가 미확인/금지된 파일이 있으면 실패한다. 현재 기존 이미지·SDK 부속 이미지 등의 명시적 권리 근거가 충분하지 않아 [무료 배포 권리 감사](evidence/existing-story-enhancement/free-release-rights-audit.json)는 차단 상태다. 이는 기록 누락을 숨기거나 ‘무료이므로 안전’이라고 판정하지 않는 결과다. 이 작업에서 실제 서비스 공개·배포·상업 출시를 하지 않는다. 기존 원고의 로컬 강화/비교와 신규22개 원본 합성 음원 권리 확보, 전체 출처/교체 추적을 진행했으며 기존 자료의 출시 권리 확정은 별도 증빙 확인/교체가 필요하다.

## 2026-10-08 최종 로컬 검증

새 이야기 대신 기존8작품의 강화본을 실제 Chrome Ren’Py에서 읽었다. 원작4개335컷 전체, 놀스토리4개 각 두 경로(선녀336/335, 흥부227/225, 옹고집168/170, 별주부153/153)를 엔딩까지 읽어 총2102컷 진입을 확인했다. 작품별 `*-native-reading.json`에 실제 컷 경로·선택·슬롯 복원·기록·파일 원고 일치 근거가 있다. 모든 갈래 조합의 UI 전수 검사로 확대 해석하지 않는다.

선녀 폭풍의 동일 원문 컷에서 보강 전 소리 없음, 보강 후 긴장 음악·비 환경음·붕괴 효과음과 배경 흔들림을 확인했다. [전후 기록](evidence/existing-story-enhancement/seonnyeo-storm-comparison.json), [보강 전](evidence/existing-story-enhancement/seonnyeo-storm-before.png), [보강 후](evidence/existing-story-enhancement/seonnyeo-storm-after.png). 여덟 작품 모두 실제 음악 디코딩 clock 진행을 확인했다. 인물 ATL의 지정 대기가 즉시 시작하던 결함도 실패하는 Python 검사부터 추가해 대기 후 보간하도록 수정했다.

최종761 unit/contract/integration, statement93.53%/branch91.30%/line98.13%, 타입·린트·production build 통과. 전체 통합의 host44/native19/DPR3 이후 출처 기록 변경에 직접 관련된 host3/native3, 전후 비교/8작품 디코딩2와 native 방향/환경음 검사를 추가 통과했다. 실제 Android 하드웨어나 사람의 청취 승인으로 주장하지 않는다. [검증 요약](evidence/existing-story-enhancement/verification-summary.json).

출처 필수 자료는 기록만으로 승인하지 않고 실제 배포 영역의 출처/라이선스 파일 존재까지 검사한다. Noto OFL 원문을 `apps/web/public/assets/licenses/NotoSansKR-OFL.txt`에 포함했다. 필수 표기 증거 없음·미확인 표기·CC0 예외의 Python3 검사를 통과했다. 무료 배포 감사는 여전히 미확인 기존 자료 때문에 실패하며, 이 결과는 예상된 출시 차단이다.

최종 독립 코드 검토에서 출처 기록 이전 IDB 음원이 기록 없이 내보내질 수 있던 경로를 발견했다. 조회 시 원본 바이트를 보존하면서 미확인 출처를 정규화하도록 수정하고 RED→GREEN 회귀 검사와 기존 서재/출처 파일 왕복 host5를 통과했다. 기록 이전 음원의 권리를 자동 허가하지 않는다.

## 2026-10-08 고정 제작 이력 추가 추적

레거시 현재 브랜치가 아닌 고정18da4fc에서 표지/공용 이미지, 세계관 배경v2, 인물 확장 묶음의 제작 영수증을 읽었다. 기록된 배포 SHA256과 현재 파일이 정확히 일치한15개 자산/45개 복사본에 생성 도구(image_gen), 생성일, 원본 해시, 제작 문서·영수증 및 영수증 해시를 연결했다. 영수증이 현재 파일과 일치하지 않는 자료에는 다른 자료의 제작 증거를 적용하지 않았다. 원본 영수증은 `evidence/existing-story-enhancement/provenance/`에 보존한다.

생성 계정·당시 요금제·배포 허가가 문서에 없으므로 그 항목은 미확인 상태를 유지한다. 이 추적은 제작 사실의 근거를 강화하며 권리 허가를 대신하지 않는다. 무료 배포 차단 판정은 변경하지 않는다.

## 전체 연출 컷 실제 런타임 검사

`node scripts/export-directed-stories.cjs --runtime-cues`는 현재 강화본8개의 project가 원고와 기준표에서 다시 계산한 값과 동일함을 먼저 검사하고, 정확한131개 연출 참조를 Core에서 play RuntimeScene으로 compile한다. `node spikes/renpy-web/verify-existing-cues.mjs`는 동일 Chrome/Ren’Py 인스턴스에서 그131개 컷을 직접 진입해 전환 완료, 실제 음악/환경음 채널 경로, 총102회의 정확한 효과음 시작 수를 확인했다. 같은 컷의 글 revision을 다시 보내도 음악·환경음·효과음 시작 수가 증가하지 않았다. 실제 페이드아웃 완료 전에 이전 곡이 보이는 정상 상태는 최종 채널 경로까지 기다려 검증했다.

[전체131컷 native 결과](evidence/existing-story-enhancement/all-cues-native.json). 이는 모든 지정 연출 컷의 실제 실행 검사이며, 모든 분기 조합을 읽었다는 의미가 아니다. 기존2102컷의 실제 경로/슬롯/기록/파일 검사와 함께 적용 범위를 입증한다. [목표 항목별 완료 감사](evidence/existing-story-enhancement/completion-audit.json). 음원의 자연음 현실감·음악 취향은 사람의 청취 승인으로 표시하지 않고, 공개 출시 권리 차단도 유지한다.
