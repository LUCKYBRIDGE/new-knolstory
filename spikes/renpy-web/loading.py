"""Apply the product boot shell to the pinned SDK template without changing engine JS."""

PRESPLASH = '<img id="presplash" src="web-presplash.jpg">'
BRANDED_PRESPLASH = '''<div id="presplash" class="knol-loading" role="status" aria-live="polite">
    <div class="knol-loading-content">
      <picture class="knol-loading-portrait"><source id="knol-loading-still" media="(prefers-reduced-motion: reduce)"><img id="knol-loading-character" class="knol-loading-character" alt="" hidden></picture>
      <svg class="knol-loading-book" viewBox="0 0 72 56" width="72" height="56" fill="none" aria-hidden="true">
        <path d="M36 47V12M36 12C27 6 16 5 6 8V42C17 39 27 41 36 47C45 41 55 39 66 42V8C56 5 45 6 36 12Z"/>
        <path d="M14 16C20 15 26 16 30 18M14 24C20 23 26 24 30 26M42 18C46 16 52 15 58 16M42 26C46 24 52 23 58 24"/>
      </svg>
      <p class="knol-loading-brand">놀스토리</p>
      <h1>이야기 무대를 준비하고 있어요</h1>
      <p class="knol-loading-hint">처음에는 조금 더 걸릴 수 있어요.</p>
      <div class="knol-loading-tip">
        <span id="knol-loading-tip-label">작품을 이어 쓰는 방법</span>
        <p id="knol-loading-tip-text">작품 파일을 기기에 저장해 두면 다른 곳에서도 이어 쓸 수 있어요.</p>
      </div>
      <span class="knol-loading-rule" aria-hidden="true"></span>
    </div>
  </div>'''


def brand_loading_html(html):
    """Keep IDs consumed by renpy-pre.js and fail on unreviewed SDK markup drift."""
    if html.count(PRESPLASH) != 1 or html.count('</head>') != 1:
        raise ValueError("Ren'Py boot template changed; review loading shell integration.")
    return html.replace(PRESPLASH, BRANDED_PRESPLASH).replace('<progress id="statusProgress"', '<progress aria-label="이야기 자료 다운로드" id="statusProgress"').replace(
        '</head>', '<link rel="stylesheet" href="knol-loading.css">\n<script src="knol-loading.js" defer></script>\n</head>')
