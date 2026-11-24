# A2UI Focus Catalog Skill

집중 편집 화면(쓰기·원고·배경·인물·음향·연출)을 만들거나 고칠 때, 화면을 코드보다 먼저 [A2UI](https://a2ui.org) 화면 데이터로 짠다. 카탈로그에 있는 컴포넌트로만 짤 수 있으므로 [집중 편집 화면 규칙](../../../DESIGN.md#집중-편집-화면-규칙--2026-11-24-사용자-결정)을 기계가 검사한다.

1. 규칙을 읽는다: [DESIGN.md 집중 편집 화면 규칙](../../../DESIGN.md#집중-편집-화면-규칙--2026-11-24-사용자-결정), 카탈로그 [focus-editor-catalog.json](../../../packages/ui/src/a2ui/focus-editor-catalog.json)의 `instructions`와 각 컴포넌트 `description`.
2. 바꿀 화면의 설계도 `packages/ui/src/a2ui/screens/<task>.json`(A2UI v0.9 `createSurface` → `updateComponents` → `updateDataModel`)을 먼저 고친다. 새 도구는 그 작업 영역의 `ToolGroup`(4개까지)에, 가끔 쓰는 것은 `More`에 둔다. 문장은 `Notice`(빈 상태·오류·되돌릴 수 없는 일)에서만 쓴다.
3. `pnpm vitest run packages/ui apps/web/components/a2ui`로 설계도를 검사한다. 규칙 위반(`one-way` 같은 일 두 길, `one-primary`, `max-items`, `allowed-parents`, `enum` 간격·종류 등)은 설계도를 고쳐 없앤다. 검사를 끄거나 카탈로그를 화면 하나에 맞춰 넓히지 않는다.
4. 카탈로그에 없는 모양이 꼭 필요하면 카탈로그를 바꾼다: 컴포넌트 스키마 + `apps/web/components/a2ui/focus-surface.tsx`의 렌더러 하나 + 테스트를 같은 변경에서. 규칙 자체가 바뀌는 일이면 DESIGN.md 먼저 사용자 결정을 받는다.
5. 실제 화면 코드(`story-editing-workbench.tsx` 등)를 설계도에 맞추고 `tests/e2e/a2ui-blueprint-conformance.spec.ts`(host)로 실제 화면의 조작이 설계도와 같은지 확인한다. 설계도의 표본 자료는 선녀와 나무꾼 놀스토리판 1장 1컷이다. 개발 중 `/a2ui-catalog`(배포 빌드에서는 없음)에서 폰·태블릿 틀로 설계도를 본다. 실제 화면은 기존 e2e와 7크기 측정으로 확인한다 — 설계도 통과가 화면 동작을 증명하지 않는다.

카탈로그 ID `https://knolstory.app/a2ui/catalogs/focus-editor/v1/catalog.json`은 호환을 깨는 변경 때만 v2로 올린다. 사양 출처: [google/A2UI](https://github.com/google/A2UI), [카탈로그 개념](https://a2ui.org/concepts/catalogs/), [v0.9 소개](https://developers.googleblog.com/a2ui-v0-9-generative-ui/).

실제 화면에 카탈로그 부분을 직접 그릴 때는 [list-tools-surface.ts](../../../apps/web/components/a2ui/list-tools-surface.ts)처럼 A2UI 메시지를 만들고 `FocusSurface`(`rootId`로 부분만, `inline`으로 화면 배치에 맡김)로 그린 뒤 `onAction`의 이벤트 이름으로 실제 동작을 잇는다. 편집 셸의 단추·입력 규칙이 더 구체적이므로 크기는 렌더러 CSS의 `.inline` 규칙이 지킨다. 화면이 직접 그려야 하는 부분(그림 고르기, 무대 등)은 `Slot`에 `slots`로 채우고, 기기별 CSS는 `skin`, 화면 속성은 `attrs`로 넘긴다([editor-surfaces.ts](../../../apps/web/components/a2ui/editor-surfaces.ts)).
