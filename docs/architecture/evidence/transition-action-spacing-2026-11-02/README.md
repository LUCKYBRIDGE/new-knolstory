# 전환 화면 터치 조작 크기

현재 상태·검증·실패 보완·배포 경계는 [체크포인트](checkpoint.json)가 소유한다.

작품 구도와 글 분량은 유지하며 실제 표시 영역에 맞춰 확인 전환·수동 안내의 버튼 크기를 계산한다. 기존 전환 중 읽기 도구 숨김은 유지한다. 작품 파일 형식과 원고는 변경하지 않는다.

```sh
pnpm runtime:build
pnpm build
pnpm delivery:prepare --output .cache/pages-release-20261102-controls-final --pages-only
python3 scripts/serve-static-candidate.py --candidate .cache/pages-release-20261102-controls-final --port 15407
# 별도 터미널; 후보는 검사 중 수정하지 않는다.
pnpm exec playwright test --config docs/architecture/evidence/transition-action-spacing-2026-11-02/playwright.config.ts
node docs/architecture/evidence/transition-action-spacing-2026-11-02/measurement/measure-actions.mjs test-results/transition-action-spacing .cache/action-measurements.json
```

SDK 원본과 기존 엔진·전달 파일은 그대로다. [실행 파일 검토](runtime-review.json)는 기록된 정확한 bytes만 검토하며 재빌드 결과를 자동 승인하지 않는다. [변경 구성원](runtime-delta.json)을 함께 확인한다. 새 선택적 런타임 계약은 작품 파일이 아닌 일시적인 실행 장면 값이다.
