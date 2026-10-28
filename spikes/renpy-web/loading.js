/* Optional product tips do not control engine readiness or actual download progress. */
(async () => {
  const splash = document.getElementById('presplash');
  if (!splash) return;
  try {
    const response = await fetch(new URL('../loading-stories.json', document.baseURI));
    if (!response.ok) return;
    const rows = await response.json();
    if (!Array.isArray(rows)) return;
    const tips = rows.filter(row => row && typeof row.id === 'string' &&
      typeof row.label === 'string' && typeof row.text === 'string' &&
      typeof row.characterSrc === 'string' && row.characterSrc.startsWith('/assets/'));
    if (!tips.length || !splash.isConnected) return;
    const tip = tips[Math.floor(Math.random() * tips.length)];
    let current = tip;
    const show = row => {
      document.getElementById('knol-loading-tip-label').textContent = row.label;
      document.getElementById('knol-loading-tip-text').textContent = row.text;
    };
    show(current);
    const rotation = window.setInterval(() => {
      if (!splash.isConnected) { window.clearInterval(rotation); return; }
      const candidates = tips.filter(row => row.workId === current.workId && row.id !== current.id);
      if (!candidates.length) return;
      current = candidates[Math.floor(Math.random() * candidates.length)];
      show(current);
    }, 4000);
    const removal = new MutationObserver(() => {
      if (!splash.isConnected) { window.clearInterval(rotation); removal.disconnect(); }
    });
    removal.observe(document.body, {childList:true});
    window.addEventListener('pagehide', () => { window.clearInterval(rotation); removal.disconnect(); }, {once:true});
    const character = document.getElementById('knol-loading-character');
    character.addEventListener('load', () => { character.hidden = false; });
    character.addEventListener('error', () => { character.hidden = true; });
    if (typeof tip.characterStillSrc === 'string' && tip.characterStillSrc.startsWith('/assets/')) {
      document.getElementById('knol-loading-still').srcset = tip.characterStillSrc;
    }
    character.src = tip.characterSrc;
  } catch {
    // Tips are optional: keep the built-in service guidance if unavailable.
  }
})();
