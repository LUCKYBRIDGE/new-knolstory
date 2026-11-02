# 비·낮·밤 배경의 서사 연결

[현재 체크포인트](checkpoint.json)는 수동 문맥·233컷 범위·보존·실패 보완·검증·배포 경계를 소유한다. [컷별 차이](path-delta.json)는 기존64경로의 본문·선택·합류·결말과 배경 외 장면 값이 유지되는지 대조한 결과다.

첫 폭풍의 양쪽 반응, 두 번째 폭풍 장 안의 밤→다음 날 낮→달빛 이동, 저녁 실내만 기존 인물 없는 배경으로 연결했다. 비가 오는 마당의 재회5컷은 별도 제작이 필요하며 교정하지 않았다.

```sh
pnpm exec vitest run packages/compatibility/tests/catalog-weather-continuity.test.ts packages/compatibility/tests/catalog-weather-upgrade.test.ts packages/compatibility/tests/reader-text.test.ts
pnpm exec vitest run --config docs/architecture/evidence/catalog-weather-continuity-2026-11-02/measurement/vitest.config.ts
pnpm build
pnpm delivery:prepare --output .cache/pages-release-20261102-weather --pages-only
python3 scripts/serve-static-candidate.py --candidate .cache/pages-release-20261102-weather --port 15408
# 별도 터미널; 검사 중 후보를 변경하지 않는다.
pnpm exec playwright test --config docs/architecture/evidence/catalog-weather-continuity-2026-11-02/playwright.config.ts
```

Vitest의 `export-current.test.ts`는 현재 공식 resolver 결과와 가로/세로 Core 예상 장면을 `.cache/catalog-weather-current-project.json`, `.cache/catalog-weather-expected-scenes.json`에 생성한다. Playwright에서 JSON을 직접 import하는 Node 설정 문제를 피하며, 브라우저 저장소나 읽기 경로를 주입하지 않는다. 새 머신에서는 이 생성 명령부터 실행한다.

기존 긴native완주는 교정 전233배경의 고정 후보에서 실행했다. 그 경로 근거를 반복하거나 덮어쓰지 않고, 새233배경 변경은64경로Core차이와 별도집중native검사로 연결한다. 이를 모든64조합의 새native완주나 실기기 검증으로 확대하지 않는다.
