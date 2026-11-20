# 무대 기준 재제작 그림 검토 — 2026-11-21

[제작 요청](../../picturebook-image-production-requests.md#무대-배치를-덜-고려하고-그린-그림-다시-만들기-2026-11-20-검사)과 [가려짐·잘림 기준](../../picturebook-image-production-requests.md#무대에서-가려짐과-잘림의-기준-2026-11-20-측정)에 따라 다시 만든 인물 그림 33점의 등록·무대 검토 기록이다. 그림마다 원본과 나란히 놓은 비교 이미지(`*-comparison.jpg`)와 해시·알파 경계·키 비율은 [image-generation.json](image-generation.json)에 있다.

## 등록 (Codex)

| 묶음 | 새 ID | 키 (기준 인물 대비) | 만든 방법 |
|---|---|---|---|
| 제비 7점 | `heungbu.character.swallow-staged-v1`, `supporting-swallow-{fly,injured}-staged-v1`, `emotion-swallow-*-v4` | 흥부의 0.25 | 다시 그림 2점(들보 없음), 기존 그림을 표준 캔버스에 맞춰 줄임 5점 |
| 용마에 탄 나무꾼 2점 | `seonnyeo.character.classic-woodcutter-riding-horse-staged-v1`, `classic-horse-startled-by-porridge-staged-v1` | 1200×1200, 나무꾼의 1.054 | 다시 그림. 용마가 왼쪽을 본다 |
| 수탉 5점 | `seonnyeo.character.classic-rooster-calling-sky-staged-v1`, `emotion-rooster-*-v4` | 나무꾼의 0.4 | 다시 그림 2점, 줄임 3점 |
| 사슴 6점 | `seonnyeo.character.classic-deer-staged-v1`, `creative.character.seonnyeo-deer-listen-staged-v1`, `emotion-deer-*-v4` | 나무꾼의 0.6 | 다시 그림 1점, 줄임 5점 |
| 날개옷 | `seonnyeo.character.classic-wing-robe-staged-v1` | 나무꾼의 0.45 | 줄임 |
| 게 신하 7점 | `rabbit-turtle.character.layered-crab-courtier-staged-v1`, `supporting-crab-courtier-{apology,argue}-staged-v1`, `emotion-turtle-crab-courtier-*-v4` | 자라의 0.7, 꼿꼿이 선 자세 | 다시 그림 |
| 길거리 여자아이 4점 | `heungbu.character.child-06-staged-v1`, `emotion-street-girl-*-v4` | 같은 아이와 1.0 | 서 있는 자세로 다시 그림 3점, 줄임 1점 |
| 날아오르는 선녀 | `seonnyeo.character.picturebook-fairy-ascending-with-children-v3` | v2와 1.0 | 얼굴을 x 190~1009 안으로 옮겨 다시 그림 |

옛 그림과 이미 만든 작품은 그대로 둔다. 새 그림은 모두 `placementReview`를 가진다.

## 런타임 반영 (Claude)

- 사슴·수탉·날개옷의 무리 단위 축소(0.72·0.48·0.65)와 용마 1.4배 확대는 `placementReview`가 없는 옛 그림에만 걸린다. 새 그림은 그린 키 그대로(`scale 1`) 놓인다. (`stage-view.ts` `stageCharacterScale`)
- 새 용마 그림 2점은 옛 그림과 같이 한 사람 몫 자리를 쓰는 묶음 그림으로 놓인다(`framing-full`, 가운데 공유 배치).
- 승인된 조합 모두를 가로·세로 첫 무대에서 재는 검사(`packages/runtime-core/tests/picturebook-recipe-stage-safety.test.ts`)를 더했다. 세로 화면 옆 잘림 15% 이하, 모든 인물이 대사창 위로 무대 높이의 10% 이상 남아야 한다. 예외는 검토 이유와 함께 검사 안에 적는다(별주부전 4쪽 `classic-riding` 17%: 얼굴은 남고 소매 끝만 나감).

## 실제 무대 검토 (정적 빌드, 가로 편집 16:9 · 세로 읽기 9:16)

| 쪽 | 새 그림 | 결과 |
|---|---|---|
| 선녀와 나무꾼 5쪽 | 선녀 v3 | **승인(v6).** 가로: 놀란 나무꾼(왼쪽)과 구름 자락을 타고 오르는 선녀(오른쪽). 세로: 선녀와 두 아이의 얼굴이 모두 화면 안. v2의 세로 얼굴 잘림이 해결됨. |
| 선녀와 나무꾼 8쪽 | 용마에 탄 나무꾼 | **승인(v2).** 가로: 용마가 어머니 쪽을 보고, 탄 나무꾼이 어머니와 어울리는 키. 세로: 나무꾼 얼굴과 말 머리가 화면 안. |
| 선녀와 나무꾼 10쪽 | 수탉 | **승인(v2).** 실제 키의 수탉은 가로 무대에서 대사창에 거의 가려져서, 수탉이 주인공인 이 쪽만 조합에서 1.4배(허용 최대)로 키웠다. 가로·세로 모두 수탉 몸 전체가 대사창 위. |
| 흥부와 놀부 4쪽 | 제비 | **새 그림 쓰지 않음.** 흥부 키의 0.25인 제비는 1.4배로 키워도 가로에서 대사창에 가리고 세로에서 맨 아래에 붙는다. 전에 승인한 조합(v2, 옛 제비 0.6배)을 유지한다. 흥부에게 날아드는 제비를 함께 그린 묶음 그림을 새로 요청했다. |

기본 네 작품 34쪽은 모두 승인 조합을 가진다.
