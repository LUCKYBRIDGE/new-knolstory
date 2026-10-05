# ADR 0004 — Runtime Core Owns Stage Layout

**Status:** Accepted

Canonical actor placement, safe rails, overlap, scale, facing, baseline and depth calculations live in engine-independent Runtime Core.
Ren'Py renders resolved placement rather than maintaining a divergent Python layout algorithm.
