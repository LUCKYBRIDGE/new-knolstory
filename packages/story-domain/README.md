# Story Domain

PRESERVE: fixed legacy baseline `18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b` StoryDocument schema v1–v5, validation, stages, flow, cover and presentation semantics. REBUILD: rendering is exclusively Runtime Core → RuntimeScene → Ren’Py; this package has no player, React, persistence or service code.

`src/legacy` retains independently testable baseline rules. `story-data.ts` is the complete type section with seed/UI helpers removed. Cover validation carries only the baseline ID/type allowlist, not an image renderer. Relative imports are adjusted for the monorepo; extraction does not change manuscript fields. Legacy recommendation/display templates, cover layer editor/workbook utilities and Web Animation player helpers are omitted because they are outside document interpretation. Complete cover recipes and creative memo fields remain supported by validation and normalization.

Public entry point: parseStoryDocument, createStoryDocument, serializeStoryDocument, updateStoryLine plus full project/line/chapter/stage/presentation/flow contracts. Validation errors preserve the original input; updates clone authored data and validate complete output.

Reproduce from the reference repository: `python3 scripts/extract-legacy-content.py [legacy-repository]`. This reads the fixed Git commit, never the checked-out legacy files.
