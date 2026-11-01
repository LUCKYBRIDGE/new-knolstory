# Asset Pipeline Skill

Use for Asset IDs, metadata, source media, geometry, derivatives or audio delivery.

1. Read the [layout ownership ADR](../../../docs/decisions/0004-stage-layout-owned-by-runtime-core.md) and [authoring storage contract](../../../docs/architecture/authoring-storage-contract.md); inspect the resolver and provenance implementation before editing.
2. StoryDocument stores stable IDs; archives carry portable user-audio attachments. Keep source bytes, runtime derivatives and thumbnails distinct. Never replace a master with a runtime optimization.
3. Preserve existing IDs and resolve them to versioned runtime paths. Share common bytes rather than generating one asset package per work/student.
4. For custom audio reuse archive MIME/signature/SHA/provenance/size validation. Preserve explicit unused attachments and attachment order.
5. `audio-resources` stores shared bytes and per-work metadata separately. Importing another work with the same audio ID must not overwrite the original work's name, kind or provenance; copies preserve metadata and bytes.
6. Verify file/Excel/Google round trips and two-work import/copy/reload/re-export when audio storage changes. Run `pnpm test:media-provenance` for affected source/provenance work.
7. Generated runtime assets require `pnpm runtime:build` before `pnpm build`; then verify the served result. Respect private media boundaries and existing permissions.

Record changed owners/contracts and evidence through [documentation governance](../../../docs/architecture/documentation-governance.md). Do not infer public release rights from a valid hash.

Common-service audio follows [service rights](../../../docs/architecture/audio-service-rights.md) and [ADR0021](../../../docs/decisions/0021-scene-integrated-audio-rights.md). Only reviewed, scope-specific approvals enter the shared catalogue; preserve scene-only/standalone/preview/reference-export limits rather than treat every source as CC0. Run `pnpm test:service-audio`; build checks source hashes/rights/evidence and runtime ZIP contents. Excluded IDs stay in authored files as non-playable references, with a clear editor notice. Do not re-enable a retired source to satisfy a historical test or infer common-library approval from a user-entered provider tag.

For searchable sound properties read [audio attributes](../../../docs/architecture/audio-attributes-and-import.md) and [ADR0019](../../../docs/decisions/0019-audio-search-attributes-and-sources.md). Preserve original name, provider evidence and per-work tags; a provider tag alone does not establish rights. Check normal decoding, actual renderer paths and external worksheet edits; do not call metadata-only rows playable assets.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](../../../docs/architecture/editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.

For publication checks distinguish `story-service` from `standalone-assets`. Owner permission lives in the hash-pinned project-media authorization; it is not a CC0 dedication. Service-only images and scene-only approved audio retain their restrictions. Runtime distribution review binds exact package members and public SDK notices; regenerate and review evidence after runtime changes instead of relabelling an opaque binary. See [source/use review](../../../docs/architecture/evidence/media-rights-2026-11-01/checkpoint.json). Generated same-byte copies may use `usageReferencesFrom` only with an exact source SHA and no reference chain.

Provided KnolStory scene backgrounds are character-free; actors are separate selectable sprites. Covers and ShortStory pages explicitly allow scene illustrations. Do not globally hide or delete the old illustration catalogue. Preserve exact-catalog migration gates and the body/costume/shoe timeline when changing visual mappings; inspect ghost appearance separately from living companion actors. New generated sprites keep uniform body scale and transparent headroom for sitting/bending, not equal silhouette heights. See [layered scene review](../../../docs/architecture/evidence/layered-stories-2026-11-02/review.md) and the current `catalog-layered-scenes.ts` transform. Generated project files tracked in the checkout are not fixed-baseline legacy media; restoration validates them without trying to fetch them from story-maker.
