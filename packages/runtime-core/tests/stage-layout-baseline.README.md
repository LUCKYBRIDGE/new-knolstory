# Canonical layout fixtures

Captured by executing `resolveStageLayout` from `story-maker` commit `18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`, `app/story-stage-layout.ts`, after TypeScript transpilation. Values were not computed by the new implementation.

60 cases cover widths 320/640/1280, 0–4 actors, automatic and manual `xAnchor`, normal/mirrored asymmetric alpha geometry, differing scale and aspect ratios, shared centering, and height caps. Input objects remain unchanged after resolution. Numeric equality includes alpha bounds, visible edges, bottom baseline, overlap, safe rail and effective scale.

Stage-view fixtures preserve placement class, scale, sharing and mirroring results for all 421 catalog IDs and one unknown ID, independently evaluated using the fixed baseline stage-view functions.
