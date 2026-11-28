# 박씨전 · ChatGPT Work에서 이어서 제작하기

GitHub 저장소는 `LUCKYBRIDGE/new-knolstory`이고 인수인계 브랜치는 **`codex/bakssi-work`**다. Work의 GitHub 연결에서 이 브랜치를 열고 저장소 루트의 [AGENTS.md](../../../AGENTS.md), [박씨전 제작 스킬](../../../.agents/skills/bakssi-production/SKILL.md), [그림 제작 기준](art-production.md)을 읽는다. 앞으로의 진행 기록과 이미지·검증을 이 브랜치 또는 여기서 분기한 브랜치에 이어서 남긴다.

> **Work에 처음 줄 요청**
>
> `LUCKYBRIDGE/new-knolstory`의 `codex/bakssi-work`에서 `docs/reference/bakssi/WORK-HANDOFF.md`와 `.agents/skills/bakssi-production/SKILL.md`를 읽고 박씨전을 완성해 줘. 먼저 [인물별 얼굴과 신체 비율](character-review.md)을 읽고, 서로 닮은 인물의 기본 그림부터 검토해 필요한 그림을 다시 그려 줘. 사용자 승인 박씨 얼굴을 유지하고, 포즈가 바뀌어도 인물별 머리·몸통·팔다리·손발의 크기를 기준 전신과 비교해 줘. 남은 삽화·배경·표정을 같은 화풍과 인물 기준으로 채워 줘. 실제 서재에서 원작·놀스토리·숏스토리를 확인하고 작업과 검증 결과를 브랜치에 남겨 줘.

## GitHub에 저장된 작업 상태

- 박씨 얼굴 개정본은 [나란히 비교한 그림](bakssi-face-comparison.jpg)에서 확인할 수 있다. 왼쪽은 허물 전 평상복, 가운데는 허물 뒤, 오른쪽은 허물 전 혼례복이다. 세 전신 원본은 레시피에 등록했다.
- 그림책 1·2쪽의 허물 전 얼굴이 혼례복과 평상복에서 이어지도록 턱선과 눈매를 보정했다. 5쪽은 허물 뒤의 타원형 턱과 눈매가 드러나도록 수정했다. 표지와 3쪽은 기존 그림을 사용하고, 비어 있던 2·4~10쪽은 새 그림을 등록했다. [숏스토리 비교판](shortstory-review-approved.jpg)에서 표지와 본문 10쪽을 순서대로 볼 수 있다. [허물 전후 얼굴 비교](shortstory-face-continuity.jpg)와 [허물 전 표정 비교](character-review-bakssi-pre-reveal.jpg)에서 얼굴 변화와 체격을 확인할 수 있다.
- 새 원고와 실제 앱 진입 코드, 표지·그림책·무대·인물 PNG/WebP, 자산 해시, 검증 코드가 체크인되어 있다. 실제 숏스토리 읽기에서 데스크톱과 폭 390px 세로로 열 쪽의 그림을 확인했다. 마지막 쪽 다시 열기와 A4 12쪽 PDF 출력도 검사했다.
- 2026-11-28 사용자 승인본을 반영한 체크포인트는 **100개 등록**이다. 인물·표정·동작 71개, 재생 배경 18개, 표지 1개, 그림책 내지 10개다. 이시백·용울대·용골대·이득춘·박 처사·김자점 대표 전신과 이시백 혼례복을 교체하고, 이시백 연적·용골대 슬픔·박씨의 헌 신·계화의 쌀자루를 추가했다. [등록 영수증](../../../assets/source/bakssi/generation.json) · [인물 보정 전후](character-review-approved.jpg) · [표정·동작과 대표 전신 비교](character-review-variants.jpg)
- 이득춘의 옷깃을 여미는 기쁨, 노란 댕기 아이의 안도, 우물집 할머니의 웃음 섞인 핀잔을 사용자 승인본으로 등록했다. [새 표정 비교판](character-review-supporting-expressions.jpg)
- 혼례복 박씨의 슬픔, 우물집 할머니의 기쁨, 솔이 어머니의 안도와 용골대의 세 표정을 사용자 승인본으로 등록했다. [표정 비교판](character-review-wedding-yonggoldae.jpg)
- 박 처사·용울대의 표정 8장과 박씨·솔이의 장면 동작 2장을 사용자 승인본으로 등록했다. [표정·동작 비교판](character-review-park-yonguldae-actions.jpg)
- 달밤·가을비·눈·초봄의 피화당 마당, 피화당 축사, 도자기 가마터, 빈 어전, 겨울 우물을 사용자 승인본으로 반영했다. [배경 비교판](stage-review-approved.jpg)에서 8장을 확인할 수 있다.
- 기본 그림 이외의 표정 추가, 최종 공용 미디어와 실제 Ren’Py 전 경로 검증은 남아 있다. 원고 생성·분기·대상 컷 배정, 기존 인물 스프라이트 48개와 허물 전 박씨의 새 표정 4개의 등록 규격, 원작과 놀스토리의 고유 장면 506컷 배경 등록을 확인했다. Ren’Py 8.5.3에서 신규 인물·동작을 검수한 장면 13개와 신규 배경을 검수한 장면 8개를 가로와 폭 390px 세로에서 각각 재생했다. 승인 원본 음원이 필요한 전체 앱 빌드와 음원 포함 재생은 남아 있다.

## 이어받은 파일

| 소유 파일 | 이어서 할 일 |
| --- | --- |
| [원작 읽기](박씨전_원작.md), [놀스토리](박씨전_놀스토리.md), [숏스토리](박씨전_숏스토리.md) | 원작 91컷, 놀스토리 415개 고유 컷·8개 경로·4개 결말, 숏스토리 표지와 10쪽. 문장은 이 파일에서 편집하고 아래 생성기로 앱 원고를 갱신한다. |
| [원고 생성기](../../../scripts/prepare-bakssi-manuscripts.py), [읽기 데이터](../../../packages/compatibility/src/bakssi-stories.ts), [무대 배정](../../../packages/compatibility/src/bakssi-staging.ts) | Stage의 대사와 인물·동작·배경을 검수한다. 내보내는 작품의 ID는 원작 `classic-bakssi-tale`, 놀스토리 `bakssi-knolstory`, 그림책 작품 키는 `bakssi`다. |
| [자산 레시피](../../../assets/source/bakssi/recipe.json), [자산 등록기](../../../scripts/prepare-bakssi-assets.py) | PNG와 만든 WebP를 대조하고, 기존 그림 신규 등록과 빠진 자산 제작을 진행한다. 레시피는 예정 목록, `generation.json`은 실제 등록 목록이다. |
| [서재 묶음](../../../apps/web/lib/builtin-works.ts), [그림책 제공판](../../../packages/compatibility/src/shortstory-originals.ts), [재생 E2E](../../../tests/e2e/bakssi-runtime.spec.ts) | 로컬 서재에서 각 판의 표지·첫 컷·마지막 컷을 확인한다. 원작·놀스토리·숏스토리용 독후 활동지는 각각 두 장이다. 박씨전 학급 미션의 작품 키는 기존 SQL 이력을 유지하는 추가 마이그레이션을 사용한다. |

## 우선순위

[인물별 얼굴과 신체 비율](character-review.md)에 현재 비교판과 재생성 우선순위, 자세별 크기 확인 방법을 정리했다. 새 표정과 삽화 제작 전에 필요한 기본 전신을 확정한다.

1. **박씨의 허물 전후 차이를 책과 재생 화면까지 유지한다.** 비교 시안 중 사용자가 마지막에 고른 [박씨 얼굴 기준](bakssi-face-comparison.jpg)을 사용한다. 얼굴을 더 과장하지 않고 승인 PNG를 첫 번째 참조로 쓴다. 평상복과 혼례복, 원작과 놀스토리 B에서 허물 전 얼굴이 같은 사람으로 이어져야 한다. 연출에서 외모로 사람을 판단한 책임은 시백에게 있다.
2. 등록 목록과 도착한 그림을 비교한다. 완성된 표지와 PNG는 이 브랜치에서 바로 사용한다. 미등록 원본이나 다른 세션 결과는 파일의 출처를 확인한 뒤 이 브랜치의 원본 폴더로 가져온다. 개인 다운로드나 로컬 생성 경로에 의존하는 작품 파일은 만들지 않는다.
3. 기본 인물에서 빠진 표정을 [그림 기준](art-production.md) 순서대로 채운다. 등록 레시피상 기본 자산 외에 인물마다 일상·기쁨·분노·슬픔·웃음의 구별되는 그림을 확인한다. 허물 전과 후의 표정을 잘못 섞지 않는다. 투명 여백, 발 기준선, 같은 인물의 키, 그림책의 페이지별 핵심 행동을 검수한다.
4. 원작과 놀스토리에서 배경, 등장인물, 표정, 소품과 소리의 타이밍을 확인한다. 특히 원작과 A 갈래의 허물 벗는 컷, B 갈래에서 얼굴이 계속 같은 점, 피화당 눈보라·움직이는 등불, 국자와 물동이가 각 결말에서 이어지는 점을 본다.
5. 등록·빌드·실제 로컬 읽기를 마치고, 확인한 화면과 검사의 범위를 기록한다. 저장소에 저장한 상태와 공개 서비스 반영은 각각 확인한다.

## 이어서 실행할 검사

```sh
pnpm install --frozen-lockfile
python3 scripts/prepare-bakssi-manuscripts.py --check
python3 scripts/prepare-bakssi-assets.py
python3 scripts/prepare-bakssi-assets.py --check --complete --require-emotions
pnpm test:character-registration
KNOL_BAKSSI_REQUIRE_ART=1 pnpm exec vitest run packages/runtime-core/tests/bakssi-story-paths.test.ts packages/compatibility/tests/shortstory-library.test.ts
pnpm runtime:build
pnpm build
pnpm test:media-provenance
pnpm docs:check
pnpm test:docs
pnpm test:e2e:registry
pnpm exec playwright test tests/e2e/bakssi-runtime.spec.ts --project=stories-runtime
pnpm exec playwright test tests/e2e/four-work-library.spec.ts tests/e2e/four-work-shortstory.spec.ts --project=stories-runtime
```

[README의 재현 명령](../../../README.md)을 먼저 확인한다. 공용 미디어나 SDK가 빠져 있으면 저장소의 [자산 준비 절차](../../../.agents/skills/asset-pipeline/SKILL.md)와 [Ren’Py 작업 절차](../../../.agents/skills/renpy-runtime/SKILL.md)에서 접근 가능한 복구 경로를 확인한다. 원작 91컷과 놀스토리 전체 경로는 독립된 실제 브라우저 보관함에서 검증한다. 가로와 390px 세로에서 인물 크기·잘림·가독성, 숏스토리 열 쪽 모두의 그림·글, 사본을 만든 뒤 다시 열기, A4 미리보기도 확인한다.
