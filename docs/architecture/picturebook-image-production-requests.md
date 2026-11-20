# 그림책→놀스토리 · 이미지 제작 요청

**진행 상황 (2026-11-20):** 옹고집전·선녀와 나무꾼·흥부와 놀부는 26쪽 중 24쪽을 기존 자료로 승인했고, 선녀와 나무꾼 1·5쪽은 요청 5·6을 기다린다([검토 근거](evidence/picturebook-three-works-2026-11-20/checkpoint.json)). 별주부전: 요청 1·2·3 완성·등록(`picturebook-turtle-pleading-v1`, `picturebook-rabbit-walking-away-v1`, `picturebook-shore-reeds-v1`). 실제 무대 검토 뒤 1·5·8쪽 조합 승인. 요청 4의 자라를 2쪽에 등록했고, 6쪽은 기존 자산으로 조합했다. 2·6쪽도 실제 무대 검토 뒤 승인했다. [검토 근거](evidence/picturebook-chapters-2026-11-20/checkpoint.json)

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

## 요청 5 · 몸을 숙여 사슴을 감싸 숨기는 나무꾼 (선녀와 나무꾼, 우선 1)

| 항목 | 내용 |
|---|---|
| 원화 | `seonnyeo.scene.shortstory-classic-01` 사슴을 숨겨 주다 |
| 검토한 후보 | `seonnyeo.character.M02-concerned`(서서 걱정하기)와 `seonnyeo.character.classic-deer`(서 있는 사슴)를 나란히, 오른쪽에 `creative.character.seonnyeo-hunter-look` |
| 부족한 이유 | 2026-11-20 실제 무대 검토에서 나무꾼과 사슴이 나란히 서 있을 뿐이라 ‘숨겨 주기’가 읽히지 않았다. |
| 필요한 행동 | 나무꾼이 수풀 쪽으로 몸을 낮춰 한 팔로 사슴을 감싸 자기 뒤에 숨기고, 고개는 오른쪽(사냥꾼 쪽)을 경계하며 돌아봄. 나무꾼과 사슴을 **한 장으로 함께 그린** 묶음. |
| 기준 ID | 나무꾼 `seonnyeo.character.M02-concerned`, 사슴 `seonnyeo.character.classic-deer` |
| 함께 쓰는 자료 | 배경 `seonnyeo.background.BG01-valley-day`, 오른쪽 `creative.character.seonnyeo-hunter-look` |
| 구도 | 무대 왼쪽 묶음, 1200×1200. 낮은 자세라 세로 읽기에서 얼굴이 대사창 위에 남는지 확인. |
| 재사용 | 누군가를 숨겨 주거나 보호하는 장면 |

## 요청 6 · 두 아이를 안고 하늘로 날아오르는 선녀 (선녀와 나무꾼, 우선 1)

| 항목 | 내용 |
|---|---|
| 원화 | `seonnyeo.scene.shortstory-classic-05` 하늘로 떠난 가족 |
| 검토한 후보 | `seonnyeo.character.classic-fairy-carrying-children`(두 아이를 안고 땅에 섬), 왼쪽 `seonnyeo.character.M02-surprised` |
| 부족한 이유 | 무대의 인물은 바닥선에 서므로 기존 그림의 선녀가 땅에 서 있어 ‘하늘로 떠남’이 읽히지 않았다. |
| 필요한 행동 | 날개옷 자락이 바람에 날리며 몸이 비스듬히 위로 떠오르는 선녀가 두 아이를 안음. 그림 안에서 발 아래로 빈 공간을 두어(아래 30% 이상 투명) 무대에서 떠 있는 것처럼 보이게 함. |
| 기준 ID | `seonnyeo.character.classic-fairy-carrying-children`(얼굴·의상·두 아이) |
| 함께 쓰는 자료 | 배경 `seonnyeo.background.BG04-cottage-day`, 왼쪽 `seonnyeo.character.M02-surprised` |
| 구도 | 무대 오른쪽 묶음, 1200×1200. 세로 읽기에서도 하늘로 오르는 방향(왼쪽 위 또는 오른쪽 위)이 읽히는지 확인. |
| 재사용 | 하늘로 오르거나 날아가는 장면 |

## 완료 후 등록 절차

1. 원화와 나란히 비교하고, 실제 편집 화면(16:9)·세로 읽기(9:16)에서 대사창 가림을 확인한다.
2. 카탈로그에 정식 ID·revision·권리를 등록한다(`media-provenance`, `project-media-authorization`).
3. 조합 목록에서 해당 원화의 `recipeVersion`을 올리고 `revisions`에 새 자료를 넣는다. `review`는 실제 무대 확인 뒤에만 `approved`로 바꾼다.
4. `pnpm exec vitest run packages/asset-registry/tests/picturebook-recipes.test.ts`로 리비전·권리 검사를 통과시킨다.
