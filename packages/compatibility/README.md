# Compatibility

PRESERVE: the four representative KnolStory manuscripts returned by the fixed baseline `getExampleProject()` including all authored cuts, branches, actors, assets, notes and presentation. The independent classic reading editions are also retained as fixtures; they do not replace the branched manuscripts.

`representativeStories` provides descriptors and validated projects. `getRepresentativeStory(id)` returns a fresh v5 document. IDs: seonnyeo, heungbu, onggojib, rabbit.

Fixtures in `tests/fixtures/stories` are generated directly from `story-maker@18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`. No browser storage or current legacy checkout is read. Tests compare every authored field, validate immutable edits/file roundtrips and exercise v1 effect migration, v2 presentation, v5 explicit background hiding, broken links and explicit ending versus unfinished connections.
