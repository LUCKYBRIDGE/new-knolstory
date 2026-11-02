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

별주부전 놀스토리 6경로와 원작 1경로도 실제 첫 컷부터 결말까지 통과했다(1,290컷별 검사). `rabbit-route-receipts/`에 완주별 기록을 보존했다. 흥부전과 합쳐 12경로이며, 옹고집전·선녀와 나무꾼 전체 경로는 아직 남아 있다.
