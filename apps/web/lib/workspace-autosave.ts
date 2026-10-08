type AutosaveHost = Pick<Window, 'setTimeout' | 'clearTimeout' | 'addEventListener' | 'removeEventListener'>;

export function scheduleWorkspaceAutosave(host: AutosaveHost, save: () => void): () => void {
  const timer = host.setTimeout(save, 100);
  // Reload can happen as soon as a new screen is visible, before the debounce.
  // pagehide also supports normal navigation without blocking the back/forward cache.
  const flush = () => {host.clearTimeout(timer); save();};
  host.addEventListener('pagehide', flush);
  return () => {
    host.clearTimeout(timer);
    host.removeEventListener('pagehide', flush);
  };
}
