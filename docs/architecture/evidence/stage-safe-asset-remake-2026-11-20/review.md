# 무대 기준 재제작 그림 검토 — 2026-11-21

[제작 요청](../../picturebook-image-production-requests.md#무대-배치를-덜-고려하고-그린-그림-다시-만들기-2026-11-20-검사)과 [가려짐·잘림 기준](../../picturebook-image-production-requests.md#무대에서-가려짐과-잘림의-기준-2026-11-20-측정)에 따라 다시 만든 인물 그림 33점과 흥부·제비 묶음 1점의 등록·무대 검토 기록이다. 그림마다 원본과 나란히 놓은 비교 이미지(`*-comparison.jpg`)와 해시·알파 경계·키 비율은 [image-generation.json](image-generation.json)에 있다.

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

## 묶음 추가 전 실제 무대 판정 (가로 편집 16:9 · 세로 읽기 9:16)

| 쪽 | 새 그림 | 결과 |
|---|---|---|
| 선녀와 나무꾼 5쪽 | 선녀 v3 | **승인(v6).** 가로: 놀란 나무꾼(왼쪽)과 구름 자락을 타고 오르는 선녀(오른쪽). 세로: 선녀와 두 아이의 얼굴이 모두 화면 안. v2의 세로 얼굴 잘림이 해결됨. |
| 선녀와 나무꾼 8쪽 | 용마에 탄 나무꾼 | **승인(v2).** 가로: 용마가 어머니 쪽을 보고, 탄 나무꾼이 어머니와 어울리는 키. 세로: 나무꾼 얼굴과 말 머리가 화면 안. |
| 선녀와 나무꾼 10쪽 | 수탉 | **승인(v2).** 실제 키의 수탉은 가로 무대에서 대사창에 거의 가려져서, 수탉이 주인공인 이 쪽만 조합에서 1.4배(허용 최대)로 키웠다. 가로·세로 모두 수탉 몸 전체가 대사창 위. |
| 흥부와 놀부 4쪽 | 제비 | **새 그림 쓰지 않음.** 흥부 키의 0.25인 제비는 1.4배로 키워도 가로에서 대사창에 가리고 세로에서 맨 아래에 붙는다. 전에 승인한 조합(v2, 옛 제비 0.6배)을 유지한다. 흥부에게 날아드는 제비를 함께 그린 묶음 그림을 새로 요청했다. |

이 검토 시점에는 기본 네 작품 34쪽 모두 승인 조합이 있었다. 아래 최종 확인에서는 흥부 4쪽에 새 조립 검토 조합(v3)을 적용했다.

## 최종 빌드의 확인 이미지

등록한 34점의 단독 컷 68장과 그림책 조합 8장을 현재 Ren’Py 빌드에서 기록했다. 노란 점선은 각 렌더링에서 Ren’Py가 반환한 대사창 윗선이다. 원본 비교의 안내선은 제작 캔버스 좌표를 보여 준다.

| 작품과 쪽 | 가로 편집 | 세로 읽기 |
|---|---|---|
| 흥부와 놀부 4쪽 | [가로](recipes/heungbu-04-landscape.jpg) | [세로](recipes/heungbu-04-portrait.jpg) |
| 선녀와 나무꾼 5쪽 | [가로](recipes/seonnyeo-05-landscape.jpg) | [세로](recipes/seonnyeo-05-portrait.jpg) |
| 선녀와 나무꾼 8쪽 | [가로](recipes/seonnyeo-08-landscape.jpg) | [세로](recipes/seonnyeo-08-portrait.jpg) |
| 선녀와 나무꾼 10쪽 | [가로](recipes/seonnyeo-10-landscape.jpg) | [세로](recipes/seonnyeo-10-portrait.jpg) |

흥부 4쪽 v3은 **승인**했다(2026-11-21, Claude). 흥부 4쪽 v2와 선녀 5·8·10쪽의 당시 판정은 위에 남겼다. 조합 교체 이력은 [제작 기록](image-generation.json)의 `recipeRevisions`에 있다.

흥부 4쪽 v3은 쪼그린 흥부의 눈과 내민 손, 제비의 부리와 박씨가 두 화면에서 대사창 위에 놓인다. 가로에서는 흥부의 하단이 대사창에 일부 가려지고, 작은 박씨가 배경과 섞여 세로보다 찾기 어렵다. 세로에서는 박씨와 두 인물이 프레임 안에 보인다.

흥부·제비 묶음의 보이는 높이 720px는 서 있는 기준 흥부의 0.72배다. 묶음 전체에서 잰 값이다. 손과 박씨의 위치를 맞추려고 몸을 늘이거나 제비의 몸통을 키우지 않고, 흥부가 몸을 낮추고 손을 드는 자세로 그렸다.

## 그림별 제작 기록과 단독 무대

| 새 자산 ID | 키 비율 | 원본 비교 | 가로 무대 | 세로 무대 |
|---|---:|---|---|---|
| seonnyeo.character.picturebook-fairy-ascending-with-children-v3 | 1.0000 | [비교](seonnyeo-picturebook-fairy-ascending-with-children-v3-comparison.jpg) | [가로](individual/seonnyeo.character.picturebook-fairy-ascending-with-children-v3-landscape.jpg) | [세로](individual/seonnyeo.character.picturebook-fairy-ascending-with-children-v3-portrait.jpg) |
| seonnyeo.character.classic-woodcutter-riding-horse-staged-v1 | 1.0539 | [비교](seonnyeo-classic-woodcutter-riding-horse-staged-v1-comparison.jpg) | [가로](individual/seonnyeo.character.classic-woodcutter-riding-horse-staged-v1-landscape.jpg) | [세로](individual/seonnyeo.character.classic-woodcutter-riding-horse-staged-v1-portrait.jpg) |
| seonnyeo.character.classic-horse-startled-by-porridge-staged-v1 | 1.0539 | [비교](seonnyeo-classic-horse-startled-by-porridge-staged-v1-comparison.jpg) | [가로](individual/seonnyeo.character.classic-horse-startled-by-porridge-staged-v1-landscape.jpg) | [세로](individual/seonnyeo.character.classic-horse-startled-by-porridge-staged-v1-portrait.jpg) |
| heungbu.character.swallow-staged-v1 | 0.2500 | [비교](heungbu-swallow-staged-v1-comparison.jpg) | [가로](individual/heungbu.character.swallow-staged-v1-landscape.jpg) | [세로](individual/heungbu.character.swallow-staged-v1-portrait.jpg) |
| heungbu.character.supporting-swallow-fly-staged-v1 | 0.2500 | [비교](heungbu-supporting-swallow-fly-staged-v1-comparison.jpg) | [가로](individual/heungbu.character.supporting-swallow-fly-staged-v1-landscape.jpg) | [세로](individual/heungbu.character.supporting-swallow-fly-staged-v1-portrait.jpg) |
| heungbu.character.supporting-swallow-injured-staged-v1 | 0.2500 | [비교](heungbu-supporting-swallow-injured-staged-v1-comparison.jpg) | [가로](individual/heungbu.character.supporting-swallow-injured-staged-v1-landscape.jpg) | [세로](individual/heungbu.character.supporting-swallow-injured-staged-v1-portrait.jpg) |
| heungbu.character.emotion-swallow-joy-v4 | 0.2500 | [비교](heungbu-emotion-swallow-joy-v4-comparison.jpg) | [가로](individual/heungbu.character.emotion-swallow-joy-v4-landscape.jpg) | [세로](individual/heungbu.character.emotion-swallow-joy-v4-portrait.jpg) |
| heungbu.character.emotion-swallow-anger-v4 | 0.2500 | [비교](heungbu-emotion-swallow-anger-v4-comparison.jpg) | [가로](individual/heungbu.character.emotion-swallow-anger-v4-landscape.jpg) | [세로](individual/heungbu.character.emotion-swallow-anger-v4-portrait.jpg) |
| heungbu.character.emotion-swallow-sorrow-v4 | 0.2500 | [비교](heungbu-emotion-swallow-sorrow-v4-comparison.jpg) | [가로](individual/heungbu.character.emotion-swallow-sorrow-v4-landscape.jpg) | [세로](individual/heungbu.character.emotion-swallow-sorrow-v4-portrait.jpg) |
| heungbu.character.emotion-swallow-mirth-v4 | 0.2500 | [비교](heungbu-emotion-swallow-mirth-v4-comparison.jpg) | [가로](individual/heungbu.character.emotion-swallow-mirth-v4-landscape.jpg) | [세로](individual/heungbu.character.emotion-swallow-mirth-v4-portrait.jpg) |
| seonnyeo.character.classic-rooster-calling-sky-staged-v1 | 0.4132 | [비교](seonnyeo-classic-rooster-calling-sky-staged-v1-comparison.jpg) | [가로](individual/seonnyeo.character.classic-rooster-calling-sky-staged-v1-landscape.jpg) | [세로](individual/seonnyeo.character.classic-rooster-calling-sky-staged-v1-portrait.jpg) |
| seonnyeo.character.emotion-rooster-joy-v4 | 0.4132 | [비교](seonnyeo-emotion-rooster-joy-v4-comparison.jpg) | [가로](individual/seonnyeo.character.emotion-rooster-joy-v4-landscape.jpg) | [세로](individual/seonnyeo.character.emotion-rooster-joy-v4-portrait.jpg) |
| seonnyeo.character.emotion-rooster-anger-v4 | 0.4301 | [비교](seonnyeo-emotion-rooster-anger-v4-comparison.jpg) | [가로](individual/seonnyeo.character.emotion-rooster-anger-v4-landscape.jpg) | [세로](individual/seonnyeo.character.emotion-rooster-anger-v4-portrait.jpg) |
| seonnyeo.character.emotion-rooster-sorrow-v4 | 0.4301 | [비교](seonnyeo-emotion-rooster-sorrow-v4-comparison.jpg) | [가로](individual/seonnyeo.character.emotion-rooster-sorrow-v4-landscape.jpg) | [세로](individual/seonnyeo.character.emotion-rooster-sorrow-v4-portrait.jpg) |
| seonnyeo.character.emotion-rooster-mirth-v4 | 0.4301 | [비교](seonnyeo-emotion-rooster-mirth-v4-comparison.jpg) | [가로](individual/seonnyeo.character.emotion-rooster-mirth-v4-landscape.jpg) | [세로](individual/seonnyeo.character.emotion-rooster-mirth-v4-portrait.jpg) |
| seonnyeo.character.classic-deer-staged-v1 | 0.5998 | [비교](seonnyeo-classic-deer-staged-v1-comparison.jpg) | [가로](individual/seonnyeo.character.classic-deer-staged-v1-landscape.jpg) | [세로](individual/seonnyeo.character.classic-deer-staged-v1-portrait.jpg) |
| creative.character.seonnyeo-deer-listen-staged-v1 | 0.5998 | [비교](creative-seonnyeo-deer-listen-staged-v1-comparison.jpg) | [가로](individual/creative.character.seonnyeo-deer-listen-staged-v1-landscape.jpg) | [세로](individual/creative.character.seonnyeo-deer-listen-staged-v1-portrait.jpg) |
| seonnyeo.character.emotion-deer-joy-v4 | 0.6467 | [비교](seonnyeo-emotion-deer-joy-v4-comparison.jpg) | [가로](individual/seonnyeo.character.emotion-deer-joy-v4-landscape.jpg) | [세로](individual/seonnyeo.character.emotion-deer-joy-v4-portrait.jpg) |
| seonnyeo.character.emotion-deer-anger-v4 | 0.5998 | [비교](seonnyeo-emotion-deer-anger-v4-comparison.jpg) | [가로](individual/seonnyeo.character.emotion-deer-anger-v4-landscape.jpg) | [세로](individual/seonnyeo.character.emotion-deer-anger-v4-portrait.jpg) |
| seonnyeo.character.emotion-deer-sorrow-v4 | 0.5998 | [비교](seonnyeo-emotion-deer-sorrow-v4-comparison.jpg) | [가로](individual/seonnyeo.character.emotion-deer-sorrow-v4-landscape.jpg) | [세로](individual/seonnyeo.character.emotion-deer-sorrow-v4-portrait.jpg) |
| seonnyeo.character.emotion-deer-mirth-v4 | 0.5998 | [비교](seonnyeo-emotion-deer-mirth-v4-comparison.jpg) | [가로](individual/seonnyeo.character.emotion-deer-mirth-v4-landscape.jpg) | [세로](individual/seonnyeo.character.emotion-deer-mirth-v4-portrait.jpg) |
| rabbit-turtle.character.emotion-turtle-crab-courtier-joy-v4 | 0.7000 | [비교](rabbit-turtle-emotion-turtle-crab-courtier-joy-v4-comparison.jpg) | [가로](individual/rabbit-turtle.character.emotion-turtle-crab-courtier-joy-v4-landscape.jpg) | [세로](individual/rabbit-turtle.character.emotion-turtle-crab-courtier-joy-v4-portrait.jpg) |
| heungbu.character.child-06-staged-v1 | 1.0000 | [비교](heungbu-child-06-staged-v1-comparison.jpg) | [가로](individual/heungbu.character.child-06-staged-v1-landscape.jpg) | [세로](individual/heungbu.character.child-06-staged-v1-portrait.jpg) |
| heungbu.character.emotion-street-girl-joy-v4 | 1.0000 | [비교](heungbu-emotion-street-girl-joy-v4-comparison.jpg) | [가로](individual/heungbu.character.emotion-street-girl-joy-v4-landscape.jpg) | [세로](individual/heungbu.character.emotion-street-girl-joy-v4-portrait.jpg) |
| heungbu.character.emotion-street-girl-sorrow-v4 | 1.0000 | [비교](heungbu-emotion-street-girl-sorrow-v4-comparison.jpg) | [가로](individual/heungbu.character.emotion-street-girl-sorrow-v4-landscape.jpg) | [세로](individual/heungbu.character.emotion-street-girl-sorrow-v4-portrait.jpg) |
| heungbu.character.emotion-street-girl-mirth-v4 | 1.0475 | [비교](heungbu-emotion-street-girl-mirth-v4-comparison.jpg) | [가로](individual/heungbu.character.emotion-street-girl-mirth-v4-landscape.jpg) | [세로](individual/heungbu.character.emotion-street-girl-mirth-v4-portrait.jpg) |
| rabbit-turtle.character.layered-crab-courtier-staged-v1 | 0.7000 | [비교](rabbit-turtle-layered-crab-courtier-staged-v1-comparison.jpg) | [가로](individual/rabbit-turtle.character.layered-crab-courtier-staged-v1-landscape.jpg) | [세로](individual/rabbit-turtle.character.layered-crab-courtier-staged-v1-portrait.jpg) |
| rabbit-turtle.character.supporting-crab-courtier-apology-staged-v1 | 0.7000 | [비교](rabbit-turtle-supporting-crab-courtier-apology-staged-v1-comparison.jpg) | [가로](individual/rabbit-turtle.character.supporting-crab-courtier-apology-staged-v1-landscape.jpg) | [세로](individual/rabbit-turtle.character.supporting-crab-courtier-apology-staged-v1-portrait.jpg) |
| rabbit-turtle.character.supporting-crab-courtier-argue-staged-v1 | 0.7000 | [비교](rabbit-turtle-supporting-crab-courtier-argue-staged-v1-comparison.jpg) | [가로](individual/rabbit-turtle.character.supporting-crab-courtier-argue-staged-v1-landscape.jpg) | [세로](individual/rabbit-turtle.character.supporting-crab-courtier-argue-staged-v1-portrait.jpg) |
| rabbit-turtle.character.emotion-turtle-crab-courtier-anger-v4 | 0.7000 | [비교](rabbit-turtle-emotion-turtle-crab-courtier-anger-v4-comparison.jpg) | [가로](individual/rabbit-turtle.character.emotion-turtle-crab-courtier-anger-v4-landscape.jpg) | [세로](individual/rabbit-turtle.character.emotion-turtle-crab-courtier-anger-v4-portrait.jpg) |
| rabbit-turtle.character.emotion-turtle-crab-courtier-sorrow-v4 | 0.7000 | [비교](rabbit-turtle-emotion-turtle-crab-courtier-sorrow-v4-comparison.jpg) | [가로](individual/rabbit-turtle.character.emotion-turtle-crab-courtier-sorrow-v4-landscape.jpg) | [세로](individual/rabbit-turtle.character.emotion-turtle-crab-courtier-sorrow-v4-portrait.jpg) |
| rabbit-turtle.character.emotion-turtle-crab-courtier-mirth-v4 | 0.7000 | [비교](rabbit-turtle-emotion-turtle-crab-courtier-mirth-v4-comparison.jpg) | [가로](individual/rabbit-turtle.character.emotion-turtle-crab-courtier-mirth-v4-landscape.jpg) | [세로](individual/rabbit-turtle.character.emotion-turtle-crab-courtier-mirth-v4-portrait.jpg) |
| seonnyeo.character.classic-wing-robe-staged-v1 | 0.4501 | [비교](seonnyeo-classic-wing-robe-staged-v1-comparison.jpg) | [가로](individual/seonnyeo.character.classic-wing-robe-staged-v1-landscape.jpg) | [세로](individual/seonnyeo.character.classic-wing-robe-staged-v1-portrait.jpg) |
| heungbu.character.picturebook-heungbu-swallow-seed-v1 | 0.7200 | [비교](heungbu-picturebook-heungbu-swallow-seed-v1-comparison.jpg) | [가로](individual/heungbu.character.picturebook-heungbu-swallow-seed-v1-landscape.jpg) | [세로](individual/heungbu.character.picturebook-heungbu-swallow-seed-v1-portrait.jpg) |

[단독 컷 기록](individual/single-stageproof-index.json) · [조합 컷 기록](recipes/stageproof-index.json) · [자산 리비전과 알파 경계](image-generation.json)

### 흥부 4쪽 v3 승인 판정 — 2026-11-21

정적 빌드의 실제 미리보기와, Runtime Core가 계산한 배치로 원래 크기(1280×720·720×1280)를 다시 그린 화면에서 확인했다. 원화처럼 쪼그려 앉은 흥부가 손을 내밀고 제비가 그 위로 날아든다. 가로·세로 모두 흥부의 얼굴·손과 제비가 대사창 위에 있고, 세로 화면은 옆 잘림 없이 두 인물과 박씨를 함께 보여 준다. 승인 조합 안전 영역 검사(`picturebook-recipe-stage-safety.test.ts`)를 통과했다.

남은 점: 가로 화면에서 박씨는 원래 크기로 약 5px이고, 밝은 베이지색이라 연두색 밭과 섞인다. 사건은 내민 손과 날아드는 제비로 읽히고 원화에서도 박씨는 작아서 승인을 막지 않는다. 박씨를 더 잘 보이게 하려면 박씨에 얇은 어두운 테두리를 두르거나 조금 키운 v2를 만들면 된다(후속, 선택).

