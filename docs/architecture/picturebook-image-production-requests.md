# 그림책→놀스토리 · 이미지 제작 요청

**진행 상황 (2026-11-20):** 요청 1~6과 보완(요청 6 v2)을 모두 등록했고, 실제 무대 검토 뒤 기본 네 작품 34쪽 모두 승인 조합을 가진다. [별주부전 검토](evidence/picturebook-chapters-2026-11-20/checkpoint.json) · [세 작품 검토](evidence/picturebook-three-works-2026-11-20/checkpoint.json)

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

## 요청 6 보완 · 구름 자락이 바닥까지 이어지는 날아오르는 선녀 (선녀와 나무꾼, 우선 1)

| 항목 | 내용 |
|---|---|
| 원화 | `seonnyeo.scene.shortstory-classic-05` 하늘로 떠난 가족 |
| 1차 결과 | `seonnyeo.character.picturebook-fairy-ascending-with-children-v1`. 그림 자체는 원화와 맞지만 실제 무대에서 바닥에 붙어 보였다. |
| 원인 | 무대 배치(Runtime Core `stage-layout.ts`)는 카탈로그 `geometry.bottom`, 즉 **보이는 부분의 맨 아래**를 바닥선에 맞춘다. 아래를 투명하게 비우면 그 여백은 무시된다. |
| 필요한 그림 | 같은 선녀와 두 아이를 그림 위쪽 55% 안에 두고, 원화처럼 **빛나는 구름·날개옷 자락이 그림 맨 아래(바닥선)까지** 이어지게 그린다. 자락은 반투명이어도 되지만, 알파 경계가 아래 여백 4% 안까지 내려와야 한다. 그러면 자락 끝이 바닥선에 놓이고 선녀는 높이 떠 보인다. |
| 기준 ID | `seonnyeo.character.picturebook-fairy-ascending-with-children-v1`(인물·의상·두 아이) |
| 함께 쓰는 자료 | 배경 `seonnyeo.background.BG04-cottage-day`, 왼쪽 `seonnyeo.character.M02-surprised` |
| 구도 | 1200×1200, 무대 오른쪽. 가로에서 선녀의 얼굴이 무대 위쪽 절반에, 세로에서 대사창 위에 오는지 확인. |
| 등록 | 새 ID(`…-v2`)로 등록하고 v1은 그대로 둔다. 05 조합을 v3으로 올리고 조립 검토 상태를 유지한다. |

## 무대 배치를 덜 고려하고 그린 그림 다시 만들기 (2026-11-20 검사)

**검사 방법.** 등록된 인물 그림 419점(옛 표지·legacy 제외)의 카탈로그 `geometry`(알파 16 이상인 보이는 부분의 경계)를 [새 인물 그림 기준](../../DESIGN.md#새-인물-그림의-제작과-등록)(800×1200, 보이는 맨 아래 y=1152±6, 가장자리 여백 8px 이상, 같은 인물의 서 있는 그림과 키 차이 8% 안)과 비교하고, 무대가 크기를 따로 고쳐 쓰는 그림(`stage-view.ts`의 `stageCharacterScale`, 조합의 `scaleMultiplier`)을 함께 찾았다. 후보는 같은 높이로 나란히 놓고 눈으로 확인했다. 바닥선은 모두 맞았다(1200×1200 옛 묶음 그림 포함). 문제는 **크기**와 **잘림**, **소품이 붙은 그림**이다.

**왜 다시 그리나.** 동물·물건을 사람과 같은 키로 그려 두고 무대가 0.36~0.72배로 줄이거나, 사람이 탄 용마를 사람 키에 욱여넣고 1.4배로 키우면, 그림을 다른 배경·다른 인물과 함께 놓을 때마다 크기 예외가 늘어난다(현재 다른 작업이 인물 키 표 `characterStature`로 이 예외를 정리하는 중이다). 그림 안에서 처음부터 맞는 키로 그리면 예외 없이 `scale 1`로 놓인다.

| 우선 | 묶음 | 현재 그림 | 무엇이 어긋났나 | 다시 그릴 모습 |
|---|---|---|---|---|
| 1 | 흥부와 놀부 · 제비 7점 | `heungbu.character.swallow`, `supporting-swallow-fly-v2`, `supporting-swallow-injured-v2`, `emotion-swallow-{joy,anger,sorrow,mirth}-v3` | 제비가 사람 키의 0.7~0.9로 그려져 무대에서 흥부만 하다. 기본 `swallow`는 나무 들보 소품이 붙어 하늘·마당 장면에 못 쓴다. `fly-v2`는 날개 끝이 캔버스 가장자리에 닿는다(잘림). 흥부 4쪽 조합은 `scaleMultiplier 0.6`으로 버틴다. | 800×1200, 제비 몸길이가 흥부(`heungbu.character.heungbu-happy`) 키의 약 1/4. 앉은 제비는 발끝을 y=1152에 둔다. 무대는 보이는 맨 아래를 바닥선에 맞추므로 혼자 나는 제비는 땅에 붙어 보인다. 그래서 나는 모습은 땅에서 막 날아오르는 자세(한 발이나 꼬리 끝이 바닥선에 닿음)로 그리고, 높이 나는 장면은 배경이나 묶음 그림이 맡는다. 들보 없는 그림이 기본이고 들보에 앉은 그림은 따로 둔다. 날개·꼬리 끝은 가장자리 8px 안쪽. |
| 1 | 선녀와 나무꾼 · 용마에 탄 나무꾼 2점 | `seonnyeo.character.classic-woodcutter-riding-horse`, `classic-horse-startled-by-porridge` | 용마와 나무꾼을 사람 키(0.83)에 넣어서 무대가 1.4배로 키운다. 그 결과 나무꾼이 혼자 선 그림보다 커진다. | 1200×1200 묶음 캔버스. 탄 나무꾼의 얼굴·몸 크기가 `seonnyeo.character.M02-honest`와 같고, 용마 크기가 `classic-celestial-horse`와 같다. 말굽을 y=1152에. |
| 2 | 선녀와 나무꾼 · 수탉 6점 | `classic-rooster-calling-sky`, `emotion-rooster-{joy,anger,sorrow,mirth}-v3` | 수탉이 사람 키(0.84)로 그려져 무대가 0.48배로 줄인다. 선녀 10쪽 조합은 다시 1.4배로 키운다. `mirth-v3`는 꼬리가 가장자리에 닿는다. | 800×1200, 수탉 볏 끝까지가 나무꾼 키의 약 0.4. 꼬리·날개 끝 여백 8px 이상. 지붕 위 수탉(10쪽)은 지붕을 그리지 않고 수탉만, 높이는 조합 배치로. |
| 2 | 선녀와 나무꾼 · 사슴 6점 | `classic-deer`, `creative.character.seonnyeo-deer-listen`, `emotion-deer-{joy,anger,sorrow,mirth}-v3` | 사슴이 사람 키(0.83)로 그려져 무대가 0.72배로 줄인다. | 800×1200, 뿔 끝까지가 나무꾼 키의 약 0.6, 발굽을 y=1152에. |
| 3 | 선녀와 나무꾼 · 날개옷 | `classic-wing-robe` | 물건을 사람 키(0.69)로 그려 무대가 0.65배로 줄인다. | 800×1200, 접어 든 날개옷이 나무꾼 품에 들 만한 크기(나무꾼 키의 약 0.45). 물건이므로 `placementReview.reason`에 ‘소품’이라 적는다. |

같은 인물 안의 키 차이(별주부전 어린 자라 0.72배, 흥부 길거리 아이 1.19배, 거리 소녀 1.17배)는 원래 다른 나이·다른 아이를 같은 ID로 묶은 데서 왔다. 그림을 고치기보다 인물 ID를 나누거나 인물 키 표에 올릴 일이라 이번 요청에서 뺀다.

**등록과 무대 반영 규칙.**

- 새 ID로 등록한다(`…-staged-v1`, 감정 그림은 `…-v4`). 기존 그림과 이미 만든 작품·승인 조합은 그대로 둔다.
- 메타데이터에 `placementReview {referenceId, referenceRevision, heightRatio, reason}`를 채운다. 기준은 위 표의 사람 그림이다.
- 무대 크기 예외(`stageCharacterScale`의 무리 단위 규칙, `characterStature`)는 **옛 ID에만** 걸리게 바꿔야 새 그림이 두 번 줄지 않는다. 이 바꿈은 런타임 작업이라 그림 작업과 따로 하고, 인물 키 표 작업이 들어간 뒤에 한다.
- 이 그림을 쓰는 조합(흥부 4쪽 제비, 선녀 8쪽 용마, 10쪽 수탉)은 새 그림으로 조합 버전을 올리되 `assembly-review`로 두고, 실제 무대(가로·세로) 검토 뒤에만 `approved`로 올린다.

## 완료 후 등록 절차

1. 원화와 나란히 비교하고, 실제 편집 화면(16:9)·세로 읽기(9:16)에서 대사창 가림을 확인한다.
2. 카탈로그에 정식 ID·revision·권리를 등록한다(`media-provenance`, `project-media-authorization`).
3. 조합 목록에서 해당 원화의 `recipeVersion`을 올리고 `revisions`에 새 자료를 넣는다. `review`는 실제 무대 확인 뒤에만 `approved`로 바꾼다.
4. `pnpm exec vitest run packages/asset-registry/tests/picturebook-recipes.test.ts`로 리비전·권리 검사를 통과시킨다.
