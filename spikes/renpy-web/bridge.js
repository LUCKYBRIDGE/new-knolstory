/* The runtime receives resolved RuntimeScene only; no StoryDocument or Flow. */
(() => {
  let queued = null;
  let queuedPageInput = null;
  let queuedThumbnails = [];
  let lastSeq = -1;
  let lastRevision = -1;
  let engineViewport = null;
  let logicalWidth=1280, logicalHeight=720;
  const origin = location.origin;
  let currentScene = null;
  let canvasAttributes = null;
  function audioEntry(waiting) {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    if (waiting) {
      if (!canvasAttributes) canvasAttributes = Object.fromEntries(['tabindex', 'role', 'aria-label'].map(name => [name, canvas.getAttribute(name)]));
      canvas.setAttribute('tabindex', '0');
      canvas.setAttribute('role', 'button');
      canvas.setAttribute('aria-label', '소리 켜고 시작 · Enter 또는 Space');
    } else if (canvasAttributes) {
      for (const [name, value] of Object.entries(canvasAttributes)) {
        if (value === null) canvas.removeAttribute(name); else canvas.setAttribute(name, value);
      }
      canvasAttributes = null;
    }
  }
  // The SDK focuses its window on canvas mouseenter. Resizing the editor can put
  // that canvas under the stationary pointer while a Web text field is active.
  // Passive hover must not steal host focus; intentional canvas clicks still work.
  addEventListener('mouseenter', (event) => {
    if (event.target?.id !== 'canvas') return;
    try {
      if (parent.document.activeElement !== window.frameElement) event.stopImmediatePropagation();
    } catch { /* The focus guard is optional for a foreign, non-authoring embed. */ }
  }, true);
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
    drain() { const commands = [...(queued ? [queued] : []), ...(queuedPageInput ? [queuedPageInput] : []), ...queuedThumbnails]; queued = null; queuedPageInput = null; queuedThumbnails = []; return JSON.stringify(commands); },
    emit(event) {
      if (event.type === 'sceneRendered' && currentScene && event.sceneId === currentScene.sceneId && event.revision === currentScene.revision) {
        const audio = currentScene.audio;
        audioEntry(currentScene.mode === 'play' && event.audioState?.unlocked === false &&
          (audio?.music?.action === 'play' || audio?.ambience?.action === 'play' || !!audio?.sounds?.length));
      }
      if (event.engineViewport) engineViewport = event.engineViewport;
      parent.postMessage({ ...event, rendererRect: rendererRect() }, origin);
    },
  });
  addEventListener('message', (event) => {
    if (event.origin !== origin || event.source !== parent) return;
    const c = event.data;
    if (!c || c.protocol !== 1) return;
    if(c.type==='renderSceneThumbnail'){
      if(currentScene?.mode==='edit'&&window.KnolRuntimeContract.isRuntimeThumbnailRequest(c)){
        queuedThumbnails=queuedThumbnails.filter(item=>item.requestId!==c.requestId);
        queuedThumbnails.push(structuredClone(c));queuedThumbnails=queuedThumbnails.slice(-2);
      }
      return;
    }
    if (c.type === 'nextDialoguePage') {
      if (currentScene?.mode === 'play' && !currentScene.ended && Number.isSafeInteger(c.revision) &&
          c.revision === currentScene.revision && c.sceneId === currentScene.sceneId) {
        queuedPageInput = { protocol: 1, type: 'nextDialoguePage', sceneId: c.sceneId, revision: c.revision };
      }
      return;
    }
    if (c.type !== 'loadScene' || !Number.isSafeInteger(c.seq) || !Number.isSafeInteger(c.revision)) return;
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
    if(!window.KnolRuntimeContract.isRuntimeServiceAudioResources(c.serviceAudioResources,window.KnolRuntimeContract.runtimeServiceAudioPaths(c.payload.audio))){window.knolBridge.emit({protocol:1,type:'error',message:'등록 음원 자료 형식이 올바르지 않습니다.'});return;}
    audioEntry(false);
    // A scene change invalidates in-flight neighbor work, without touching playback revisions.
    queuedThumbnails = [];
    queuedPageInput = null;
    currentScene=structuredClone(c.payload);
    logicalWidth=c.payload.width;logicalHeight=c.payload.height;
    lastSeq = c.seq; lastRevision = c.revision; queued = structuredClone(c);
  });
  // Engine polling emits viewportChanged only after its resize transform is current.
})();
