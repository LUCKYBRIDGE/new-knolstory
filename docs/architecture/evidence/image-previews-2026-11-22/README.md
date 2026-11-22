# 그림 미리보기 측정 — 2026-11-22

[그림 미리보기와 버전 캐시](../../image-previews-and-caching.md)의 측정 원자료.

- `prod-before-measure.json`: 운영(story.knolquiz.com, f0c0ee66)에서 `scripts/measure.mjs`.
- `local-before-*.json`: f0c0ee66 빌드의 로컬 정적 후보, `local-after-*.json`: 이 변경의 후보. 같은 `scripts/serve-static-candidate.py`로 띄웠다.
- 로컬 후보에는 API가 없어 `editor.mjs`·`thumbs.mjs`는 `BASE`가 있을 때 `/api`를 운영의 비로그인 응답(설정 200, 나머지 401)으로 대신한다.
- 로컬 서버는 304를 돌려주지 않으므로 "다시 방문" 숫자는 운영 값과 비교하지 않는다.
