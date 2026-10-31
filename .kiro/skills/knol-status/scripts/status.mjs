#!/usr/bin/env node
/**
 * Read-only status snapshot for KnolStory Next.
 * Sections: local git, recent activity, plan/STATUS pointers, local servers, GitHub, Cloudflare Pages, live HTTP, harness check.
 * Flags: --brief   local git and recent activity only, compact (SessionStart hook)
 *        --offline skip GitHub, Cloudflare and HTTP
 *        --fetch   run `git fetch --prune` first (updates remote-tracking refs only)
 * Env:   KNOL_PAGES_PROJECT (default new-knolstory), KNOL_STATUS_URLS (comma separated)
 */
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const flags = new Set(process.argv.slice(2));
const brief = flags.has('--brief');
const offline = brief || flags.has('--offline');
const lines = [];
const out = (text = '') => lines.push(text);

function run(command, args, timeout = 15000) {
  try {
    return execFileSync(command, args, {cwd: root, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024}).trimEnd();
  } catch {
    return null;
  }
}
const git = (...args) => run('git', args, 10000);
const json = text => {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};
const pad = n => String(n).padStart(2, '0');
const stamp = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
const today = new Date().toDateString();
const when = date => (date.toDateString() === today ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`);
const mtime = path => {
  try {
    return statSync(resolve(root, path)).mtime;
  } catch {
    return null;
  }
};
const clip = (text, max) => {
  const plain = String(text).replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain;
};
const age = iso => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(minutes)) return '?';
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 48 * 60) return `${Math.round(minutes / 60)}시간 전`;
  return `${Math.round(minutes / 1440)}일 전`;
};

function counts(ref) {
  const result = git('rev-list', '--left-right', '--count', `${ref}...HEAD`);
  if (!result) return null;
  const [behind, ahead] = result.split(/\s+/).map(Number);
  return `앞 ${ahead} / 뒤 ${behind}`;
}

function gitSection() {
  if (flags.has('--fetch') && !brief) out(run('git', ['fetch', '--prune', '--quiet'], 60000) === null ? '- git fetch 실패: 아래 원격 정보는 이전 값이다.' : '- git fetch --prune 완료');
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD') ?? '?';
  const [sha, date, subject] = (git('log', '-1', '--format=%h%x09%ad%x09%s', '--date=format:%m-%d %H:%M') ?? '').split('\t');
  const upstream = git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
  const originMain = git('rev-parse', '--short', 'origin/main');
  const fetchHead = git('rev-parse', '--git-path', 'FETCH_HEAD');
  const fetched = fetchHead && mtime(fetchHead) ? stamp(mtime(fetchHead)) : '기록 없음';
  out(`${brief ? '' : '- '}브랜치 ${branch} @ ${sha ?? '?'} "${clip(subject ?? '', 60)}" (${date ?? '?'})`);
  const relation = [upstream ? `upstream ${upstream}: ${counts(upstream) ?? '?'}` : 'upstream 없음', originMain ? `origin/main(${originMain}): ${counts('origin/main') ?? '?'}` : 'origin/main 없음'];
  out(`  ${relation.join(' · ')} · 원격 정보 기준 ${fetched}`);
  const status = (git('status', '--porcelain=v1') ?? '').split('\n').filter(Boolean);
  if (!status.length) out('  미커밋 변경 없음');
  else {
    const untracked = status.filter(line => line.startsWith('??')).length;
    const limit = brief ? 10 : 25;
    out(`  미커밋 ${status.length}개 (추적 중 변경 ${status.length - untracked} · 새 파일 ${untracked}) · 괄호는 수정 시각`);
    for (const line of status.slice(0, limit)) {
      const path = line.slice(3).split(' -> ').pop().replace(/^"|"$/g, '');
      const changed = mtime(path);
      out(`    ${line}${changed ? ` (${when(changed)})` : ''}`);
    }
    if (status.length > limit) out(`    … 외 ${status.length - limit}개`);
    out('  → 이 세션이 만든 변경이 아니면 다른 에이전트(Codex)의 진행 중 작업일 수 있다. 겹치는 파일을 고치기 전에 knol-resume으로 멈춘 지점을 확인한다.');
  }
  if (!brief) {
    const stashes = (git('stash', 'list') ?? '').split('\n').filter(Boolean).length;
    const worktrees = (git('worktree', 'list') ?? '').split('\n').filter(Boolean).length;
    out(`  stash ${stashes}개 · worktree ${worktrees}개`);
    const branches = (git('for-each-ref', 'refs/heads', '--format=%(refname:short)\t%(upstream:short)\t%(upstream:track)') ?? '').split('\n').filter(Boolean);
    for (const row of branches) {
      const [name, up, track] = row.split('\t');
      out(`  로컬 ${name}${up ? ` → ${up} ${track || '[같음]'}` : ' (upstream 없음)'}`);
    }
  }
  return originMain;
}

/** Most recently touched entries under .cache/, where agents in this repo keep command output. */
function activitySection() {
  const dir = resolve(root, '.cache');
  const recent = existsSync(dir)
    ? readdirSync(dir)
        .map(name => ({name, changed: mtime(join('.cache', name))}))
        .filter(entry => entry.changed)
        .sort((a, b) => b.changed - a.changed)
        .slice(0, brief ? 5 : 8)
    : [];
  out(`${brief ? '' : '- '}최근 작업 흔적(.cache): ${recent.length ? recent.map(entry => `${entry.name} ${when(entry.changed)}`).join(', ') : '없음'}`);
  const pids = (run('pgrep', ['-x', 'codex'], 5000) ?? '').split('\n').filter(Boolean);
  if (!pids.length) out(`${brief ? '' : '- '}Codex CLI: 실행 중 아님`);
  else {
    const started = pids.map(pid => new Date((run('ps', ['-o', 'lstart=', '-p', pid], 5000) ?? '').trim())).filter(date => !Number.isNaN(date.getTime()));
    out(`${brief ? '' : '- '}Codex CLI: 실행 중 ${pids.length}개${started.length ? ` (시작 ${started.map(when).join(', ')})` : ''}. 이 저장소에서 작업 중인지는 위 수정 시각으로 판단한다`);
  }
}

function read(path) {
  const full = resolve(root, path);
  return existsSync(full) ? readFileSync(full, 'utf8') : null;
}

function recordsSection() {
  out('');
  out('## 정식 기록 발췌');
  const plan = read('docs/architecture/product-completion-plan.md');
  if (plan) {
    const checked = plan.match(/마지막 확인:\s*([^\n.]+)/)?.[1];
    out(`- 계획 재개 지점 (마지막 확인 ${checked ?? '?'})`);
    for (const name of ['현재 작업', '다음 행동']) {
      const cell = plan.split('\n').find(line => line.startsWith(`| ${name} |`))?.split('|')[2];
      if (cell) out(`  - ${name}: ${clip(cell, 260)}`);
    }
  } else out('- 계획 문서 없음: docs/architecture/product-completion-plan.md');
  const status = read('STATUS.md');
  if (status) {
    out('- STATUS 최신 항목');
    for (const line of status.split('\n').filter(text => /^20\d\d-\d\d-\d\d /.test(text)).slice(0, 3)) out(`  - ${clip(line, 160)}`);
  }
}

function serversSection() {
  out('');
  out('## 로컬 실행 상태');
  const listening = run('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN'], 8000);
  if (listening === null) out('- 포트 확인 못 함 (lsof 없음 또는 실패)');
  else {
    const byProcess = new Map();
    const rows = listening.split('\n').slice(1).map(line => line.trim().split(/\s+/)).filter(cols => /^(node|python|Python|ruby|docker|com\.docke|nginx|caddy|cloudflar)/.test(cols[0]));
    for (const cols of rows) {
      const key = `${cols[0]} pid ${cols[1]}`;
      const ports = byProcess.get(key) ?? new Set();
      ports.add(cols[cols.length - 2] ?? '');
      byProcess.set(key, ports);
    }
    for (const [key, ports] of byProcess) out(`- ${key}: ${[...ports].join(', ')}`);
    if (!rows.length) out('- 개발용 서버 포트 없음');
  }
  const docker = run('docker', ['ps', '--format', '{{.Names}}\t{{.Status}}'], 8000);
  if (docker === null) out('- Docker: 실행 중 아님 또는 없음');
  else {
    const containers = docker.split('\n').filter(Boolean).map(row => row.split('\t'));
    const related = containers.filter(([name]) => /knol|story/i.test(name));
    out(`- Docker: 이 프로젝트 관련 ${related.length}개${containers.length > related.length ? ` (그 밖 ${containers.length - related.length}개)` : ''}`);
    for (const [name, state] of related) out(`  ${name}: ${state}`);
  }
}

function githubSection(originMain) {
  out('');
  out('## GitHub');
  const remote = git('remote', 'get-url', 'origin') ?? '';
  const repo = remote.match(/github\.com[:/]([^/]+\/[^/]+?)(\.git)?$/)?.[1];
  if (!repo) return out('- origin이 GitHub 저장소가 아니다');
  if (run('gh', ['--version'], 5000) === null) return out('- 확인 못 함: gh CLI 없음');
  const view = json(run('gh', ['repo', 'view', repo, '--json', 'visibility,pushedAt,defaultBranchRef'], 30000));
  if (!view) return out('- 확인 못 함: gh 인증 또는 네트워크');
  out(`- ${repo} (${view.visibility}) 기본 ${view.defaultBranchRef?.name} · 마지막 push ${age(view.pushedAt)}`);
  const runs = json(run('gh', ['run', 'list', '--repo', repo, '--branch', 'main', '--limit', '5', '--json', 'headSha,status,conclusion,displayTitle,createdAt'], 30000)) ?? [];
  for (const item of runs) out(`  CI ${item.headSha.slice(0, 7)} ${item.status === 'completed' ? item.conclusion : item.status} · ${age(item.createdAt)} · ${clip(item.displayTitle, 50)}`);
  if (runs[0] && originMain && !runs[0].headSha.startsWith(originMain)) out(`  ! 최신 CI(${runs[0].headSha.slice(0, 7)})가 로컬의 origin/main(${originMain})과 다르다: fetch가 오래됐거나 CI가 아직 시작 전`);
  const prs = json(run('gh', ['pr', 'list', '--repo', repo, '--state', 'open', '--json', 'number,title,isDraft,updatedAt,headRefName'], 30000)) ?? [];
  out(`- 열린 PR ${prs.length}개`);
  for (const pr of prs) out(`  #${pr.number}${pr.isDraft ? ' (draft)' : ''} ${clip(pr.title, 50)} · ${pr.headRefName} · 갱신 ${age(pr.updatedAt)}`);
  const issues = json(run('gh', ['issue', 'list', '--repo', repo, '--state', 'open', '--limit', '200', '--json', 'number'], 30000));
  out(`- 열린 이슈 ${issues ? issues.length : '확인 못 함'}`);
  const heads = (git('ls-remote', '--heads', 'origin') ?? '').split('\n').filter(Boolean).map(line => line.split('\t')[1]?.replace('refs/heads/', ''));
  if (heads.length) out(`- 원격 브랜치: ${heads.join(', ')}`);
}

function cloudflareSection(originMain) {
  out('');
  out('## Cloudflare Pages');
  const project = process.env.KNOL_PAGES_PROJECT || 'new-knolstory';
  const direct = run('wrangler', ['--version'], 10000) !== null;
  const [command, prefix] = direct ? ['wrangler', []] : ['npx', ['--yes', 'wrangler@4']];
  const list = json(run(command, [...prefix, 'pages', 'deployment', 'list', '--project-name', project, '--json'], 120000));
  if (!Array.isArray(list)) return out(`- ${project}: 확인 못 함 (wrangler 로그인·네트워크 확인: npx wrangler@4 whoami)`);
  out(`- 프로젝트 ${project}: 배포 ${list.length}개 중 최근`);
  for (const item of list.slice(0, 3)) out(`  ${item.Environment} · ${item.Branch} · source ${item.Source} · ${item.Status} · ${item.Deployment}`);
  const production = list.find(item => item.Environment === 'Production');
  if (production && originMain) out(production.Source && originMain.startsWith(production.Source.slice(0, 7)) ? `  운영 배포 source가 origin/main(${originMain})과 같다` : `  ! 운영 배포 source(${production.Source})가 origin/main(${originMain})과 다르다`);
}

async function httpSection() {
  out('');
  out('## 실제 응답');
  const urls = (process.env.KNOL_STATUS_URLS || 'https://new-knolstory.pages.dev/,https://new-knolstory.pages.dev/runtime/,https://story.knolquiz.com/,https://story-next.knolquiz.com/').split(',').map(url => url.trim()).filter(Boolean);
  const results = await Promise.all(urls.map(async url => {
    const started = Date.now();
    try {
      const response = await fetch(url, {redirect: 'follow', signal: AbortSignal.timeout(20000), headers: {'user-agent': 'Mozilla/5.0 (knol-status) Chrome/131'}});
      const body = Buffer.from(await response.arrayBuffer());
      const title = body.toString('utf8').match(/<title>([^<]*)<\/title>/)?.[1];
      return {url, code: response.status, bytes: body.length, hash: createHash('sha256').update(body).digest('hex').slice(0, 12), ms: Date.now() - started, title};
    } catch (error) {
      return {url, error: error?.name ?? 'error'};
    }
  }));
  for (const item of results) out(item.error ? `- ${item.url} 실패 (${item.error})` : `- ${item.url} ${item.code} · ${item.bytes}B · ${item.ms}ms · html ${item.hash}${item.title ? ` · "${clip(item.title, 40)}"` : ''}`);
  const groups = new Map();
  for (const item of results.filter(entry => !entry.error)) groups.set(item.hash, [...(groups.get(item.hash) ?? []), item.url]);
  for (const [hash, group] of groups) if (group.length > 1) out(`  같은 응답(${hash}): ${group.join(', ')}`);
  out('  (Python·curl 같은 비브라우저 요청은 Cloudflare가 403으로 막을 수 있다. 막히면 파일 누락과 구분해 기록한다.)');
}

function harnessSection() {
  out('');
  out('## 하네스');
  const result = spawnSync('node', ['.kiro/scripts/check-kiro.mjs', '--summary'], {cwd: root, encoding: 'utf8', timeout: 60000});
  const summary = `${result.stdout ?? ''}`.trim().split('\n').pop();
  out(`- ${summary || '확인 못 함'}${result.status ? ' → 자세히: node .kiro/scripts/check-kiro.mjs' : ''}`);
}

out(brief ? `[Kiro 세션 시작 요약] ${stamp(new Date())}` : `# KnolStory 상태 점검 ${stamp(new Date())}`);
if (!brief) out('');
if (!brief) out('## 로컬 Git');
const originMain = gitSection();
if (brief) {
  activitySection();
  out('전체 점검 /knol-status · 흐름 안내 /knol-router');
} else {
  out('');
  out('## 최근 활동');
  activitySection();
  recordsSection();
  serversSection();
  if (offline) {
    out('');
    out('(네트워크 점검 생략: --offline)');
  } else {
    githubSection(originMain);
    cloudflareSection(originMain);
    await httpSection();
  }
  harnessSection();
}
process.stdout.write(`${lines.join('\n')}\n`);
