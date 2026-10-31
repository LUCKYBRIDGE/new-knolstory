import { describe, expect, it } from 'vitest';
import { routeAction } from './story-edge-route.mjs';

type Route = { id: string; pattern: string; script?: string; request_limit_fail_open?: boolean };
function cloudflare(initial: Route[]) {
  const routes = [...initial], calls: Array<{ method: string; path: string; body?: unknown; auth: string | null }> = [];
  const fetcher = async (input: string, init: RequestInit = {}) => {
    const url = new URL(input), method = init.method ?? 'GET', path = url.pathname.replace('/client/v4', '') + url.search;
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, body, auth: new Headers(init.headers).get('authorization') });
    const ok = (result: unknown) => new Response(JSON.stringify({ success: true, errors: [], result }));
    if (path === '/zones?name=knolquiz.com') return ok([{ id: 'z'.repeat(32) }]);
    const routePath = `/zones/${'z'.repeat(32)}/workers/routes`;
    if (path === routePath && method === 'GET') return ok(routes);
    if (path === routePath && method === 'POST') { routes.push({ id: 'new', ...body }); return ok(routes.at(-1)); }
    const index = routes.findIndex(route => path === `${routePath}/${route.id}`);
    if (index >= 0 && method === 'PUT') { routes[index] = { id: routes[index].id, ...body }; return ok(routes[index]); }
    if (index >= 0 && method === 'DELETE') { routes.splice(index, 1); return ok({ id: 'gone' }); }
    return new Response(JSON.stringify({ success: false, errors: [{ code: 10000, message: 'Authentication error' }] }), { status: 403 });
  };
  return { fetcher, calls, routes };
}

describe('story edge route command', () => {
  it('creates the fail-open route, then reports and removes it', async () => {
    const api = cloudflare([{ id: 'other', pattern: 'quiz.knolquiz.com/*', script: 'quiz' }]);
    expect(await routeAction('status', 'token', api.fetcher)).toEqual({ pattern: 'story.knolquiz.com/*', script: null, failOpen: false, attached: false });
    expect(await routeAction('attach', 'token', api.fetcher)).toEqual({ pattern: 'story.knolquiz.com/*', script: 'knolstory-story-edge', failOpen: true, attached: true });
    expect(api.calls.find(call => call.method === 'POST')?.body).toEqual({ pattern: 'story.knolquiz.com/*', script: 'knolstory-story-edge', request_limit_fail_open: true });
    expect(api.calls.every(call => call.auth === 'Bearer token')).toBe(true);
    expect(await routeAction('detach', 'token', api.fetcher)).toMatchObject({ attached: false });
    expect(api.routes).toEqual([{ id: 'other', pattern: 'quiz.knolquiz.com/*', script: 'quiz' }]);
  });

  it('turns an existing fail-closed route into fail-open in place', async () => {
    const api = cloudflare([{ id: 'r1', pattern: 'story.knolquiz.com/*', script: 'knolstory-story-edge', request_limit_fail_open: false }]);
    expect(await routeAction('attach', 'token', api.fetcher)).toMatchObject({ failOpen: true, attached: true });
    expect(api.calls.some(call => call.method === 'PUT' && call.path.endsWith('/r1'))).toBe(true);
  });

  it('refuses another Worker, unknown actions and a missing token without changing routes', async () => {
    const api = cloudflare([{ id: 'r1', pattern: 'story.knolquiz.com/*', script: 'someone-else' }]);
    await expect(routeAction('attach', 'token', api.fetcher)).rejects.toThrow('another Worker');
    await expect(routeAction('detach', 'token', api.fetcher)).rejects.toThrow('another Worker');
    await expect(routeAction('purge', 'token', api.fetcher)).rejects.toThrow();
    await expect(routeAction('status', '', api.fetcher)).rejects.toThrow('CLOUDFLARE_API_TOKEN');
    expect(api.calls.filter(call => call.method !== 'GET')).toEqual([]);
    const denied = cloudflare([]);
    await expect(routeAction('status', 'token', async (input, init) => input.includes('/workers/routes') ? new Response(JSON.stringify({ success: false, errors: [{ code: 10000, message: 'Authentication error' }] }), { status: 403 }) : denied.fetcher(input, init)))
      .rejects.toThrow(/routes failed with 403: 10000 Authentication error/);
  });
});
