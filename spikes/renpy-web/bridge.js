/* The runtime receives resolved RuntimeScene only; no StoryDocument or Flow. */
(() => {
  let queued = null;
  let lastSeq = -1;
  let lastRevision = -1;
  let engineViewport = null;
  let logicalWidth=1280, logicalHeight=720;
  const origin = location.origin;
  function rendererRect() {
    const box = document.getElementById('canvas').getBoundingClientRect();
    if (engineViewport && engineViewport.physicalWidth > 0 && engineViewport.physicalHeight > 0) {
      const sx = box.width / engineViewport.physicalWidth;
      const sy = box.height / engineViewport.physicalHeight;
      return { x: box.x + engineViewport.x * sx, y: box.y + engineViewport.y * sy,
        width: engineViewport.width * sx, height: engineViewport.height * sy };
    }
    const scale = Math.min(box.width / logicalWidth, box.height / logicalHeight);
    return { x: box.x + (box.width - logicalWidth * scale) / 2, y: box.y + (box.height - logicalHeight * scale) / 2,
      width: logicalWidth * scale, height: logicalHeight * scale };
  }
  window.knolBridge = Object.freeze({
    drain() { const command = queued; queued = null; return JSON.stringify(command ? [command] : []); },
    emit(event) {
      if (event.engineViewport) engineViewport = event.engineViewport;
      parent.postMessage({ ...event, rendererRect: rendererRect() }, origin);
    },
  });
  addEventListener('message', (event) => {
    if (event.origin !== origin || event.source !== parent) return;
    const c = event.data;
    if (!c || c.protocol !== 1 || c.type !== 'loadScene' || !Number.isSafeInteger(c.seq) || !Number.isSafeInteger(c.revision)) return;
    if (!window.KnolRuntimeContract.isRuntimeScene(c.payload) || c.payload.width > 4096 || c.payload.height > 4096 || c.payload.revision !== c.revision) {
      window.knolBridge.emit({ protocol: 1, type: 'error', code: 'INVALID_SCENE', message: 'RuntimeScene 형식이 올바르지 않습니다.' }); return;
    }
    if (c.seq <= lastSeq || c.revision <= lastRevision) return;
    if(c.audioResources !== undefined && (!Array.isArray(c.audioResources) || c.audioResources.length>50 ||
      c.audioResources.reduce((n,r)=>n+(typeof r?.data==='string'?r.data.length:20000001),0)>20000000 ||
      !c.audioResources.every(r=>r && /^audio:custom:[a-f0-9]{64}:(wav|ogg|mp3)$/.test(r.id) &&
        typeof r.data==='string' && r.data.length>0 && r.data.length<=7000000 && /^[A-Za-z0-9+/]*={0,2}$/.test(r.data)))) {
      window.knolBridge.emit({protocol:1,type:'error',message:'오디오 자료 형식이 올바르지 않습니다.'});return;
    }
    logicalWidth=c.payload.width;logicalHeight=c.payload.height;
    lastSeq = c.seq; lastRevision = c.revision; queued = structuredClone(c);
  });
  // Engine polling emits viewportChanged only after its resize transform is current.
})();
