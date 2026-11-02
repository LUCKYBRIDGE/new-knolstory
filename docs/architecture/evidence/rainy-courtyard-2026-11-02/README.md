# 비 오는 저녁 마당과 재회5컷

현재 구현·검증·배포·보존·한계는 [체크포인트](checkpoint.json)가 소유한다. [생성 기록](generation.json)과 [실제 프롬프트](prompt.md)는 새 그림의 원본·변환·고증 기준이며, 원래 초가집 그림을 덮어쓰지 않는다. 인물은 배경에 넣지 않고 기존 개별 이미지를 유지한다.

```sh
# 승인된 원본PNG를 로컬에 확보한 경우에만 파생 WebP를 다시 준비한다.
python3 scripts/prepare-rainy-courtyard-asset.py --help
pnpm exec vitest run packages/compatibility/tests/catalog-rainy-courtyard.test.ts packages/runtime-contract/src/weather-path.test.ts packages/asset-registry/tests/generated-weather-asset.test.ts
pnpm exec vitest run --config docs/architecture/evidence/rainy-courtyard-2026-11-02/measurement/vitest.config.ts
pnpm runtime:build
# 종료0을 확인한 다음 실행한다.
python3 docs/architecture/evidence/rainy-courtyard-2026-11-02/measurement/review-runtime.py
pnpm build
python3 scripts/media-provenance.py
pnpm test:media-provenance
pnpm delivery:prepare --output .cache/pages-release-20261102-rainy --pages-only
# 현재 공식원고/예상장면을Vite로 내보낸 뒤 native검사를 실행한다.
pnpm exec vitest run --config docs/architecture/evidence/catalog-weather-continuity-2026-11-02/measurement/vitest.config.ts -t 'exports the current'
python3 scripts/serve-static-candidate.py --candidate .cache/pages-release-20261102-rainy --port 15409
# 별도 터미널; 후보를검사중수정하지않는다.
pnpm exec playwright test --config docs/architecture/evidence/rainy-courtyard-2026-11-02/playwright.config.ts
```

새 이미지는 기존421고정원본과11생성그림과 구분하여 등록한다. 복원 도구는 Git에 있는 생성 파일의 해시를 확인하며 story-maker에서 찾지 않는다. API에서도433개목록을 확인해야 하며 정적파일 배포만으로 업로드 호환을 주장하지 않는다. 로그인한 이용자의 실제 업로드는 아직 별도다.
