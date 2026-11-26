// Preloaded into `next dev` (see apps/web/package.json) so a dev server keeps serving after whoever read its output has gone.
// When Playwright is stopped it can leave `next dev` running with a closed stdout/stderr. The next log line then fails with EPIPE,
// Next logs that "uncaughtException" to the same closed stream, which fails again: an endless loop at 100% CPU with growing memory,
// and every page load times out. Dropping output that can no longer be delivered breaks the loop.
'use strict';
const lost = new Set(['EPIPE', 'ECONNRESET', 'EIO', 'ERR_STREAM_DESTROYED', 'ERR_STREAM_WRITE_AFTER_END']);
for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', error => {
    if (!lost.has(error && error.code)) throw error;
  });
}
