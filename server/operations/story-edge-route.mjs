/**
 * Shows, attaches or removes the zone route that puts story-edge-worker in front of
 * story.knolquiz.com. Needs CLOUDFLARE_API_TOKEN with Zone read and Workers Routes edit.
 * The token is sent only to api.cloudflare.com and never printed.
 *   node server/operations/story-edge-route.mjs status|attach|detach
 * `attach` sets request_limit_fail_open so a spent Workers quota falls back to the Mac mini
 * origin instead of an error page. `detach` is the rollback: traffic returns to the origin.
 */
import { pathToFileURL } from 'node:url';

const API = 'https://api.cloudflare.com/client/v4', ZONE = 'knolquiz.com', PATTERN = 'story.knolquiz.com/*', SCRIPT = 'knolstory-story-edge';

async function cloudflare(token, path, init, fetcher) {
  const response = await fetcher(API + path, { ...init, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' } });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true) {
    const reasons = (body?.errors ?? []).map(error => `${error.code} ${error.message}`).join('; ');
    throw Error(`Cloudflare API ${init?.method ?? 'GET'} ${path.replace(/[0-9a-f]{32}/g, '<id>')} failed with ${response.status}${reasons ? `: ${reasons}` : ''}`);
  }
  return body.result;
}
function summary(route) {
  return route ? { pattern: route.pattern, script: route.script ?? null, failOpen: route.request_limit_fail_open === true, attached: route.script === SCRIPT } : { pattern: PATTERN, script: null, failOpen: false, attached: false };
}
export async function routeAction(action, token, fetcher = fetch) {
  if (!['status', 'attach', 'detach'].includes(action)) throw Error('Use status, attach or detach.');
  if (typeof token !== 'string' || !token) throw Error('CLOUDFLARE_API_TOKEN is required.');
  const zones = await cloudflare(token, `/zones?name=${ZONE}`, undefined, fetcher);
  if (!Array.isArray(zones) || zones.length !== 1) throw Error('The knolquiz.com zone was not found for this token.');
  const zone = zones[0].id;
  const find = async () => (await cloudflare(token, `/zones/${zone}/workers/routes`, undefined, fetcher)).find(route => route.pattern === PATTERN);
  const current = await find();
  if (action === 'status') return summary(current);
  if (current?.script && current.script !== SCRIPT) throw Error(`The route belongs to another Worker (${current.script}); nothing was changed.`);
  if (action === 'attach') {
    const body = JSON.stringify({ pattern: PATTERN, script: SCRIPT, request_limit_fail_open: true });
    if (current) await cloudflare(token, `/zones/${zone}/workers/routes/${current.id}`, { method: 'PUT', body }, fetcher);
    else await cloudflare(token, `/zones/${zone}/workers/routes`, { method: 'POST', body }, fetcher);
  } else if (current) await cloudflare(token, `/zones/${zone}/workers/routes/${current.id}`, { method: 'DELETE' }, fetcher);
  return summary(await find());
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await routeAction(process.argv[2], process.env.CLOUDFLARE_API_TOKEN))); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Route command failed.'); process.exitCode = 1; }
}
