# packages/ui

Shared Web-service/editor UI contracts. Follow root DESIGN.md. Story Stage rendering does not belong here.

## A2UI focus editor catalog

- `src/a2ui/focus-editor-catalog.json` — an [A2UI](https://a2ui.org) v0.9 catalog (JSON Schema per component, `catalogId`, `instructions`) for the focus editing screens. It encodes DESIGN.md '집중 편집 화면 규칙': fixed skeleton (TopBar → Stage → CurrentCut → work → More), no free text component (sentences only in `Notice`), at most 4 controls per `ToolGroup`, spacing from 4/8/12/16/24, close as an icon, cut cards only on tablet/desktop.
- `src/a2ui/surface.ts` — applies A2UI messages (`createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface`) and validates a surface against the catalog plus the rules a schema cannot express (one primary button, one way per job across shared devices, WorkTabs selects the screen's task).
- `src/a2ui/screens/*.json` — blueprints of the six focus screens as A2UI messages.
- Renderer: `apps/web/components/a2ui/focus-surface.tsx` (one renderer per catalog component). Dev view: `/a2ui-catalog`.

Procedure: [.agents/skills/a2ui-focus-catalog](../../.agents/skills/a2ui-focus-catalog/SKILL.md).
