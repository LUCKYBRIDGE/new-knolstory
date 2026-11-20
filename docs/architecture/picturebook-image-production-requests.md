# 그림책→놀스토리 · 이미지 제작 요청

**진행 상황 (2026-11-20):** 요청 1·2·3 완성·등록(`picturebook-turtle-pleading-v1`, `picturebook-rabbit-walking-away-v1`, `picturebook-shore-reeds-v1`). 실제 무대 검토 뒤 1·5·8쪽 조합 승인. 요청 4의 자라를 2쪽에 등록했고, 6쪽은 기존 자산으로 조합했다. 2·6쪽도 실제 무대 검토 뒤 승인했다. [검토 근거](evidence/picturebook-chapters-2026-11-20/checkpoint.json)

2026-11-20 · 별주부전 8쪽 수직 검증에서 나온 요청이다. 제품 동작은 [전환 설계](picturebook-to-chapters-design.md), 작업 순서는 [구현 인계](picturebook-to-chapters-claude-handoff.md), 검토한 조합은 [장면 조합 목록](../../packages/asset-registry/src/picturebook-stage-recipes.json)이 소유한다. 이 문서는 새 그림이 필요한 장면만 다룬다. 요청한 그림이 등록되기 전까지 해당 쪽은 ‘삽화만 참고’로 동작하며 학생의 쓰기는 막히지 않는다.

## 공통 조건

- 기존 인물과 같은 얼굴·의상·색을 유지한다. 기준 자료는 각 요청의 ‘기준 ID’다.
- 투명 배경 PNG→WebP, 인물은 800×1200(두 인물 묶음은 1200×1200), 발이 닿는 바닥선은 아래 여백 4% 안쪽, 머리 위 여백 8% 이상.
- 실제 편집 무대(16:9 가로)와 세로 읽기(9:16)에서 대사창에 얼굴·손·접촉점이 가리지 않아야 한다.
- 임시 파일명을 운영 원고에 쓰지 않는다. 등록할 때 정식 Asset ID·sha256·권리 근거(media-provenance)를 함께 남기고, 그 뒤 조합 목록에 새 조합 버전으로 추가한다. 이미 만든 학생 작품의 장면은 자동으로 바꾸지 않는다.
- 위치·크기 조정으로 해결되는지 먼저 확인했다. 아래는 조정만으로 사건이 달라지는 경우다.

## 요청 1 · 몸을 낮춰 간청하는 자라 (우선 1)

| 항목 | 내용 |
|---|---|
| 원화 | `rabbit-turtle.scene.shortstory-classic-01` 용궁의 근심 |
| 검토한 후보 | `rabbit-turtle.character.turtle-resolve`(서서 주먹 쥔 결심 자세), `rabbit-turtle.character.dragonking-critical-attached`, 배경 `rabbit-turtle.background.rabbit-turtle-bg-palace` |
| 부족한 이유 | 원화의 사건은 자라가 왕 앞에 몸을 낮춰 청하는 행동이다. 서 있는 결심 자세로는 ‘간청’이 읽히지 않는다. |
| 필요한 행동 | 오른쪽(왕 쪽)을 향한 옆모습, 무릎을 꿇거나 허리를 깊이 숙임, 두 손을 모아 앞으로. 등껍질이 위에서 보이게. |
| 기준 ID | 얼굴·관복·등껍질 `rabbit-turtle.character.turtle-resolve` |
| 함께 쓰는 자료 | 오른쪽 `rabbit-turtle.character.dragonking-critical-attached`, 배경 궁전 |
| 구도 | 무대 왼쪽 인물. 낮은 자세라 세로 읽기에서 대사창 위로 머리가 남는지 확인. |
| 재사용 | 사과·부탁·용서를 비는 장면(다른 작품의 ‘엎드려 청하기’) |

## 요청 2 · 숲 쪽으로 멀어지는 토끼의 ¾ 뒷모습 (우선 1)

| 항목 | 내용 |
|---|---|
| 원화 | `rabbit-turtle.scene.shortstory-classic-08` 숲으로 돌아간 토끼 |
| 검토한 후보 | `rabbit-turtle.character.rabbit-guilty-escape`(‘미안해서 도망’이지만 실제로는 정면에 서 있음), `rabbit-turtle.character.classic-turtle-water`, 배경 `rabbit-turtle.background.rabbit-turtle-bg-shore` |
| 부족한 이유 | 원화의 사건은 토끼가 떠나고 자라가 남는 것이다. 정면으로 서 있는 토끼는 떠남을 보여 주지 못한다. |
| 필요한 행동 | 왼쪽 위(숲)로 걸어가거나 뛰어가는 ¾ 뒷모습, 고개를 살짝 돌려 뒤를 봄(선택). |
| 기준 ID | 털 색·귀 모양 `rabbit-turtle.character.rabbit-suspicious` |
| 함께 쓰는 자료 | 오른쪽 `rabbit-turtle.character.classic-turtle-water` |
| 구도 | 무대 왼쪽 인물. 작아 보여도 되도록 `scaleMultiplier` 0.7 전후에서도 읽히는 실루엣. |
| 재사용 | 모든 작품의 ‘떠나기·돌아가기’ 장면 |

## 요청 3 · 인물 없는 갈대 물가 배경 (우선 2)

| 항목 | 내용 |
|---|---|
| 원화 | `rabbit-turtle.scene.shortstory-classic-02` 낯선 육지 |
| 검토한 후보 | 배경 `rabbit-turtle.background.rabbit-turtle-bg-shore`, 인물 `rabbit-turtle.character.classic-turtle-portrait`(초상화를 든 정면 자세) |
| 부족한 이유 | 원화는 노을 무렵 갈대 사이를 몸을 숙여 살피는 장면이다. 기존 물가 배경에는 갈대 전경이 없고, 무대에 전경 층을 따로 둘 수 없다. 초상화 자세는 ‘찾기’ 사건과 맞지 않아 쓰지 않았다. |
| 필요한 그림 | 원화와 같은 시간·색의 물가 배경. 앞쪽 아래에 키 큰 갈대가 있고, 가운데에 인물을 놓을 빈 땅. 인물 없음. |
| 구도 | 1280×720 기준. 세로 읽기에서 가운데 1/3이 잘려도 물가와 갈대가 보이게. |
| 후속 | 이 배경이 생기면 기존 자라 자세로 먼저 조립해 보고, 그래도 ‘살핌’이 안 읽힐 때만 ‘몸을 숙여 살피는 자라’를 따로 요청한다. |

## 요청 4 · 갈대 사이를 몸을 숙여 살피는 자라 (우선 1)

| 항목 | 내용 |
|---|---|
| 원화 | `rabbit-turtle.scene.shortstory-classic-02` 낯선 육지 |
| 검토한 후보 | 배경 `rabbit-turtle.background.picturebook-shore-reeds-v1`(요청 3 완성품, 원화와 맞음), 인물 `rabbit-turtle.character.turtle-resolve`(서서 주먹 쥔 정면 자세) |
| 부족한 이유 | 2026-11-20 실제 무대 검토에서 서 있는 결심 자세로는 ‘갈대 사이를 살피는’ 사건이 읽히지 않았다. |
| 필요한 행동 | 허리를 숙이고 한 손으로 갈대를 헤치며 앞(오른쪽)을 살피는 옆모습. 등껍질이 위에서 보이게. |
| 기준 ID | 얼굴·관복·등껍질 `rabbit-turtle.character.turtle-resolve`, 낮은 자세 비례는 `rabbit-turtle.character.picturebook-turtle-pleading-v1` 참고 |
| 함께 쓰는 자료 | 배경 `rabbit-turtle.background.picturebook-shore-reeds-v1` |
| 구도 | 무대 왼쪽 인물. 숙인 자세라 세로 읽기에서 얼굴이 대사창 위에 남는지 확인. |
| 재사용 | 무언가를 찾거나 숨어서 엿보는 장면 |

## 기존 그림으로 검토한 쪽

- **5쪽 뜻밖의 위기**는 놀란 토끼와 명령하는 용왕 조합을 승인했다. 왕좌 높이는 재현하지 않았다.
- **6쪽 위기를 뒤집는 꾀**의 2차 조합은 왼쪽 토끼, 오른쪽 자라·용왕을 배치한다. 가로 무대에서 토끼의 손짓과 세 인물의 방향이 읽힌다. 세로 첫 컷은 기존 인물 선택 규칙에 따라 토끼 한 명을 표시하므로, 승인된 다른 쪽과 같은 규칙이라 2026-11-20에 승인했다. 듣는 용왕은 학생이 다음 컷에서 보여 준다.

## 별주부전 외 세 작품의 조립 검토

흥부와 놀부 8쪽, 선녀와 나무꾼 10쪽, 옹고집전 8쪽의 삽화와 기존 자료를 대조했다. 26쪽 모두 조립 검토 상태다. 인물이나 도구가 맞닿는 자세는 기존 자료를 우선 사용했다. 흥부의 제비 치료, 선녀가 두 아이를 안는 장면, 나무꾼이 두레박이나 용마를 타는 장면은 한 그림에 함께 그린 대상을 별도 인물로 다시 넣지 않는다. 옹고집전은 옹고집과 짚 인형의 인물 ID, 자세, 위치를 구분한다. [조합 목록](../../packages/asset-registry/src/picturebook-stage-recipes.json)

### 요청 5 · 하늘로 오르는 길의 배경

| 항목 | 내용 |
|---|---|
| 원화 | `seonnyeo.scene.shortstory-classic-06` 두레박을 타고 |
| 검토한 후보 | `seonnyeo.background.classic-sky-realm`과 `seonnyeo.character.classic-woodcutter-in-bucket` |
| 부족한 이유 | 기존 하늘나라 배경에는 발을 딛는 난간과 바닥이 보인다. 두레박에 탄 나무꾼은 이미 있지만, 그 배경에 놓으면 골짜기 위로 올라가는 중인지 알기 어렵다. |
| 필요한 그림 | 낮의 구름 위에서 내려다본 겹겹의 산과 골짜기. 화면 가운데에 하얀 구름으로 둘러싸인 맑은 공간을 둔다. 사람과 두레박, 로프, 난간은 배경에 그리지 않는다. |
| 기준 ID와 구도 | 원화의 밝은 구름과 숲빛, `seonnyeo.background.BG01-valley-day`의 산과 골짜기. 1280×720, 세로 중앙 구도에도 골짜기가 남도록 배치한다. |
| 함께 쓰는 자료 | 이미 로프와 두레박을 포함한 `seonnyeo.character.classic-woodcutter-in-bucket` |
| 재사용 | 하늘로 오르는 길, 구름 사이에서 아래를 내려다보는 장면 |

### 실제 무대 대조 후 반영한 추가 자료

| 원화 ID | 판정과 반영한 자료 |
|---|---|
| `heungbu.scene.shortstory-classic-02` | 걱정하는 자세만으로는 가족이 왜 힘든지 보이지 않았다. 기존 아내의 얼굴과 옷차림에 맞춰 빈 그릇을 기울이는 자세를 제작하고 첫 컷의 왼쪽 인물로 놓는다. |
| `heungbu.scene.shortstory-classic-05` | 톱질 자세는 재물이 나온 사건보다 앞선 순간이다. 인물 없이 열린 박과 재물을 그린 기존 `heungbu.scene.gourd-treasure-burst`를 사용하고 흥부 가족을 따로 놓는다. |
| `seonnyeo.scene.shortstory-classic-01` | 나무꾼과 사슴이 둘 다 서 있어 숨겨 준다는 동작이 읽히지 않았다. 몸을 낮춰 사슴을 감싸는 두 인물 그림을 제작해 한 칸에 두고 사냥꾼을 맞은편에 놓는다. |
| `seonnyeo.scene.shortstory-classic-06` | 높은 곳에서 내려다본 골짜기 배경을 제작했다. 밧줄과 두레박은 기존 인물 그림에 있는 한 벌을 쓴다. |
| `onggojib.scene.shortstory-classic-08` | 고개 숙인 그림에는 사발을 건네는 행동이 없었다. 진짜 옹고집의 푸른 옷, 검은 갓과 얼굴을 유지한 채 밥 사발을 내미는 모습을 제작했다. |

원본 PNG, 배포 WebP, 등록 ID와 리비전, 실제 무대 확인 결과는 [세 작품 검토 기록](evidence/picturebook-stage-review-2026-11-20/review.md)에 모았다. 새 조합은 사람이 검토할 수 있도록 `assembly-review`로 둔다.

## 완료 후 등록 절차

1. 원화와 나란히 비교하고, 실제 편집 화면(16:9)·세로 읽기(9:16)에서 대사창 가림을 확인한다.
2. 카탈로그에 정식 ID·revision·권리를 등록한다(`media-provenance`, `project-media-authorization`).
3. 조합 목록에서 해당 원화의 `recipeVersion`을 올리고 `revisions`에 새 자료를 넣는다. `review`는 실제 무대 확인 뒤에만 `approved`로 바꾼다.
4. `pnpm exec vitest run packages/asset-registry/tests/picturebook-recipes.test.ts`로 리비전·권리 검사를 통과시킨다.
