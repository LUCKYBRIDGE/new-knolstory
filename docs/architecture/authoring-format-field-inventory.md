# 뉴놀스토리 저작 형식 필드 인벤토리

기준일: 2026-10-09. 목적: `authoring-format-development-plan.md` 1단계의 현재 구현 조사 산출물이다. 이 문서는 기존 story-maker 파일 호환을 목표로 하지 않고, 현재 Next 저작 요소를 공식 작품 파일, Excel, Google 시트, 향후 API/PostgreSQL `jsonb` 저장 계약으로 옮길 때 빠뜨리면 안 되는 필드를 코드 기준으로 나열한다.

## 현재 구현과 전수 대응

공식 v2는 `authoring-archive.ts`의 공통 검증과 `authoring-workbook/`의 필드별 표 모델을 사용한다. Web 파일 선택은 `previewAuthoringFile`로 전체 검증·컷 컴파일 후 미리보기를 제공하고, 사용자가 사본 적용을 선택하면 저장한다. 공식 Excel은 `exportAuthoringExcel`/`importAuthoringExcel`이다. 이전의 단일 표 v1·공개 TSV는 별도의 제한된 간단 양식이다.

| 현재 저작 그룹 | 공식 편집 탭 | 상태 |
|---|---|---|
| 문서/작품·장·컷·인물·기본 무대·이어쓰기·출처 | 형식 정보, 작품 정보, 장, 컷, 인물, 이름과 장 자료, 작품 기본 무대, 이어쓰기 위치, 작품 출처와 출처 경로 | 직접 편집·왕복 구현 |
| Flow·선택지·엔딩 | 컷 흐름, 선택지, 엔딩 | 직접 편집·왕복 구현 |
| StageComposition·동작·화자 | 무대 구성, 무대 인물, 무대 화자 | JSON 없이 필드별 직접 편집·왕복 구현 |
| 음악·환경음·효과음·자료/출처 | 오디오 설정, 음악 환경음, 효과음, 음원 자료, 음원 데이터 | cue/출처 직접 편집. bytes는 보존 자료로 무결성 검사 |
| 연출·구도·효과·전환·좌우 override | 연출 구성, 연출 효과, 연출 인물 | 직접 편집·왕복 구현 |
| 표지 세 면·글/그림·자유 배치 | 표지 정보, 표지 디자인, 표지 면, 표지 글 레이어, 표지 그림 레이어 | 직접 편집·왕복 구현 |
| 기획·메모·항목·연결 | 작품 기획, 창작 메모, 메모 항목, 메모 연결 | 직접 편집·왕복 구현. 미해결 메모 연결도 도메인 의미대로 보존 |
| 숏스토리 작품·쪽·표지 | 형식 정보, 그림책 정보, 그림책 쪽, 표지 디자인/면/글 레이어/그림 레이어 | 직접 편집·왕복 구현 |

현재 타입에서 자동 생성한 `packages/compatibility/src/authoring-field-schema.json`과 [필드 전수 검사 결과](evidence/authoring-format/all-fields-coverage.json)가 코드 기반의 대응 근거다. 놀스토리318개·숏스토리95개 scalar 경로 및 구조 variant를 검사한다. 이는 모든 enum 조합이나 모든 외부 앱 버전을 테스트했다는 뜻은 아니다. 허용 값·빈 값·행 추가 방법은 workbook의 `사용 안내`와 [양식 계약](authoring-workbook-v2.md), 최신 검증 상태는 [실행 계획](authoring-format-development-plan.md)을 따른다.

## 구현 전 조사 기록

**아래 표의 ‘현재’와 ‘필요’는 구현 착수 시점의 상태다.** 당시 발견한 payload-only 및 JSON 셀 제한을 보존한 감사 기록이며, 현재 제품의 미구현 목록으로 해석하지 않는다. 현재 판정은 위 대응표와 실행 계획을 기준으로 한다.

## 조사한 실행 경로

- 공식 놀스토리 문서: `StoryDocumentEnvelope`는 `documentType`, `schemaVersion`, `savedAt`, `appVersion`, 선택 `assetCatalogVersion`, `project`로 구성된다. 현재 버전은 `CURRENT_SCHEMA_VERSION = 5`이며 `createStoryDocument`가 `canonicalizeProjectStage`와 `canonicalizeProjectPresentation`을 통과시킨다. 근거: `packages/story-domain/src/legacy/story-project-document.ts`의 `StoryDocumentEnvelope`, `CURRENT_SCHEMA_VERSION`, `createStoryDocument`.
- 놀스토리 가져오기/파일 이동: UI의 파일 선택은 `WorkspaceManagement`의 `.knolstory/.xlsx/.tsv/.csv` 입력으로 들어와 `readStoryFile`을 호출한다. `.xlsx`는 `importStoryExcel`, `.csv/.tsv`는 `importStoryTable`, JSON은 `loadStoryArchive`로 들어간다. `loadStoryArchive`는 `parseStoryDocument`, 모든 컷의 `compileStoryScene`, custom audio resource 존재 검사를 수행한 뒤 `importAudioResources`로 보관한다. 근거: `apps/web/components/workspace-management.tsx`의 `StoryTransferPanel`/file input, `apps/web/lib/story-archive.ts`의 `readStoryFile`, `loadStoryArchive`, `portableStory`.
- 놀스토리 Excel/시트 내보내기: `StoryTransferPanel.exportTable`은 `portableStory(project)`를 만든 뒤 `exportStoryExcel` 또는 `serializeTableTsv(exportStoryTable(...))`를 다운로드한다. Google 시트는 공개 URL을 `googleSheetTsvUrl`로 변환해 TSV를 fetch하고 `importStoryTable(parseTableTsv(...))`로 읽는다. 근거: `apps/web/components/story-transfer-panel.tsx`.
- 현재 놀스토리 표 형식: `exportStoryTable`은 `payload` 행에 전체 `{ document, audioResources }`를 JSON chunk로 보존하고, 편집 행으로 `project`, `chapter`, `cut`만 만든다. 실제 셀로 직접 편집되는 열은 고정 `HEADER` 18개뿐이며, 많은 필드는 payload로만 보존된다. 근거: `packages/compatibility/src/story-table.ts`의 `HEADER`, `tablePayload`, `exportStoryTable`, `importStoryTable`.
- 숏스토리 파일/표 경로: `.shortstory`는 `{ manifest:{format:'shortstory',version:1,kind:'project'}, project }` JSON이며, Excel/TSV는 공통 `tablePayload('shortstory', checked)`와 `project`, `page` 행을 사용한다. 근거: `packages/compatibility/src/shortstory.ts`의 `encodeShortStory`, `decodeShortStory`, `exportShortStoryTable`, `importShortStoryTable`.
- 숏스토리 UI 경로: `ShortStoryWorkspace`는 `.shortstory`, `.xlsx`, `.tsv`, 공개 Google 시트 가져오기, A4 인쇄, 표지 꾸미기, 원본 보호 사본을 같은 화면에서 연결한다. 근거: `apps/web/app/shortstory/shortstory-workspace.tsx`.

## 놀스토리 도메인 필드

| 그룹 | 필드/타입 | 의미와 기본값 | 현재 UI | 현재 파일/표 상태 | 향후 직접 표 편집 필요 |
|---|---|---|---|---|---|
| Envelope | `documentType:"story-maker-project"`, `schemaVersion:5`, `savedAt`, `appVersion`, `assetCatalogVersion?`, `project` | 파일/API 저장 단위. `savedAt`은 strict UTC ISO. `assetCatalogVersion`은 있으면 nonblank. | 직접 편집 없음 | `.knolstory` JSON에는 있음. 현행 표 payload에만 있음 | metadata 탭 또는 manifest 탭에서 읽기 전용/명시 편집 정책 필요 |
| Project basic | `id`, `title`, `description`, `updatedAt` | 작품 ID, 표시 제목/소개, 수정 시각. | 준비 화면의 제목/소개, 새 작품/서재 흐름 | 표 `project` 행은 `id/title/description`만 편집. `updatedAt`은 payload 보존 | `updatedAt`은 import 시점 갱신인지 원본 보존인지 계약 필요 |
| Source | `source?: blank/baseEdition/publication/sharedFile` 및 `linearCreation` | 원본/판본/공유 파일 출처와 사본 의미. | 내 사본/읽다 편집 흐름에서 사용 | payload 보존만 | 서버 ownership/assignment와 분리된 provenance 탭 필요. 학생이 임의 편집할 범위 제한 필요 |
| Choice mode | `choiceMode?: "simple"|"choice"|"free"` | 작품 저작 모드. | 새 작품/분기 UI에서 간접 사용 | payload 보존만 | project-settings 탭 직접 셀 필요 |
| Stage defaults | `stageDefaults?: {backgroundId,leftAssetId,rightAssetId}` | 장/컷 기본이 비었을 때 상속되는 기본 무대. | 일부 기본 배치/새 컷 생성 경로 | payload 보존만 | project-stage-defaults 탭 필요 |
| Characters | `characters?: {id,name,role,description,defaultImageId}[]` | 화자/인물 pool, default image 연결. | 화자 등록/자산 선택 UI에서 사용 | payload 보존만 | characters 탭 필요. `defaultImageId` asset 검증 필요 |
| Speaker names | `speakerNames:string[]` | 화자 이름 후보. | `StorySpeakerControls` | payload 보존만 | speakers 탭 또는 characters와 통합 |
| Sheet link | `sheetUrl:string`, `sheetEditable:boolean` | 작품 안에 보관되는 외부 시트 메타. 현재 transfer UI의 URL state와 별개다. | 현재 UI는 transient Google URL input만 확인됨 | `.knolstory`/payload 보존. 표 직접 편집 없음 | 서버/외부 시트 연동 전까지 포함/제외 정책 필요 |
| Continuation | `continuation?: {chapterId,lineId,label}` | 이어쓰기/대표 continuation 위치. | 읽다 편집/이어쓰기 경로 | payload 보존만 | flow 탭과 참조 검증 필요 |

## 기획과 메모

| 그룹 | 필드/타입 | 의미와 기본값 | 현재 UI | 현재 파일/표 상태 | 향후 직접 표 편집 필요 |
|---|---|---|---|---|---|
| Planning | `premise`, `structureMode`, `material`, `theme`, `mainCharacter`, `mainGoal`, `centralProblem`, `stakes`, `endingChange`, `opening`, `middle`, `crisis`, `climax`, `ending`, `characterNotes`, `worldNotes`, `mood`, `openQuestions`, `freeNotes` | `normalizePlanning`은 누락 시 빈 문자열, `structureMode` 기본 `"five"`를 만든다. | `StoryPreparation`의 작품 준비/이야기 기획 | payload 보존만. 현행 표 `project` 행에 없음 | planning 탭 필요. 긴 한글/줄바꿈 보존 필요 |
| Memos | `creativeMemos[]` | memo `id`, `kind`, `title`, `fields`, `order`, `createdAt`, `updatedAt`, 단일/복수 장·컷·인물 연결을 가진다. | `StoryPreparation`의 창작 메모, 항목 추가/이름/순서/삭제/undo, 검색/필터 | payload 보존만. 표 직접 편집 없음 | memos, memo-fields, memo-links 탭 필요. 복수 연결과 legacy 단일 연결을 동시에 보존해야 함 |
| Memo fields | `fields[]: {id,label,value,order,source}` | 메모 내부 항목. `source`는 default/recommended/custom. | MemoFieldEditor | payload 보존만 | memo-fields 탭에서 order와 source 직접 편집 |
| Memo links | `linkedChapterId`, `linkedLineId`, `linkedChapterIds`, `linkedLineIds`, `linkedCharacterNames` | 단일/복수 연결. UI에서 새 위치를 고르면 복수 연결이 단일 연결로 축약될 수 있다는 안내가 있다. | MemoEditor | payload 보존만 | memo-links 탭 필요. import가 복수 연결을 silently 축약하면 안 됨 |

## 장, 컷, 흐름

| 그룹 | 필드/타입 | 의미와 기본값 | 현재 UI | 현재 파일/표 상태 | 향후 직접 표 편집 필요 |
|---|---|---|---|---|---|
| Chapter identity | `id`, `order`, `chapterNumber?`, `branchLabel?`, `title` | 표시 순서와 이야기 번호/갈래. `chapterNumber`는 1 이상의 정수, `branchLabel`은 20자 이하. | 컷 목록/분기 장 생성/장 이름 | 표 `chapter` 행에서 직접 편집 | 유지. header 기반으로 이동/추가/삭제 안전화 필요 |
| Chapter notes | `summary`, `purpose`, `mood`, `keyEvents`, `nextChapterIdea`, `storyStageKeys` | 장 요약/목적/분위기/사건/다음 아이디어/서사 단계. | 일부 준비/대본 UI에서 사용 | `summary`만 표 직접 편집. 나머지는 payload 보존 | chapter-planning 탭 또는 chapter 행 확장 필요 |
| Chapter asset pools | `chapterSpeakerNames`, `characterAssetIds`, `backgroundAssetIds`, `backgroundId`, `leftAssetId`, `rightAssetId` | 장 기본 화자/자산 pool과 기본 무대. | 자산 선택의 장 자료 pool, 장 기본 배경/인물 | `backgroundId/leftAssetId/rightAssetId`만 표 직접 편집. pools는 payload 보존 | chapter-assets 탭 필요 |
| Chapter audio | `audio?: StoryAudio` | 장 진입 음악/환경음/효과음. | 현행 `StoryAudioControls`는 scope `cut`만 확인됨. 타입은 장에도 존재 | 표 `chapter` 행의 `audio` JSON 셀로 직접 편집 | JSON 셀 대신 chapter-audio/audio-cues 탭으로 분해 필요 |
| Cut identity | `id`, `chapterId`, `order`, `workingTitle?` | 컷 ID, 장 참조, 장 안 순서, 내부 작업 제목. | 컷 목록/대본/나누기/합치기 | 표 `cut` 행에서 직접 편집 | 유지. ID 변경 시 flow/memo/stage actor target 참조 갱신 규칙 필요 |
| Cut text | `type`, `speaker`, `speakerName`, `coSpeakerNames?`, `text` | 대사/해설, 화자 위치/이름, 공동 화자, 본문. | Inspector text section | `type/speaker/speakerName/text` 직접 편집. `coSpeakerNames` payload 보존 | co-speaker 탭/열 필요 |
| Cut notes | `purposeNote`, `emotionNote`, `directionNote` | 컷 목적/감정/연출 메모. | 대본/연출 참고 UI에서 일부 사용 | payload 보존만 | cut-notes 탭 필요 |
| Background | `backgroundId`, `backgroundMode?: "none"` | 배경 ID 또는 명시적 배경 없음. `backgroundMode:"none"`일 때 `backgroundId`는 빈 문자열. | Inspector assets section | `backgroundId` 직접 편집, `backgroundMode` payload 보존 | backgroundMode 열 필요 |
| Legacy actor projection | `leftAssetId`, `rightAssetId`, `inheritActors?` | StageComposition의 첫 left/right actor projection, 또는 장/작품 기본 상속. | Inspector asset fields | `leftAssetId/rightAssetId` 직접 편집, `inheritActors` payload 보존 | inheritActors 열 필요. StageComposition과 충돌 시 canonicalize 규칙 표시 |
| Flow | `flow?: {type:"goto",targetLineId:string|null} | {type:"choice",options[2..4]}` | 없음이면 다음 ordered cut, `null`은 명시 엔딩, `""`은 연결 대기. | Inspector flow section, 선택지 장 생성, FlowMap | 단일 `flow` JSON 셀로 직접 편집 | flow/options 탭 필요. option ID/label/target을 행으로 관리 |
| Ending | `ending?: {name,description,endsStory}` | 명명된 엔딩. flow의 `goto:null`과 별도 필드가 존재한다. | 일부 읽기/엔딩 경로 | payload 보존만 | endings 또는 cut-ending 열 필요. `flow`와 관계 확정 필요 |

## 무대, 연출, 오디오, 자산

| 그룹 | 필드/타입 | 의미와 기본값 | 현재 UI | 현재 파일/표 상태 | 향후 직접 표 편집 필요 |
|---|---|---|---|---|---|
| StageComposition | `leftActors[]`, `rightActors[]`, `speakerActorKey?`, `speakerActorKeys?` | 각 좌/우 최대 2명. 배열 순서가 L1/L2/R1/R2 canonical order이며 빈 배열은 명시 퇴장. | Inspector assets + composition controls + actor controls | 단일 `stageComposition` JSON 셀로 직접 편집 | stage-actors 탭 필요. side/order/key/assetId/speaker flag를 분리 |
| Stage actor | `key`, `assetId`, `characterKey?`, `placementPreset?`, `position?`, `positionOrder?`, `xAnchor?`, `scaleMultiplier?`, `facing?`, `baseDepth?`, `depthOverride?`, `motion?` | 인물의 ID, 배치, 깊이, 방향, 컷 진입 동작. 범위 검증은 `isStageComposition`. | actor image/position/facing/motion/size controls | JSON 셀/payload | stage-actors 탭에서 직접 편집. `speakerActorKey`와 actorKey 참조 검증 필요 |
| Presentation background | `backgroundFit`, `backgroundFocal` | 배경 표시 방식과 focal point. | Inspector의 배경 표시/중심 | 단일 `presentation` JSON 셀 | presentation-background 탭 또는 cut 열 |
| Presentation effects | `effects[]` 최대 3, `target`, `scope`, `repeat`, `periodMs`, `type`, `intensity`, `trigger`, `delayMs`, `id?`, `clearFollowingEffects?` | 화면/배경/actor 효과, following/loop와 clear. | `StoryEffectControls` | JSON 셀 | effects 탭 필요. actor target은 Stage actor key 참조 |
| Presentation look/transition | `look`, `transition` | 회상/균열 분위기, fade/dissolve/perspective 전환, confirm/auto, cue/title/description/actionLabel. | Inspector presentation section | JSON 셀 | presentation 탭 필요 |
| Presentation actors | `actors.left/right` override | 좌/우 legacy actor override: x/scale/facing/opacity/emphasis/spectral. | 일부 reset/legacy override 경로 | payload/JSON | stage actor와 병합하거나 별도 presentation-actors 탭 필요 |
| Audio | `StoryAudio` with `music`, `ambience`, `sounds[]` | music/ambience는 maintain/stop/play, sound는 최대 4개. | `StoryAudioControls` | 장/컷 `audio` JSON 셀. custom bytes는 `audioResources` payload/`.knolstory` top-level | audio-cues 탭 필요. assetId와 custom resource manifest 분리 |
| Portable audio resources | top-level `audioResources` | 실제 사용 중인 `audio:custom:*` bytes만 파일에 포함. memory: 5MB/file, 20MB project, 20MB attachment table 계약이 있음. | Audio picker/storage 경로 | `.knolstory` top-level, table payload `audioResources` | 표에서 bytes 직접 편집 대상 아님. manifest/resource attachment 탭과 파일 첨부 정책 필요 |

## 표지

| 그룹 | 필드/타입 | 의미와 기본값 | 현재 UI | 현재 파일/표 상태 | 향후 직접 표 편집 필요 |
|---|---|---|---|---|---|
| Basic cover | `author`, `subtitle`, `authorNote`, `layout`, `theme`, `font`, `titlePosition`, `authorPosition`, `align`, `titleSize`, `titleColor`, `backgroundId`, `characterId`, `characterPosition`, `presetId?` | 서재/표지 표시용 기본 설정. `DEFAULT_COVER`는 author/subtitle/note empty, layout classic, theme forest, font serif, titleSize 36. | 준비 화면 기본 표지, `BookCoverEditor` | payload 보존만 | cover-basic 탭 필요 |
| Free cover composition | `composition?: {version, backgroundFit, backgroundX/Y/Zoom, characterX/Bottom/Scale, titleX/Y/Width, showEdition, textPanel}` | 기본 표지 자유 배치. | BookCoverEditor의 내 마음대로 배치 | payload 보존만 | cover-composition 탭 필요 |
| Advanced cover design | `design?: CoverDesign` | 세 면(front/spine/back), finish, band, face preset, text/image elements. | BookCoverEditor의 세 면과 글/그림 상자 편집 | payload 보존만 | cover-faces, cover-elements 탭 필요 |
| Cover text element | `id`, `type:"text"`, `role`, `region`, `content(bind/text)`, `box`, `style(fontId,fontSize,color,align,writing)` | 한 글 상자 500자, face별 text 12개 제한. | 텍스트 상자 추가/선택/문구 연결/스타일 일부 | payload 보존만 | cover-elements 탭에서 직접 편집 |
| Cover image element | `id`, `type:"image"`, `role`, `assetId`, `assetType`, `box`, `frame`, `crop` | face별 image 4개 제한. asset type 검증. | 그림 상자 추가/선택/crop/frame 일부 | payload 보존만 | cover-elements 탭에서 직접 편집 |

## 숏스토리 필드

| 그룹 | 필드/타입 | 의미와 기본값 | 현재 UI | 현재 파일/표 상태 | 향후 직접 표 편집 필요 |
|---|---|---|---|---|---|
| ShortStoryProject | `id`, `title`, `description`, `authorDisplayName`, `source?`, `cover`, `pages[]`, `updatedAt` | 그림책 파일 단위. 10MB 파일 제한, 1-500쪽. | ShortStoryWorkspace title/author/description/library/original copy | `.shortstory` JSON 보존. 표 `project` 행은 title/authorDisplayName/description만 편집 | source, updatedAt, cover design 직접 표 편집 필요 |
| ShortStory cover | `cover:{backgroundId, characterId, authorNote, design?}` | 표지 배경/인물/마지막 인사/세 면 디자인. | 표지·소개 details, BookCoverEditor 재사용 | 표 `project`/`page` 행에는 `authorNote/design` 직접 편집 없음. payload 보존 | shortstory-cover 탭 필요 |
| ShortStory page | `id`, `order`, `title`, `text`, `backgroundId`, `leftAssetId`, `rightAssetId` | 한 쪽의 제목/본문/그림. | 쪽 목록/쪽 제목/본문/그림 picker/추가/복제/이동/삭제 | 표 `page` 행에서 직접 편집 | 유지. header 기반/다중 탭 전환 필요 |
| Print | Web/CSS A4 render | 파일 필드가 아니라 렌더링 결과. | `window.print()` | 파일 형식에는 없음 | 검증 산출물로 관리, 서버 문서에는 포함하지 않음 |

## 현재 표 형식의 직접 편집 범위와 gap

현행 놀스토리 표 `HEADER`는 다음 18열이다: `kind`, `id`, `chapterId`, `order`, `title`, `speakerName`, `text`, `backgroundId`, `leftAssetId`, `rightAssetId`, `type`, `speaker`, `flow`, `audio`, `presentation`, `stageComposition`, `chapterNumber`, `branchLabel`.

직접 편집 가능:

- project: `id` 확인, `title`, `description`.
- chapter: `id`, `order`, `title`, `summary`, `backgroundId`, `leftAssetId`, `rightAssetId`, `audio` JSON, `chapterNumber`, `branchLabel`.
- cut: `id`, `chapterId`, `order`, `workingTitle`, `speakerName`, `text`, `backgroundId`, `leftAssetId`, `rightAssetId`, `type`, `speaker`, `flow` JSON, `audio` JSON, `presentation` JSON, `stageComposition` JSON.

payload로만 보존되는 주요 요소:

- planning 전체, creativeMemos 전체, characters, speakerNames, source, choiceMode, stageDefaults, sheetUrl/sheetEditable, continuation.
- chapter `purpose`, `mood`, `keyEvents`, `nextChapterIdea`, `storyStageKeys`, `chapterSpeakerNames`, `characterAssetIds`, `backgroundAssetIds`.
- cut `coSpeakerNames`, `backgroundMode`, `inheritActors`, `ending`, `purposeNote`, `emotionNote`, `directionNote`.
- cover 전체와 고급 `CoverDesign`.
- custom audio bytes인 top-level `audioResources`.

표 직접 편집이라고 부르기 어려운 요소:

- `flow`, `audio`, `presentation`, `stageComposition`은 단일 JSON 셀이다. Excel/Google 시트에서 편집은 가능하지만, 사용자 실수에 대한 행/셀 단위 안내, 관계 추적, header 이동 대응, 검증 summary가 부족하다.
- `payload` 행이 없으면 importer는 실패한다. 빈 공식 표에서 새 작품을 작성하는 경로가 아직 없다.
- `readTablePayload`는 허용 행 kind를 보지만 header 이름을 기준으로 열을 찾지 않는다. 현재 importer는 고정 index를 사용한다.
- Google Sheets 경로는 공개 단일 TSV 탭만 읽는다. 다중 탭 workbook/실제 Google 편집 roundtrip 계약은 아직 없다.

## 권장 root schema 초안

다음 단계에서 코드로 옮길 스키마의 루트는 파일/표/API가 같은 단어를 쓰도록 분리하는 것이 좋다.

```ts
type KnolStoryExchangeEnvelopeV1 = {
  format: "knolstory-exchange";
  formatVersion: 1;
  document: StoryDocumentEnvelope;
  resources: {
    audio: PortableAudioResource[];
  };
  meta: {
    exportedAt: string;
    appVersion: string;
    assetCatalogVersion?: string;
  };
};

type KnolStoryWorkbookV1 = {
  manifest: ManifestRows;
  project: ProjectRows;
  planning: PlanningRows;
  characters: CharacterRows;
  speakers: SpeakerRows;
  chapters: ChapterRows;
  chapterAssets: ChapterAssetRows;
  cuts: CutRows;
  flowOptions: FlowOptionRows;
  stageActors: StageActorRows;
  presentationEffects: PresentationEffectRows;
  audioCues: AudioCueRows;
  memos: MemoRows;
  memoFields: MemoFieldRows;
  memoLinks: MemoLinkRows;
  cover: CoverBasicRows;
  coverElements: CoverElementRows;
  resources: ResourceManifestRows;
};
```

서버/API/PostgreSQL 경계:

- API payload는 `StoryDocumentEnvelope`와 resource manifest를 받되, 계정/권한/학급/과제/제출 관계는 별도 relational row가 소유한다.
- PostgreSQL `jsonb`에는 검증 완료한 `StoryDocumentEnvelope.project` 또는 envelope 전체를 저장할 수 있지만, 권한·submission immutability·revision/idempotency는 jsonb 내부 필드에 기대면 안 된다.
- `schemaVersion`, `formatVersion`, `payloadVersion`, `storageRevision`은 분리한다.
- 놀스토리 runtime 저장은 `StoryDocument → Runtime Core → RuntimeScene → Ren'Py` 경계를 유지하고, 숏스토리/A4는 Web/CSS 예외로 유지한다.

## 완료 판정을 위한 인벤토리 기반 체크리스트

- 모든 payload-only 필드를 workbook 탭/열에 노출하거나, 직접 편집 제외 사유를 명시한다.
- JSON 셀로 남기는 필드는 사용자 편집용 schema/example/error path를 제공한다. 가능하면 반복/관계형 필드는 행으로 분해한다.
- 빈 workbook에서 `StoryDocumentEnvelope`를 생성할 수 있어야 한다.
- 기존 workbook에서 행/열 이동, 빈 행, 추가 행, 삭제 행을 header와 ID 기준으로 해석한다.
- import 전에 적용 summary를 만든다: 생성/수정/삭제, broken references, resource missing, version mismatch.
- 실패 시 현재 workspace를 유지하고 resource만 반쯤 남기지 않는다.
- `.knolstory`, `.xlsx`, Google Sheets TSV/export, `.shortstory` 각각 외부 앱 왕복 증거를 별도 evidence로 남긴다.

2026-10-14 현행 확장: StoryDocument8의 effect/play music/ambience/SFX branchCondition은 workbook8의 세 일반 열로 왕복한다. [갈래 계약](branch-scope-authoring-contract.md)과 생성 스키마가 필드 소유 기준이다. archive2/ShortStory 문서1/JSONB envelope1은 유지한다.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
