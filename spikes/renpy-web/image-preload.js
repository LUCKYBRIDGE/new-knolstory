/* Resolved native image files only. No story, progression, audio or scene interpretation. */
(() => {
  const MAX_BYTES = 24 * 1024 * 1024, MAX_FILE_BYTES = 8 * 1024 * 1024;
  const version = window.knolImagePreloadAssetVersion || new URL(document.currentScript?.src || location.href).searchParams.get('v') || 'development';
  const cacheName = `knolstory-runtime-images-v1-${version}`;
  const memory = new Map(), active = new Map(), installed = new Map();
  let memoryBytes = 0, plan = null, retained = [], generation = 0;
  const urlFor = path => new URL(`game/${path}`, location.href).href;
  const fs = () => window.Module?.FS || (typeof FS !== 'undefined' ? FS : null);
  async function diskCache() {
    try { return typeof caches !== 'undefined' ? await caches.open(cacheName) : null; }
    catch { return null; }
  }
  function remember(path, bytes) {
    if (memory.has(path)) memoryBytes -= memory.get(path).byteLength;
    memory.delete(path); memory.set(path, bytes); memoryBytes += bytes.byteLength;
    for (const [key, value] of memory) {
      if (memoryBytes <= MAX_BYTES) break;
      memory.delete(key); memoryBytes -= value.byteLength;
    }
  }
  async function bytesFor(path, signal) {
    if (memory.has(path)) return memory.get(path);
    const cache = await diskCache(), url = urlFor(path);
    let response;
    try { response = await cache?.match(url); } catch { /* HTTP cache remains usable. */ }
    if (!response) response = await window.fetch(url, {signal, cache: 'force-cache', priority: 'low'});
    if (!response.ok) throw Error('Image download failed');
    const stated = Number(response.headers.get('content-length'));
    if (stated > MAX_FILE_BYTES) throw Error('Image file exceeds preparation budget');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.byteLength || bytes.byteLength > MAX_FILE_BYTES) throw Error('Invalid image preparation size');
    if (signal.aborted) throw Error('Image preparation cancelled');
    // Do not treat cache quota failure as a failed download; retain HTTP/memory fallback.
    try { await cache?.put(url, new Response(bytes, {headers: {'content-type': response.headers.get('content-type') || 'image/webp'}})); } catch { /* Optional compressed-byte cache. */ }
    remember(path, bytes); return bytes;
  }
  function install(path, bytes) {
    const target = `/game/${path}`, filesystem = fs();
    if (!filesystem) throw Error('Native file system is not ready');
    filesystem.mkdirTree(target.slice(0, target.lastIndexOf('/')));
    filesystem.writeFile(target, bytes); installed.set(path, bytes.byteLength);
  }
  function trimNative(required) {
    retained = [required, ...retained].slice(0, 2);
    const keep = new Set(retained.flat());
    let nativeBytes = [...installed.values()].reduce((total, size) => total + size, 0);
    for (const [path, size] of installed) if (!keep.has(path) || nativeBytes > MAX_BYTES && !required.includes(path)) {
      try { fs()?.unlink(`/game/${path}`); } catch { /* SDK may already have released it. */ }
      installed.delete(path); nativeBytes -= size;
    }
  }
  function reportFailure(current) {
    if (plan !== current || current.reported) return;
    current.reported = true;
    current.report({protocol: 1, type: 'imagesPrepared', requestId: current.requestId, ok: false,
      prepared: current.required.filter(path => current.done.has(path)).length, total: current.required.length});
  }
  async function completeRequired(current) {
    if (plan !== current || current.reported || current.installing || !current.required.every(path => current.done.has(path))) return;
    current.installing = true;
    try {
      const held = await Promise.all(current.required.map(async path => [path, await bytesFor(path, new AbortController().signal)]));
      if (plan !== current) return;
      if (held.reduce((total, pair) => total + pair[1].byteLength, 0) > MAX_BYTES) throw Error('Required image files exceed preparation budget');
      for (const [path, bytes] of held) install(path, bytes);
      trimNative(current.required); current.reported = true;
      current.decode({protocol: 1, type: 'decodePreparedImages', requestId: current.requestId, paths: [...current.required]});
    } catch { reportFailure(current); }
  }
  function pump() {
    const current = plan;
    if (!current) return;
    void completeRequired(current);
    while (active.size < 2) {
      const path = current.paths.find(value => !current.done.has(value) && !current.failed.has(value) && !active.has(value));
      if (!path) return;
      const controller = new AbortController(); active.set(path, controller);
      void bytesFor(path, controller.signal).then(() => {
        if (plan?.paths.includes(path)) plan.done.add(path);
      }).catch(() => {
        if (plan === current && !controller.signal.aborted) {
          current.failed.add(path); if (current.required.includes(path)) reportFailure(current);
        }
      }).finally(() => { if (active.get(path) === controller) active.delete(path); pump(); });
    }
  }
  function prepare(request, decode, report) {
    if (!window.KnolRuntimeContract.isRuntimeImagePreparationRequest(request)) return false;
    const required = [...request.required], paths = [...new Set([...required, ...request.paths])];
    plan = {requestId: request.requestId, generation: ++generation, required, paths, done: new Set(), failed: new Set(), decode, report, reported: false, installing: false};
    for (const path of paths) if (memory.has(path)) plan.done.add(path);
    const urgent = required.some(path => !plan.done.has(path));
    for (const [path, controller] of active) if (!paths.includes(path) || urgent && !required.includes(path)) controller.abort();
    pump(); return true;
  }
  window.knolImagePreload = Object.freeze({prepare, isCurrent: requestId => plan?.requestId === requestId,
    status: () => ({requestId: plan?.requestId, generation, required: plan?.required || [],
      prepared: plan ? [...plan.done] : [], installed: [...installed.keys()], nativeBytes: [...installed.values()].reduce((total, size) => total + size, 0), memoryBytes, maxMemoryBytes: MAX_BYTES,
      active: [...active.keys()], cacheName})});
})();
