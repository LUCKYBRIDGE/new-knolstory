type AutosaveHost = Pick<Window, 'setTimeout' | 'clearTimeout' | 'addEventListener' | 'removeEventListener'>;
type VisibilityHost = Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;

export function scheduleWorkspaceAutosave(host: AutosaveHost, save: () => void, page?: VisibilityHost): () => void {
  const timer = host.setTimeout(save, 100);
  let saved = false;
  // Reload can happen as soon as a new screen is visible, before the debounce.
  // pagehide also supports normal navigation without blocking the back/forward cache.
  // Leaving the tab saves at once too: the next tab the reader uses takes the writer over.
  const flush = () => {if (saved) return; saved = true; host.clearTimeout(timer); save();};
  const hidden = () => {if (page?.visibilityState === 'hidden') flush();};
  host.addEventListener('pagehide', flush);
  page?.addEventListener('visibilitychange', hidden);
  return () => {
    host.clearTimeout(timer);
    host.removeEventListener('pagehide', flush);
    page?.removeEventListener('visibilitychange', hidden);
  };
}
