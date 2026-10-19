# Migration Check Skill

Use after a document/storage/adapter structural change.

1. Define the supported input set from [storage contract](../../../docs/architecture/authoring-storage-contract.md) and [compatibility matrix](../../../docs/migration/compatibility-matrix.md). Preserve current Next works; do not silently enlarge this into legacy story-maker support.
2. Compare full documents before/after: source/provenance, cover layers, planning/memos, IDs, Flow (end/pending/implicit), StageComposition, presentation and audio attachments/order/metadata.
3. Verify originals remain unchanged, import errors/cancel preserve current work, independent copies avoid ID collisions and failed writes preserve recoverable data.
4. Verify official JSON and multitab Excel round trips, actual external-app exports when affected, reload/re-export and Runtime Core compilation. Add native Ren'Py playback and ShortStory Web/print checks for rendering changes.
5. Explicitly document intentional transformations and unsupported inputs. Never treat discarded authored data as successful migration.

Record input versions, source/build and commands/results/limits using [documentation governance](../../../docs/architecture/documentation-governance.md); update plans and current status without overwriting old run evidence.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](../../../docs/architecture/editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
