# Stage Layout Skill

1. Read [responsive audio authoring](../../../docs/architecture/responsive-audio-authoring.md) and inspect current Runtime Core layout/scene compilation.
2. Runtime Core owns canonical math. Ren'Py and editing overlay consume the same resolved logical coordinates/transform; never add a second placement algorithm in Python/ATL.
3. Use only1280×720 and720×1280 stages, contained by the host. Retired classic requests map to widescreen. Native dialogue overlays the scene and fits actual page height; source pagination uses referencefont32 independent of readerfont. Never shrink or shift actors/background to avoid the dialogue panel.
4. Preserve authored manual position/scale, StageComposition meaning, speaker semantics and explicit inheritance. Do not alter content to conceal overlap.
5. Test multi-actor/speaker, manual anchors, portrait/landscape, resize/DPR, textbox overlap and overlay alignment. Assert actual rendering acknowledgement/rects, not only CSS container dimensions.
6. For runtime source changes build runtime then Web sequentially before static/native verification.

Keep layout decisions and limits current via [documentation governance](../../../docs/architecture/documentation-governance.md).

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](../../../docs/architecture/editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
