# KnolStory Next — 차세대 놀스토리 개발 프로젝트 구성 및 운영 기준 v1.3

- 신규 공식 저장소: `LUCKYBRIDGE/new-knolstory`
- 레거시 기준 저장소: `LUCKYBRIDGE/story-maker`
- 레거시 Baseline: `18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`
- 권장 로컬 프로젝트 폴더: `/Volumes/WAN2/apps/new-knolstory`

## 핵심 원칙

**Continuity is not preservation.**

기존 놀스토리의 작품 의미, StoryDocument, `.knolstory`, Asset ID, StageComposition, Flow, 디자인 정체성과 검증된 UX는 계승한다.

하지만 화면 구조, 정보 배치, 버튼/패널 체계, 편집 UX, 자산 탐색, 반응형, 접근성, 성능, 렌더링 엔진, 코드 구조, 디자인 시스템, 연출 품질은 더 좋은 방법이 있으면 적극적으로 개선한다.

## 최종 구조

```text
KnolStory Web Service
        ↓
StoryDocument
        ↓
KnolStory Runtime Core
        ↓
RuntimeScene
        ↓
JS ↔ Ren'Py Bridge
        ↓
Ren'Py Web Runtime
```

- Web: 서비스/저작 UI/계정/학급/과제/제출/공유/Local-first
- Runtime Core: StoryDocument/Flow/StageComposition/Stage Layout/Asset/Presentation 해석
- Ren'Py Web: 실제 Stage, 대사, 선택지, 연출, 애니메이션, 오디오, 플레이

## SSOT

> 놀스토리 작품은 StoryDocument이고, Ren'Py는 StoryDocument를 실행하는 공식 Story Engine이다.

`.rpy`는 작품 원본이 아니다.

## 저장소 관계

```text
LUCKYBRIDGE/story-maker
        ↓ one-way inheritance
LUCKYBRIDGE/new-knolstory
```

`story-maker`는 레거시 안정 기준점이고, 신규 개발은 `new-knolstory`에서 수행한다.

## 디자인

루트 `DESIGN.md`는 디자인·UI·UX SSOT다.

기존 놀스토리 디자인은 `PRESERVE / REFINE / REBUILD / RETIRE`로 분류해 계승한다.

주요 legacy reference:
- `Knolstory_Story_Composition_UIUX_Redesign_Reference_v1.1.md`
- `story-maker_ui_ux_refactor_prompt.md`
- `app/globals.css`
- `app/StoryStudio.tsx`
- `app/components/SceneFocusEditor.tsx`
- `app/components/StoryPlayer.tsx`
- `app/components/StoryStage.tsx`

## 권장 구조

```text
new-knolstory/
├─ AGENTS.md
├─ DESIGN.md
├─ README.md
├─ STATUS.md
├─ apps/web/
├─ packages/
│  ├─ story-domain/
│  ├─ runtime-contract/
│  ├─ runtime-core/
│  ├─ asset-registry/
│  ├─ design-tokens/
│  ├─ ui/
│  └─ compatibility/
├─ renpy/
├─ server/
├─ assets/
├─ tests/
├─ scripts/
├─ docs/
└─ .agents/skills/
```

## 초기 개발 순서

1. 저장소/문서/Skill 기반 고정
2. StoryDocument + schema migration 승계
3. 대표 legacy fixture 확보
4. design tokens 정리
5. RuntimeScene v1 정의
6. Runtime Core 구현
7. Ren'Py Web shell
8. Web ↔ Ren'Py Bridge
9. 단일 Scene 렌더링
10. 기존 대표 작품 1개 호환
11. Editor Stage
12. branch/choice
13. effect/audio
14. visual parity
15. 기존 Web renderer retire

## 금지사항

- `.rpy`를 작품 SSOT로 사용하지 않음
- Web과 Ren'Py가 StoryProject를 각각 독립 해석하지 않음
- Stage Layout 중복 구현 금지
- 학생별 Ren'Py build 금지
- 서비스 비즈니스 로직을 Ren'Py에 넣지 않음
- Web Player와 Ren'Py Player를 최종 이중 유지하지 않음
- 기존과 같아야 한다는 이유로 개선을 막지 않음
- 기존 CSS 전체를 그대로 복사하지 않음
- text clipping으로 공간 문제를 해결하지 않음
- 기존 Asset ID를 이유 없이 바꾸지 않음

## 최종 선언

`LUCKYBRIDGE/new-knolstory`는 `LUCKYBRIDGE/story-maker`의 공식 후계 프로젝트다.

기존 작품과 데이터 의미, 디자인 정체성과 검증된 UX를 계승하되, 더 단순하고 일관되고 효율적이며 접근성과 표현력이 높은 구조가 있다면 적극적으로 개선·수정·재설계한다.
