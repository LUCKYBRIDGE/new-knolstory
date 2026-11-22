# 그림 미리보기와 버전 캐시

2026-11-22. 편집기·서재·그림책 목록이 원본 그림(약 1600×900, 장당 200~600KB)을 카드 크기로 줄여 보여 주던 문제를 고친 기준이다. 등록 그림의 소유·권리 기록은 [자산 파이프라인 스킬](../../.agents/skills/asset-pipeline/SKILL.md)과 [ADR 0026](../decisions/0026-static-reading-authoring-and-optional-api.md)을 따른다.

## 무엇을 어디에 쓰나

| 쓰는 곳 | 주소 | 비고 |
|---|---|---|
| 이미지 고르기 창, 고르기 단추, 장 자료 목록, 컷 자료 | `asset.previewSrc` | `AssetPreviewImage` |
| 서재 표지(작은 표지), 표지 디자인 견본, 그림책 보관함 표지 | `asset.previewSrc` | `BookCover`의 `compact` 또는 `preview` |
| 그림책 쓰기의 쪽 목록·삽화 고르기, 보내기 화면 쪽 목록·다른 그림 | `asset.previewSrc` | |
| 무대(Ren'Py), 읽기 화면, 큰 표지, A4 인쇄 | `asset.src` | 원본 |

- 주소 규칙은 `packages/asset-registry/src/image-previews.json` 하나가 정한다. 코드에서는 `resolveAsset(id)`의 `src`·`previewSrc`와 `imagePreviewPath()`를 쓴다.
- `src`는 `원본경로?v=<revision 앞 16자>`이다. `revision`은 원본 바이트의 SHA-256이다. 런타임은 계속 버전 없는 `runtimePath`를 쓴다.
- 미리보기는 `/assets/previews/v1/<revision 앞 16자>.webp`이다. 가로 512·세로 384 상자 안에 맞춘 WebP(품질 72)이고 투명도를 유지한다. 2026-11-22 기준 728장, 평균 21.5KB(가로 배경 35KB, 세로 인물 13KB), 총 15.3MB.
- 크기 근거: 고르기 창 배경 카드는 약 137×120px, 서재 표지 그림은 약 121×105px에 잘라 채운다. 휴대폰(DPR 3)에서 높이 약 360px이 필요해서, 384×216으로 줄이면 1.7배 늘어나 흐려졌다. 512×288은 DPR 2에서 그대로, DPR 3에서 약 1.25배다. 품질을 60까지 낮춰도 가로 배경이 35KB→30KB로만 줄어 72를 유지했다.
- 미리보기 파일이 없으면(공개 체크아웃처럼 비공개 원본이 없는 개발 환경) 카드는 원본으로 대신 보인다. 배포 검사는 미리보기가 빠지면 막는다.

## 만들기

- `scripts/build-image-previews.py`가 등록 그림마다 미리보기를 만들고 `manifest.json`에 미리보기 해시와 원본 해시를 함께 적는다. 결과는 git에 넣지 않는다(`.gitignore`).
- `pnpm build`(웹)는 `--strict`로 실행한다. Pillow나 원본 그림이 하나라도 없으면 빌드가 멈춘다. `pnpm dev`는 만들 수 있는 것만 만든다.
- 바뀐 원본만 다시 만든다. 처음 전체 생성은 약 15초, 이후는 1초 미만.
- 생성 설정(크기·품질·방식)을 바꾸면 `image-previews.json`의 `version`과 `directory`를 함께 올린다. 같은 주소의 내용이 바뀌면 긴 캐시가 옛 그림을 계속 보여 준다.

## 권리와 배포 검사

- 미리보기는 원본에서 만든 파생 파일이다. `media-provenance.json`에 따로 적지 않고(`scripts/media-provenance.py`가 `assets/previews/`를 건너뜀), `pnpm delivery:check`가 매니페스트로 원본 기록에 묶어 원본의 권리 판정을 그대로 이어받게 한다.
- 막는 경우: 매니페스트에 없는 미리보기(`unregistered-image-preview`), 미리보기 해시 불일치(`image-preview-hash-mismatch`), 원본 해시·경로 불일치(`image-preview-source-mismatch`), 등록 그림의 미리보기 누락(`missing-image-preview`).

## 캐시

- `apps/web/public/_headers`: `/assets/*`는 `public, max-age=31536000, immutable`. 버전 없는 주소를 쓰는 `/assets/audio/*`, `/assets/legacy-ui/*`, `/assets/licenses/*`, `/assets/loading/*`는 `! Cache-Control`로 떼어 호스트 기본값(매번 재확인)을 쓴다.
- `/runtime/*`는 그대로 `no-cache`다. 런타임 그림은 `knol-image-preload.js`가 이미지 버전별 Cache Storage와 `force-cache`로 따로 보관한다.
- 로컬 정적 후보 서버(`scripts/serve-static-candidate.py`)는 `?v=`가 파일 해시 앞 16자와 같거나 미리보기 경로일 때만 `immutable`을 보낸다.
- Worker(`server/operations/story-edge-worker.mjs`)는 Pages 응답의 `Cache-Control`을 그대로 전달한다. Worker가 넘겨 Mac mini가 직접 응답하는 경우에는 긴 캐시가 붙지 않을 뿐 동작은 같다.

## 그림책 나눠 불러오기

- 읽기 화면은 보이는 쪽만 그리고, 앞뒤 쪽 원본은 0.4초 뒤에 미리 받는다.
- 숨은 A4 인쇄 영역의 그림은 `loading="lazy"`다. A4 미리보기를 열거나 인쇄를 시작할 때(`beforeprint`, `print` 미디어 변경) 바로 불러온다.

## 측정 (고치기 전 f0c0ee66 ↔ 고친 뒤, 같은 로컬 정적 후보 서버)

측정 스크립트(`measure.mjs`, `editor.mjs`, `thumbs.mjs`)는 Playwright로 첫 방문의 전송 바이트를 잰다. 로컬 후보 서버는 304를 돌려주지 않으므로 "다시 방문"의 버전 없는 그림(`legacy-ui`)은 매번 다시 받는다. 원자료와 스크립트는 [측정 기록](evidence/image-previews-2026-11-22/README.md)에 있다.

| 화면 | 고치기 전 | 고친 뒤 | 줄어든 양 |
|---|---|---|---|
| 배경 고르기 창 열기 · 데스크톱 1280 | 71장 28,292KB | 71장 2,020KB | 93% |
| 배경 고르기 창 열기 · 휴대폰 390 DPR3 | 27장 8,116KB | 27장 701KB | 91% |
| 배경 고르기 끝까지 내림 · 휴대폰 | 27장 11,769KB | 27장 757KB | 94% |
| 고르기 창 해독 메모리 · 데스크톱 (필요 약 5MB) | 405MB | 42MB | 90% |
| 고르기 창 해독 메모리 · 휴대폰 (필요 약 17MB) | 157MB | 16MB | 90% |
| 서재 첫 방문 그림 | 13장 3,043KB | 13장 609KB | 80% |
| 그림책(별주부전) 원본 읽기 그림 | 11장 4,287KB | 6장 848KB | 80% |
| 보내기 화면 · 첫 무대까지 그림 | 13장 3,652KB | 14장 1,531KB | 58% |
| 편집 화면 · 무대 준비 그림 · 데스크톱 | 11장 1,984KB | 11장 1,499KB | 24% |

- 서재 첫 방문의 609KB 가운데 434KB는 방 꾸밈 그림(`legacy-ui`, 버전 없음)이다. 표지 8장은 175KB.
- 그림책은 1쪽·2쪽 원본과 보관함 표지 미리보기 4장만 받는다. A4 인쇄용 8쪽은 받지 않는다.
- 같은 스크립트로 잰 운영(prod, f0c0ee66)의 다시 방문은 서재 그림 2장·그림책 11장이 `304` 재확인 왕복이었다. 버전 주소와 `immutable`이 배포되면 이 왕복은 브라우저 캐시에서 끝난다(배포 후 확인 필요).

Cloudflare에 올린 뒤 실제 응답 헤더와 다시 방문 시 재확인 왕복이 사라졌는지는 배포 후 확인한다.
