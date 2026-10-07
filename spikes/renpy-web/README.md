# Real Ren'Py responsive editing probe

This is a local M1b experiment, not a second Web renderer. `renpy/responsive-spike/game/script.rpy` consumes resolved RuntimeScene; it never receives StoryDocument or interprets Flow. The persistent screen presents resolved backgrounds, actual actor images, Korean dialogue and choices at 1280×720. The original rectangle fallback remains for geometry tests. Runtime Core supplies image paths, canvas rectangles, depth, mirror, opacity and actor treatments; Python does not interpret StoryDocument or calculate stage layout.

Pinned SDK: Ren'Py 8.5.3 (official stable release May 15, 2026). Official SDK and Web support are downloaded to the ignored `.cache/renpy/` directory. The generated WASM build is ignored at `apps/web/public/runtime/`.

From the repository root on macOS/Linux:

```sh
mkdir -p .cache/renpy
curl -L --fail https://www.renpy.org/dl/8.5.3/renpy-8.5.3-sdk.tar.bz2 -o .cache/renpy/sdk.tar.bz2
tar -xjf .cache/renpy/sdk.tar.bz2 -C .cache/renpy
curl -L --fail https://www.renpy.org/dl/8.5.3/renpy-8.5.3-web.zip -o .cache/renpy/web.zip
unzip -qo .cache/renpy/web.zip -d .cache/renpy/renpy-8.5.3-sdk
curl -L --fail 'https://raw.githubusercontent.com/google/fonts/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf' -o .cache/renpy/NotoSansKR.ttf
pnpm install
python3 spikes/renpy-web/build.py
pnpm dev
```

`KNOL_RENPY_SDK` can override the SDK directory. No global SDK installation is required. Noto Sans KR is licensed under the included `FONT-LICENSE.txt`; the initial font is the upstream variable font, not yet a performance-optimized subset. The build verifies the font SHA-256; if upstream changes it, retrieve the matching version or review an explicit upgrade. Production font subsetting remains follow-up work. SDK archive SHA-256 `eb0a9be7f0fb13632fe25ceade9a8bed5a1b4d6b6e83bd19eeeb29e1a1bb4a45` and Web archive SHA-256 `954db897e65f51ea63cb2fb7b203d02be0447f4e22069514020bbe6c6691fdfc` were verified against the official release checksums during this probe.

Build generates skin constants from `packages/design-tokens/tokens.json` and the JavaScript validator from `packages/runtime-contract/src/index.ts`. The iframe validates origin, parent source, envelope, scene, fixed dimensions and revision before enqueueing. Queue coalesces successive commands to the latest complete scene. A 50ms Ren'Py screen timer drains it; this is an experiment setting, not a latency promise. Ren'Py returns `sceneRendered` after rendering the actual textbox widget, with `textboxRect` in logical coordinates and `rendererRect` in iframe CSS pixels. The Ren’Py timer reports viewport changes after the engine has updated its virtual-to-physical transform. The host fits a 16:9 iframe and scales its entire surface when the displayed stage is smaller than 256px high: Ren’Py 8.5.3 clamps its internal physical dimensions to at least 256px, so using a smaller internal iframe directly crops the canvas. The current host keeps the internal iframe at 1280×720 and CSS-scales it as a unit. The engine transform is taken from the pinned SDK’s internal `renpy.display.draw.untranslate_point` / `get_physical_size` methods; SDK upgrades must rerun pixel-alignment tests. Runtime reports normalize that transform into iframe CSS coordinates; the host applies the iframe’s outer scale and offset.

The font loading/build is real Ren'Py/WASM. Chrome desktop automation can demonstrate resize and editing behavior, but cannot establish physical Android/Chromebook performance, mobile GPU correctness, touch comfort or long-session memory. Dialogue overflow currently uses a scrollable viewport; mobile text paging, audio and production accessibility remain follow-up work. The presenter now supports the fixed baseline effect families (shake, flash-red, fade-black, crack, spotlight, flash, screen-crack), flashback/fractured-reality looks, actor dim/spectral treatment and auto/confirmed black/white/perspective transitions. Motion is suppressed or softened under reducedMotion. Effects begin after transition completion and reset on scene entry, not on every edit revision. The native implementation preserves the cue meaning rather than copying browser CSS pixels.

Official reference: [Web/HTML5](https://www.renpy.org/doc/html/web.html), [8.5.3 download](https://www.renpy.org/release/8.5.3). Official Web support `renpy-pre.js` exposes `renpy_exc`, `renpy_get`, `renpy_set`; the probe deliberately uses a queue and explicit polling, so responsiveness must be measured rather than assumed.


## Shared image corpus and native presentation verification

`build.py` mirrors `apps/web/public/assets/` into generated `game/assets/` once for all works. Progressive image rules keep these files outside the initial game archive; the runtime requests images as needed. No per-story Ren’Py package is created. RuntimeScene paths are restricted by the shared guard to packaged `assets/legacy-18da4fc/` image paths, and authored text is rendered literally (Ren’Py text tags and interpolation are not executable story markup).

With the local Web server and native build running:

```sh
node spikes/renpy-web/verify-presenter.mjs
```

This invokes real Chromium/Ren’Py WASM, renders a baseline background and actor, clicks transition confirmation, next and choice controls, checks native events, compares actual screenshot pixels for all effect families and both looks, verifies reduced-motion shake suppression and automatic transition completion, and checks that unused common assets remain lazy. Evidence images are written under ignored `test-results/presenter/`. This presenter-level verification complements the four-work fixture/core/workspace tests; it alone does not prove every story path.
