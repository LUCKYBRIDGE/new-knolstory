# 배경·인물 분리 자료의 등록·검색·비율 검토

2026-11-02. 구현 전 구조 감사에 현행 연결·선택 정책을 반영한 문서다. 새 자료는 투명 인물 10개와 인물 없는 배경 1개이며, [생성·변환 근거](generation.json)와 [컷 조사](audit.json)에 연결한다. [검토와 보존 경계](review.md)를 함께 읽는다. 최종 검사·배포 상태는 [단일 실행 계획](../../product-completion-plan.md#재개-지점)이 연결하는 현재 근거를 따른다.

## 현재 소유 구조

- `packages/asset-registry/src/catalog.json`이 그림의 공통 목록이다. `image-catalog.ts`가 `Asset`으로 읽어 동결하고 안정 ID로 `resolveAsset()`한다. `runtimePath`는 `/`로 시작하는 `src`에서 첫 `/`만 제거해 생성된다. 별도 신규 자료실이나 Web 렌더러를 만들 필요가 없다.
- `background-sizes.json`은 배경의 실제 가로·세로 치수다. 새 배경 ID와 크기를 함께 넣어야 Core의 cover/contain 계산이 정확하다. 배경의 `geometry`는 `null`이다.
- `characters.json`은 인물의 정체성·한국어 이름·별칭·작품·대표 이미지다. 같은 인물의 새 의상·표정·동작은 새 인물로 만들지 않고 기존 character ID를 공유한다. 새로운 배역을 추가할 때만 이 목록을 확장한다.
- `asset-query.ts`가 검색·분류·동일 인물·품질 상태·순위를 공통으로 해석한다. `AssetBrowserDialog`는 이 함수를 사용하며 이미지 적용 전의 선택 미리보기·취소·적용·즐겨찾기·최근 사용·장 자료를 이미 제공한다.
- StoryDocument의 StageComposition → Runtime Core의 `compileStoryScene`/`resolveStageLayout` → Ren’Py가 공식 장면 출력 경로다. 새 자료도 같은 경로에 연결한다.

## 새 인물 이미지에 필요한 필드

| 필드 | 연결·표시 의미 | 권고 예 |
|---|---|---|
| `id` | 새 이미지의 안정 ID. 기존 ID·파일 덮어쓰기와 구분 | `onggojib.character.layered-ragged-chopping-v1` |
| `displayName`, `label` | 실제 자료 이름. 파일명보다 한국어 명칭을 우선 | `진짜 옹고집 · 넝마옷 · 도끼질` |
| `story`, `group`, `metadata.actions` | 작품·인물 그룹·동작의 상위 정보 | `옹고집전`, `진짜 옹고집`, `장작 패기` |
| `type`, `framing` | 인물 슬롯·기존 전신 구분 | `character`, `전신` |
| `src`, `revision` | 프로젝트의 버전 파일 경로와 실제 bytes SHA-256 | `/assets/characters/layered-v1/...webp`와 실제 SHA |
| `geometry` | 전체 캔버스 치수와 알파를 가진 그림의 정규화 범위 | `left/right/top/bottom/width/height`를 최종 파일에서 측정 |
| `metadata.kind`, `placementRole` | 자료의 배치 목적 | `character`, `character-slot` |
| `metadata.storyPackIds` | 작품 필터 | `['onggojib']` |
| `metadata.characterIds`, `primaryCharacterId` | 같은 인물의 다른 모습 찾기·인물별 분류 | `['onggojib.real']`, `onggojib.real` |
| `metadata.variantId` | 기존 ‘옷·모습’ 필터 | `넝마옷` 또는 `넝마옷 · 먼지 묻은 모습` |
| `metadata.actions` | 기존 ‘행동’ 필터 | `['도끼질', '장작 패기']` |
| `metadata.expressions` | 기존 ‘감정·상태’ 필터 | `['지침', '힘을 주는']` |
| `metadata.bodyFraming`, `framing`, `composition` | 몸 일부 가림·전신·혼자/함께 구분 | `full`, `full`, `single` |
| `metadata.artFamily`, `designVersionId` | 같은 화풍과 인물 설계 계열 | 현재 기준 인물과 호환되는 계열 또는 새 계열 |
| `metadata.poseSetId` | 같은 정체성·복장 기준으로 만들어진 동작 묶음 | 상태별 동작 묶음의 안정 이름 |
| `metadata.searchTerms`, `aliases`, `subjects` | 사용자가 입력할 다양한 한국어 단어 | `['진짜 옹고집', '넝마', '해진 옷', '도끼', '장작', '노동']` |
| `metadata.qualityStatus`, `pickerVisibility` | 새 선택 허용과 기본 추천 여부 | 검수 완료 후 `approved`, `primary` |
| `metadata.qualityReview` | 기준 인물·비율·상태·검토 근거 | `decision`, `referenceAssetId`, `reason`, `evidence`; 출력 SHA·배율은 `revision`과 생성 근거에 기록 |

새 한국어 이름은 `displayName`에 넣는 것이 명확하다. `assetDisplayName()`은 최상위 `displayName`과 `label`을 우선하며 `metadata.displayName`을 직접 표시하지 않는다. 새 ID를 한국어 이름처럼 보여 주지 않도록 한다.

### 현재 검색 구현에서 주의할 점

- `states`는 **캐릭터 상태가 아니라 `metadata.background.state`인 장소 상태**다. 캐릭터 선택창에서 숨기는 필터이므로 넝마옷·상처·피로는 `variantId`, `expressions`, `searchTerms`에 기록한다.
- 임의의 `metadata.tags`는 현재 검색기가 읽지 않는다. 기존 태그는 `metadata.legacy.tags` 또는 최상위 `tags`, 자유 검색용 동의어는 `metadata.searchTerms`/`aliases`를 쓴다.
- `variants` 값은 `metadata.variantId` 한 문자열을 그대로 표시한다. 여기에 내부 슬러그만 넣으면 편집기에도 그대로 노출된다. 현재 방식에서는 `넝마옷`, `평상복`, `관아에서 쫓겨난 모습`처럼 사용자가 이해할 수 있는 값을 쓴다.
- 새 `artFamily` 슬러그를 추가하면 `facetLabel('artFamilies', ...)`의 한국어 이름 매핑도 함께 추가해야 원시 ID가 표시되지 않는다. 기존 계열과 같은 화풍이면 불필요한 새 계열을 만들지 않는다.
- 검색어는 띄어쓰기 단위 **AND**, 같은 필터의 여러 값은 **OR**, 필터 사이는 **AND**다. 따라서 `옹고집 넝마 도끼질`처럼 찾아도 해당 자료가 나오도록 한다.
- `characterIds`를 기존 인물과 공유하면 ‘같은 인물의 다른 모습’이 새 동작·의상까지 함께 보여 준다. 진짜·가짜 옹고집은 별도 ID를 유지해야 외형이 비슷해도 상태·배역이 섞이지 않는다.
- 현재 장의 `characterAssetIds`·`backgroundAssetIds`도 새 자료에 맞춰 갱신해야 ‘장 자료’ 보기가 이전 자료에 머물지 않는다. 컷에서 참조만 바꾸고 장 자료 목록을 방치하지 않는다.

## 인물 없는 배경 자료

새 배경은 `type:background`, `backgroundRole:scenery`, `geometry:null`, `metadata.kind:background`, `metadata.placementRole:background-slot`, `metadata.containsCharacters:false`를 명시한다. `metadata.background`의 `location/space/time/season/weather/mood/state`에 실제 장면 정보를 넣고 `subjects/searchTerms`에는 `인물 없음`과 장소·시간을 넣는다. 예를 들어 `옹고집 집 마당 · 겨울 · 인물 없음`이 파일명보다 유용한 자료명이다.

인물이 없는 배경도 **복장·소품의 시간 상태**를 훼손하지 않아야 한다. 닫힌 대문/열린 대문, 온전한 집/무너진 집, 박을 타기 전/후, 연못의 낮/밤 등 원고에 필요한 상태가 다르면 같은 clean 배경 하나로 무조건 합치지 않는다. 배경을 자를 때 사람이 사라졌다는 이유만으로 음식·파손·도구 등 사건의 원인을 삭제한 후보를 승인하지 않는다.

기본 놀스토리 배경 검색은 `containsCharacters:true` 자료를 새 선택에서 제외한다. 별도의 복잡한 필터를 추가하지 않고, 인물 없는 장소와 개별 인물 조합을 기본 흐름으로 제공한다. 그림책 쪽 배경·표지 배경은 `allowSceneIllustrations:true`로 완성 삽화도 선택할 수 있다. 이 문맥은 검색·현재 이미지 안내·적용 가능 여부에 함께 전달한다.

## 이전 완성 삽화의 보존과 용도별 선택

기존 `scene-illustration`과 `containsCharacters:true` 자료의 원본·ID·해시는 보존한다. 인물이 포함된 배경 145개를 일괄 `pickerVisibility:hidden`으로 바꾸지 않는다. 놀스토리 컷의 기본 선택에서는 인물 포함 배경을 제외하고, 그림책과 표지에서는 기존 품질·가시성 검사를 통과한 삽화를 계속 선택할 수 있다. 이미 품질상 숨겨져 있던 자료까지 다시 승인하는 기능은 아니다.

놀스토리에서 예전 삽화를 사용 중인 경우 `searchAssets()`는 현재 선택을 확인용으로 유지하며 새 적용은 막는다. 그림책·표지에서 허용되는 삽화에는 잘못된 ‘이전 이미지’ 안내를 표시하지 않는다. `resolveAsset()`과 작품 파일의 자료 참조 해석은 그대로 남아 개인 원고를 다시 열 수 있다. `assertCatalogOnlyMedia()`도 등록 ID와 type을 확인하며 새 선택 정책을 과거 원고에 소급 강제하지 않는다.

현재 제공 작품은 정확한 공식 판본 fingerprint gate에서 배경·개별 인물 연결을 갱신하고, 알려진 이전 공식 판본도 갱신 목록에 남긴다. 개인이 이미 수정한 작품은 다른 구도로 덮어쓰지 않는다. 새 시각 교정은 배경 ID·StageComposition·관련 장 자료 목록을 바꾸며 본문·Flow·선택·점수·음향·연출은 보존한다. 최종 실효 배경은 line→chapter→project 상속과 `backgroundMode:'none'`을 해석한 뒤 검사한다.

## 자세와 체형 비율을 지키는 제작·등록

현재 Core의 전신 인물은 캔버스 전체 크기를 기준으로 균일 배율을 적용하며 알파 bbox의 높이를 같게 키우지 않는다. `stageReadableCharacterScale()`도 전신 그림에서는 추가 정규화를 하지 않고, 상반신 그림에서만 여백을 보정한다. 어린 자라와 두 아이는 원본을 보존한 균일 축소·투명 위 여백 파생본을 이미 사용한다.

새 자세도 이 원칙을 유지해야 한다.

1. 기준 인물을 같은 공통 캔버스에 놓고 얼굴 크기·어깨 폭·흉곽/배·골반·팔뚝/전완·허벅지/종아리·손발 비율을 비교한다. 선 자세보다 낮은 숙임/앉기 자세를 머리·발 bbox에 맞춰 다시 성인 선 키로 늘리지 않는다.
2. 도끼를 머리 위로 들거나 옆으로 벌리면 도구와 팔 때문에 bbox가 커진다. 이 bbox를 기준 삼아 인물 전체를 줄이면 몸이 갑자기 작아진다. **몸의 크기 기준은 얼굴·몸통·사지**, 도구 여백은 캔버스의 투명 공간으로 분리한다.
3. 의복의 색·헤짐·먼지·신발·머리 모양·수염 등은 동일한 상태의 기준 이미지를 참조한다. ‘도끼질’이라는 행동만 맞고 넝마옷이 새 도포로 바뀐 그림은 반려한다.
4. 비율 조정은 가로·세로 같은 비율로만 하고, 필요하면 투명 여백을 더한다. 얼굴/팔/다리를 따로 잡아당기거나 캔버스를 비등방 확대하지 않는다. 기하학적 보정으로 체형 자체가 틀린 생성 결과를 감추지 않는다.
5. 최종 이미지의 캔버스 치수와 알파 bbox를 측정해 `geometry`를 기록한다. 기준 파일·비교 항목·균일 배율·오프셋·출력 SHA는 새 근거에 둔다. bbox만 측정한 사실을 해부학 검수 완료라고 쓰지 않는다.
6. 별도 신규 metadata에 관절/체형 검토 정보를 둘 수 있으나 현 Core는 임의 landmark 필드를 읽어 배치를 바꾸지 않는다. 그런 필드를 썼다는 이유만으로 런타임 보정이 되었다고 주장하지 않는다. 필요한 배율은 제작 캔버스에서 맞추고, 공통 Core가 실제로 해석하는 기능을 추가한다면 그 계약·검사를 따로 구현한다.

자동 다인 배치가 공간 때문에 줄어야 할 때 Core는 좌우 전체에 같은 카메라 배율을 적용하는 기존 보호가 있다. 새 이미지 때문에 이를 없애거나 한쪽만 따로 축소해 아이가 어른보다 커지는 문제를 되살리지 않는다. 수동 `xAnchor`·`scaleMultiplier`·중앙 배치·facing은 현재 StoryDocument 의미를 유지한다.

## 세로 화면의 주목 인물과 전체 배역 보존

기존 구현은 portrait에서 **현재 화자에 해당하는 한 명만 먼저 필터링**한 뒤 중앙으로 배치했다. 모든 배우를 동시에 중앙으로 놓아 겹치던 구조는 아니었다. 해설에서는 `activeStageSpeaker()`가 비어 배우가 모두 사라지는 점이 이번 분리 장면의 문제였다.

현행 `story-runtime.ts`는 선택지 컷에서는 배우를 숨기고, 그 밖에는 주화자 → `speakerActorKey`로 지정된 행동 주체 → 좌측 첫 배우 → 우측 첫 배우 순서로 한 명을 고른다. 선택한 배우만 세로 화면의 가운데에 보여 주며, 해설을 대사로 바꾸거나 별도 화자를 만들어 넣지 않는다. 명시적인 빈 StageComposition은 계속 아무 인물도 없는 장면이다.

가로 화면은 전체 배역을 보여 준다. 세로에서 선택되지 않은 동석자도 StoryDocument와 작품 파일에는 그대로 남으며, 화면을 돌리거나 편집할 때 복원된다. 수동 가로 위치를 세로의 중앙 구도로 해석하는 기존 정책과 상대 크기 계산도 Core 한 곳에서 유지한다.

StageComposition은 좌우 각 최대 두 명, 전체 최대 네 명이다. 한 삽화에 많은 인물이 있어도 컷의 행동·발화·서사 단서에 맞춰 배역을 골라 한도를 지킨다. 유령 연출처럼 좌우 appearance가 공유되는 장면은 배우를 무작정 다른 쪽으로 옮기지 않는다. 옹고집 군집 장면은 살아 있는 인물 둘을 좌측, 기존 진짜 옹고집을 우측에 보존해 가족·하인이 유령으로 바뀌지 않게 한다.

## 최종 연결에서 확인할 항목

- 새 ID가 `resolveAsset`으로 해석되고 최종 bytes의 SHA·알파·geometry가 맞는지 확인한다. `catalog.test.ts`의 원래421개 보존 검증과 새 자료 검증을 나누며 기존 해시 검증을 삭제하지 않는다.
- 정확한 한글 `인물+옷·모습+행동` 검색, 같은 인물의 다른 모습, 장 자료 보기, 현재·미리보기·취소·적용을 확인한다. 새 artFamily 이름이나 조건 값이 raw ID로 노출되지 않는지도 본다.
- 모든 제공 컷의 실효 배경에서 `containsCharacters:true`/scene-illustration이 남지 않았는지 자동 목록과 실제 그림 검토를 대조한다. 메타데이터의 false만으로 픽셀의 인물 부재를 증명하지 않는다.
- 실제 Ren’Py 16:9와9:16에서 단독/2명/3~4명·낮은 자세·들어 올린 도구·어린이/성인 상대 크기·글상자 위 가시성을 확인한다. 새 배치 때문에 인물의 얼굴이나 행동 도구가 가려지는지 본다.
- 변경된 컷의 StageComposition, 화자 연결, 배경, 관련 장 자료 목록을 `.knolstory`·엑셀 왕복과 재열기 뒤 대조한다. 본문·선택 경로·결말·음향·연출은 바꾸지 않았는지 비교한다.
- 새 파일은 생성 원본·프롬프트·참조·선택본·파생 변환·허가 SHA를 남기고, 기존 asset-pipeline대로 provenance 및 runtime→Web 순서로 빌드한다. 새 SDK/runtime bytes는 직전 봉인된 권리 검토를 자동 재사용하지 않는다.

## 복식 참고의 범위

[국립민속박물관 어린이박물관 복식 자료](https://www.nfm.go.kr/kids/user/content.do?pageId=PAGE_000000000000053)와 [전통문화포털 복식 자료](https://www.kculture.or.kr/clothes/code/943/menu/923/idx/176/currentPage/6)를 일반적인 복식 참고로 확인했다. 참조 인물의 의복·색·갓·신발과 원고의 상태 변화가 이어지는지 비교하는 데 사용했으며, 모든 이본의 시대·계층별 복식을 전문적으로 검증했다는 뜻은 아니다. 자세한 발견·반영 사항과 실제 화면 검증의 한계는 [구현 검토](review.md)에 기록했다.
