# Asset Registry

Common, versioned runtime assets for the representative stories. StoryDocument retains stable Asset IDs; `resolveAsset(id)` maps them to a Web URL, Ren'Py-relative path, content SHA-256 revision and alpha geometry.

- Baseline: `LUCKYBRIDGE/story-maker` commit `18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`.
- Catalog: baseline `app/story-assets.ts` (421 assets), enriched with unchanged `app/assets/manifests/metadata.json` and `app/story-asset-geometry.generated.ts`.
- Runtime bytes: baseline `public/story-assets/<filename>` copied without transcoding to `apps/web/public/assets/legacy-18da4fc/<filename>`.
- Copyright and upstream source provenance remain in each catalog entry. The catalog is not a new license grant.
- Geometry threshold: alpha greater than 16/255, normalized visible bounds and original pixel dimensions.
- Hidden/secondary assets continue to resolve because legacy works can reference them. Picker visibility is metadata, not resolution policy.
- The catalog and nested metadata are frozen. Unknown IDs remain missing; they never silently map to another image.

`ASSET_CATALOG` is shared across works. Runtime packaging must use one common asset bundle, or supply assets on demand; do not create an engine build per story. The entire catalog is about 149 MB, so it must not be downloaded eagerly for every story.

The catalog test checks every copied asset against its content revision and verifies character geometry. Stage-layout tests in Runtime Core use captured results from the baseline algorithm for automatic/manual placement, mirroring, single/shared actors, one-sided groups and four-actor composition.
