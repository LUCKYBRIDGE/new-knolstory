# 제공 작품 전체 읽기 경로의 Ren’Py 검증

제공 작품의 실제 첫 컷에서 시작해 선택과 합류를 거쳐 결말까지 읽는 검사다. 흥부 놀스토리 네 경로와 원작 한 경로를 완료했으며, 별주부전 여섯 경로와 원작 한 경로를 같은 방식으로 확장한다. 공식 원고와 [단일 실행 계획](../../product-completion-plan.md#재개-지점)을 보존하며, 전체 8판본 완료와 구분한다.

## 예상 경로 갱신

```sh
pnpm exec vitest run --config docs/architecture/evidence/catalog-native-paths-2026-11-02/manifest.vitest.config.ts
```

[생성기](generate-manifest.test.ts)는 `resolveProvidedCatalogStory`로 현재 공식 작품을 해석하고 Runtime Core로 모든 선택 조합을 순회한다. [명세](manifest.json)는 작품 SHA·컷 ID·해석된 본문 SHA·선택 ID·최종 진행만 기록한다. 원고 본문을 복제하거나 브라우저에 경로를 주입하지 않는다. 생성 단계는 예상값의 구조 검사이며 실제 Ren’Py 검증과 다르다.

## 실제 실행

변경하지 않을 정적 배포 후보를 loopback15404에서 제공한다. 예시는 이번 실행에 사용한 로컬 후보 경로이며, 다른 컴퓨터에서는 해당 빌드로 후보를 준비해야 한다.

```sh
python3 scripts/serve-static-candidate.py --candidate .cache/pages-release-20261102-recovery --port 15404
pnpm exec playwright test --config docs/architecture/evidence/catalog-native-paths-2026-11-02/playwright.config.ts --grep 'heungbu (knolstory|original)-' --output=test-results/catalog-native-paths
pnpm exec playwright test --config docs/architecture/evidence/catalog-native-paths-2026-11-02/playwright.config.ts --grep 'rabbit (knolstory|original)-' --output=test-results/catalog-native-paths-rabbit
```

[검사](../../../../tests/e2e/catalog-reading-paths.spec.ts)는 각 경로마다 새 Playwright 브라우저 문맥을 사용한다. `/api`는503으로 응답하고, 실제 서재·판본 선택·처음부터 읽기 버튼으로 진입한다. 화면의 전체화면 제안만 검사 탭에서 생략한다. 원고·진행·선택 이력을 저장소에 쓰거나 컷 선택기로 건너뛰지 않는다.

컷마다 iframe이 실제로 받은 장면과 Ren’Py의 해당 revision 렌더 완료를 대조한다. 본문 SHA를 확인하고 글이 여러 쪽이면 실제 canvas 입력으로 넘긴다. 선택은 Ren’Py가 보고한 선택 창 좌표와 검증한 버튼 높이에 맞춰 클릭한다. 호스트의 숨겨진 선택 버튼이나 가짜 `postMessage` 입력을 사용하지 않는다. 마지막에 전체 컷 순서·native 선택 이벤트·선택 이력·종료 상태와 원고 불변을 확인한다.

단일 경로 제한은6분, 작업자는1명이다. 첫 시범 경로는227컷을 약2.1분에 완료했다. 확정 실행 결과는 `native-all-paths.log`와 실행 후 체크포인트를 확인한다. 최종 재실행과 다른 작품의 검증이 남아 있을 때 이를 전체 검증 완료로 확대하지 않는다.

이미지 증거·상세 attachment·실패 trace는 Git에서 제외된 `test-results/catalog-native-paths/`에 남는다. HTTP 요청 원시 기록 `preview.log`도 로컬에만 보존한다. 이 로컬 검사는 운영 Cloudflare 캐시 전환·느린 망·실기기·화면 읽기 프로그램 검증을 대신하지 않는다.

별주부전은 `manifest-rabbit.json`과 `native-rabbit-paths.log`를 사용한다. 흥부의 이미 통과한 경로/manifest는 별주부전 확장 때문에 다시 실행하거나 바꾸지 않는다. 새 실행은 `complete-path-evidence.json` 영수증을 실제 결과 폴더에 기록하며, 이전 list reporter 실행의 개별 attachment가 파일로 남지 않은 점과 구분한다.

별주부전 놀스토리 6경로와 원작 1경로도 실제 첫 컷부터 결말까지 통과했다(1,290컷별 검사). `rabbit-route-receipts/`에 완주별 기록을 보존했다. 흥부전과 합쳐 12경로이며, 옹고집전 창작16·원작1경로도 이어서 통과했다(2,543컷별 검사). 첫2경로와 나머지15경로를 겹치지 않는 두 묶음으로 실행했으며 영수증은 `onggojib-route-receipts/`에 보존한다. 세 작품 합계29경로/4,850컷별 검사이며 선녀와 나무꾼은 남아 있다.

옹고집전은 최신 전환 조작 빌드를15407에서 제공했다. `KNOL_CATALOG_BASE_URL`로 고정 후보 주소를 선택한다. 두 작업자를 쓸 때에도 각 경로는 독립 문맥이며 같은 경로를 반복하지 않는다. 자동 시점 안내는 실제 `presentationDone` 뒤 호스트가 다음 본문으로 이동하는 것을 확인한다.


## 선녀와 나무꾼의 검증 순서 — 2026-11-02

전체64창작+원작1경로의 현재 Core 명세는 `manifest-seonnyeo-all.json`에 남긴다. [분석](seonnyeo-coverage-analysis.json)으로 모든 고유 장면 상태·점수상태·선택 간선·합류 입구·결말을 포함하는14창작+원작1 완결 경로를 먼저 골랐다. 이는 동일한 앞부분의 반복을 줄이는 우선순위 변경이며, 나머지50조합 전체를 실제로 재생했다는 뜻이 아니다. 미실행 조합은 선택 명세의 `unrunFullCombinations`에 보존한다.

장면 서명은 고정 가로·기본 글씨에서 실제 전달된 본문·화자·배경·인물 위치/크기·선택·음향(시퀀스 진입ID 포함)·연출·수동 효과를 대조한다. 화면 크기·폰트·글상자 배치·브라우저 음향 세션ID 검증은 이 서명의 범위가 아니다. 기존 가로/세로 전환 조작·레이아웃 검사는 별도 근거로 유지한다. Core의 모든 점수상태 해석과 native 실제 선택/장면 대조도 구분한다.

```sh
KNOL_CATALOG_BASE_URL=http://127.0.0.1:15407 pnpm exec playwright test --config docs/architecture/evidence/catalog-native-paths-2026-11-02/playwright.config.ts --grep 'seonnyeo ' --fully-parallel --workers 2 --output=test-results/catalog-native-paths-seonnyeo
```

명세를 브라우저에 주입하지 않으며 선정된 각 경로는 새 문맥에서 실제 첫 컷부터 끝까지 읽는다. 이미 성공한 경로는 다음 묶음에서 제외한다. 이 범위가 통과해도 SD-04의 파일·조건 조합·느린망·실기기와 전체 native50조합은 남는다.

선녀의 우선14창작+원작1경로도 교정 전 고정 입력으로 통과했다(5,030컷별 검사). 다른 세 작품과 합계44완주/9,880컷별 검사다. `seonnyeo-route-receipts/`와 두 로그가 실제 실행 근거다. 남은50전체native 조합은 계속 미실행이다.

배경233컷 교정 뒤 미래 회귀의 기본 예상값은 `manifest-seonnyeo-weather-all.json`/`manifest-seonnyeo-weather-selected.json`이다. 이전 두 선녀 명세는 완료한native입력으로 봉인해 보존한다. 생성기는 기본 새weather이름에 기록하며 기존 파일이 다르면 덮어쓰지 않는다. 추가 의미 변경 시 `KNOL_SEONNYEO_MANIFEST_PREFIX=manifest-seonnyeo-새버전`(영문소문자/숫자/하이픈만)으로 새 근거를 만든다. 새expected파일 자체가 새native완주 증거는 아니다.

## 선녀와 나무꾼 남은 50경로 범위 스위치와 실행 결과 — 2026-11-10

`KNOL_CATALOG_SEONNYEO_SCOPE=remaining`을 주면 `manifest-seonnyeo-rainy-courtyard-all.json`에서 `-selected`에 이미 있는 경로를 뺀 50창작 경로만 읽는다(기본 15경로 범위는 변하지 않는다).

```sh
KNOL_CATALOG_BASE_URL=http://127.0.0.1:15410 KNOL_CATALOG_SEONNYEO_SCOPE=remaining pnpm exec playwright test --config docs/architecture/evidence/catalog-native-paths-2026-11-02/playwright.config.ts --grep 'seonnyeo ' --workers 1
```

실행 결과: 배포본(`pages-candidate-image-preload-20261103`, 원천 커밋 c2c49b18)을 정적 제공해 knolstory-1은 단독 4.1분, 나머지 49경로는 3.2시간에 모두 통과했다(실패·건너뜀 0). 합계 50경로·18,485컷별 검사다. 서재 화면 문구 도우미(`tests/e2e/library-entry.ts`)가 배포본 이후 바뀌었으므로 이 실행에서는 임시로 c2c49b18 시점의 도우미를 썼고 저장소에는 반영하지 않았다. 스펙 본문과 원고는 그 시점 이후 같다.
