# ADR 0003 — RuntimeScene Contract

**Status:** Accepted

Runtime Core compiles StoryDocument into a versioned RuntimeScene/RuntimeCommand contract.
Ren'Py consumes this contract instead of independently interpreting StoryProject.
Bridge events are versioned and validated.
