"""Pinned Emscripten SDL input adapter; browser DPR and stage layout stay intact."""
DPR_IMPORT = 'var _emscripten_get_device_pixel_ratio=()=>typeof devicePixelRatio=="number"&&devicePixelRatio||1;'
CAPPED_DPR_IMPORT = 'var _emscripten_get_device_pixel_ratio=()=>Math.min(2,Math.max(1,typeof devicePixelRatio=="number"&&devicePixelRatio||1));'


def cap_runtime_pixel_ratio(source: str) -> str:
    """Bound framebuffer area to four times logical area in the shared runtime.

    Ren'Py 8.5.3's SDL backend consumes this import when creating/resizing its
    high-DPI window. Fail closed on an SDK glue change instead of guessing.
    """
    if source.count(DPR_IMPORT) != 1:
        raise ValueError("Expected exactly one pinned Emscripten SDL DPR import; review SDK upgrade.")
    return source.replace(DPR_IMPORT, CAPPED_DPR_IMPORT, 1)
