#!/usr/bin/env node
/**
 * Kiro PreToolUse guard for shell commands (KnolStory Next).
 * block: exit 2 with the reason on stderr. ask: exit 0 with a permission JSON on stdout. allow: exit 0, no output.
 * Shell writes (redirects, cp/mv/tee/sed -i) reuse the protected path list in guard-common.mjs.
 * Unreadable hook input fails open so a payload format change never disables the shell entirely.
 */
import {execFileSync} from 'node:child_process';
import {homedir} from 'node:os';
import {basename, resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {classifyPath, emitAsk, expandHome, isTemporary, readHookInput, recordShape, toolInputOf, workspacePath, workspaceRoot} from './guard-common.mjs';

/** Split a command line into simple-command token lists, honouring quotes and escapes. */
export function segments(command) {
  const result = [];
  let tokens = [];
  let token = '';
  let quote = null;
  let started = false;
  const flushToken = () => {
    if (started) tokens.push(token);
    token = '';
    started = false;
  };
  const flushSegment = () => {
    flushToken();
    if (tokens.length) result.push(tokens);
    tokens = [];
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === '\\' && quote === '"' && i + 1 < command.length) token += command[++i];
      else token += c;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      started = true;
      continue;
    }
    if (c === '\\' && i + 1 < command.length) {
      token += command[++i];
      started = true;
      continue;
    }
    if (c === ' ' || c === '\t') {
      flushToken();
      continue;
    }
    if ('\n;&|()`'.includes(c)) {
      flushSegment();
      continue;
    }
    token += c;
    started = true;
  }
  flushSegment();
  return result;
}

const WRAPPERS = new Set(['sudo', 'command', 'time', 'nohup', 'exec', 'env', 'xargs', 'nice', 'caffeinate']);
const RUNNERS = new Set(['npx', 'pnpx', 'bunx']);
const packageName = token => basename(token.replace(/^(@?[^@]+)@.*$/, '$1'));

/** Resolve the effective program name and its arguments for one simple command. */
export function program(tokens) {
  let i = 0;
  while (i < tokens.length) {
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) {
      i++;
      continue;
    }
    if (WRAPPERS.has(basename(tokens[i]))) {
      i++;
      while (i < tokens.length && tokens[i].startsWith('-')) i++;
      continue;
    }
    break;
  }
  let name = tokens[i] ? basename(tokens[i]) : '';
  let args = tokens.slice(i + 1);
  const runner = RUNNERS.has(name) || (['pnpm', 'npm', 'yarn'].includes(name) && ['exec', 'dlx', 'x'].includes(args[0]));
  if (runner) {
    let j = RUNNERS.has(name) ? 0 : 1;
    while (j < args.length && args[j].startsWith('-')) j += ['-p', '--package'].includes(args[j]) ? 2 : 1;
    if (args[j] === '--') j++;
    name = args[j] ? packageName(args[j]) : '';
    args = args.slice(j + 1);
  }
  return {name, args};
}

const CRITICAL_TOP = new Set(['.git', '.github', '.agents', '.kiro', 'apps', 'packages', 'docs', 'renpy', 'server', 'scripts', 'tests', 'spikes', 'assets']);
const ASK_PATHS = [/^docs\/architecture\/evidence(\/|$)/, /^docs\/archive(\/|$)/, /^\.cache(\/|$)/, /^test-results/];

/** True when git knows files at this path: tracked or new under recursion, uncommitted changes otherwise. */
function hasRepositoryWork(rel, recursive) {
  try {
    const args = recursive ? ['ls-files', '--cached', '--others', '--exclude-standard', '--', rel] : ['status', '--porcelain', '--', rel];
    return execFileSync('git', args, {cwd: workspaceRoot, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore']}).trim() !== '';
  } catch {
    return false;
  }
}

function rmDecision(args, cwd) {
  const flags = args.filter(a => a.startsWith('-') && a !== '--');
  const recursive = flags.some(f => f === '--recursive' || (/^-[^-]/.test(f) && /[rR]/.test(f)));
  for (const target of args.filter(a => !a.startsWith('-'))) {
    const absolute = resolve(cwd, expandHome(target));
    if (absolute === '/' || absolute === homedir() || absolute === workspaceRoot || workspaceRoot.startsWith(absolute + sep)) {
      return [recursive ? 'block' : 'ask', `루트·홈·작업 공간 삭제(rm ${target})`];
    }
    const rel = workspacePath(absolute);
    if (rel === null) {
      if (isTemporary(absolute)) continue;
      return ['ask', `작업 공간 밖 삭제(rm ${target})`];
    }
    if (ASK_PATHS.some(pattern => pattern.test(rel))) return ['ask', `근거·이력·로컬 결과 삭제(rm ${target})`];
    if (recursive && !rel.includes('/') && (CRITICAL_TOP.has(rel) || /[*?[]/.test(rel))) return ['block', `중요 경로 재귀 삭제(rm ${target})`];
    const protectedPath = classifyPath(absolute);
    if (protectedPath) return ['ask', `${protectedPath[1]} (rm ${target})`];
    if (hasRepositoryWork(rel, recursive)) return ['ask', recursive ? `저장소 파일이 있는 폴더 재귀 삭제(rm ${target})` : `미커밋 변경이 있는 파일 삭제(rm ${target})`];
  }
  return null;
}

const GIT_GLOBAL_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path']);
const WHOLE_TREE = new Set(['.', './', ':/', '*']);
const STASH_READS = new Set(['list', 'show', 'pop', 'apply', 'branch', 'create', 'store']);

function gitDecision(args) {
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) i += GIT_GLOBAL_WITH_VALUE.has(args[i]) ? 2 : 1;
  const sub = args[i];
  const rest = args.slice(i + 1);
  const has = (...names) => rest.some(a => names.includes(a));
  const shortHas = letter => rest.some(a => /^-[a-zA-Z]+$/.test(a) && a.includes(letter));
  const dd = rest.indexOf('--');
  const pathspecs = dd >= 0 ? rest.slice(dd + 1) : rest.filter(a => !a.startsWith('-'));
  switch (sub) {
    case 'push':
      if (has('--force', '--force-if-includes') || shortHas('f') || rest.some(a => a.startsWith('--force-with-lease') || /^\+/.test(a))) return ['block', 'git 강제 push'];
      return ['ask', '원격 저장소 반영(git push)'];
    case 'reset':
      return has('--hard') ? ['block', 'git reset --hard'] : null;
    case 'clean':
      return has('--force') || shortHas('f') ? ['block', 'git clean -f'] : null;
    case 'branch':
      return shortHas('D') || (has('--delete', '-d') && has('--force', '-f')) ? ['block', 'git branch 강제 삭제'] : null;
    case 'checkout':
      if (has('-f', '--force')) return ['block', '변경을 버리는 git checkout -f'];
      if (pathspecs.some(p => WHOLE_TREE.has(p))) return ['block', '작업 트리 전체 변경 버리기(git checkout .)'];
      return dd >= 0 ? ['ask', '파일 변경 되돌리기(git checkout --)'] : null;
    case 'switch':
      return has('-f', '--force', '--discard-changes') ? ['block', '변경을 버리는 git switch'] : null;
    case 'restore':
      if (has('--staged', '-S') && !has('--worktree', '-W')) return null;
      if (pathspecs.some(p => WHOLE_TREE.has(p))) return ['block', '작업 트리 전체 변경 버리기(git restore .)'];
      return ['ask', '파일 변경 되돌리기(git restore)'];
    case 'stash':
      if (['drop', 'clear'].includes(rest[0])) return ['block', 'git stash 삭제'];
      return STASH_READS.has(rest[0]) ? null : ['ask', '공유 작업 트리의 미커밋 변경 숨기기(git stash): 다른 에이전트의 진행 중 작업이 섞여 있을 수 있다'];
    case 'commit':
      return has('--amend') ? ['ask', '기존 커밋 수정(git commit --amend)'] : null;
    case 'rm':
      if (shortHas('r') || pathspecs.some(p => WHOLE_TREE.has(p))) return ['ask', '저장소 파일 재귀 삭제(git rm -r)'];
      return pathspecs.some(p => classifyPath(p)) ? ['ask', '보호 경로 파일 삭제(git rm)'] : null;
    default:
      return null;
  }
}

const DESTRUCTIVE_SQL = /\b(DROP\s+(DATABASE|SCHEMA|TABLE)|TRUNCATE)\b/i;
const PRODUCTION_ACTIONS = new Set(['up', 'down', 'restart', 'stop', 'start', 'rm', 'pull', 'build', 'run', 'exec', 'kill', 'create', 'pause', 'unpause', 'update', 'cp', 'rename']);
/** Names that identify the running service, the legacy live server or the shared tunnel on this machine. */
const PRODUCTION_NAMES = /production|stg-live|cloudflared/i;

function dockerDecision(name, args) {
  const compose = name === 'docker-compose' || args.includes('compose');
  if (compose && args.includes('down') && (args.includes('-v') || args.includes('--volumes'))) return ['block', 'Docker 볼륨(DB 데이터) 삭제'];
  if (args[0] === 'volume' && ['rm', 'prune'].includes(args[1])) return ['block', 'Docker 볼륨(DB 데이터) 삭제'];
  if (args[0] === 'system' && args[1] === 'prune' && args.includes('--volumes')) return ['block', 'Docker 볼륨(DB 데이터) 삭제'];
  if (args.includes('psql') && DESTRUCTIVE_SQL.test(args.join(' '))) return ['block', 'DB 객체 삭제'];
  if (args.some(a => PRODUCTION_NAMES.test(a)) && args.some(a => PRODUCTION_ACTIONS.has(a))) return ['ask', '운영 Docker 변경'];
  return null;
}

const PRODUCTION_HOSTS = /(^|\.)(knolquiz\.com|pages\.dev|api\.cloudflare\.com)$/i;
const targetsProduction = args => args.some(a => {
  try {
    return /^https?:\/\//i.test(a) && PRODUCTION_HOSTS.test(new URL(a).hostname);
  } catch {
    return false;
  }
});

function requestDecision(name, args) {
  if (!targetsProduction(args)) return null;
  if (name === 'wget') return args.some(a => /^--(post-data|post-file|body-data|body-file)/.test(a) || /^--method=(POST|PUT|PATCH|DELETE)$/i.test(a)) ? ['ask', '운영·배포 서버에 쓰기 요청'] : null;
  const index = args.findIndex(a => a === '-X' || a === '--request');
  const method = index >= 0 ? args[index + 1] : args.find(a => /^-X[A-Za-z]+$/.test(a))?.slice(2) ?? args.find(a => a.startsWith('--request='))?.split('=')[1];
  const body = args.some(a => /^(-d|-F|-T|--json|--form|--upload-file|--data(-\w+)?)$/.test(a) || /^--data(-\w+)?=/.test(a) || /^-d./.test(a));
  return (method && MUTATING_METHOD.test(method)) || body ? ['ask', '운영·배포 서버에 쓰기 요청'] : null;
}

function cloudflaredDecision(args) {
  if (args.includes('delete') || args.includes('cleanup')) return ['block', 'Cloudflare Tunnel 삭제'];
  return args.some(a => ['create', 'route', 'login', 'service'].includes(a)) ? ['ask', 'Cloudflare Tunnel 설정 변경'] : null;
}

function wranglerDecision(args) {
  if (args.includes('delete')) return ['block', 'Cloudflare 자원 삭제'];
  if (args.some(a => ['deploy', 'publish', 'upload', 'put', 'create', 'rollback'].includes(a))) return ['ask', 'Cloudflare 배포·업로드·설정 변경'];
  return null;
}

const MUTATING_METHOD = /^(POST|PUT|PATCH|DELETE)$/i;

function ghDecision(args) {
  const [area, action] = args;
  if ((area === 'repo' || area === 'release') && action === 'delete') return ['block', 'GitHub 저장소·릴리스 삭제'];
  if (area === 'pr' && ['create', 'merge', 'close', 'reopen', 'edit', 'comment', 'review', 'ready'].includes(action)) return ['ask', 'GitHub PR 변경'];
  if (area === 'issue' && ['create', 'close', 'reopen', 'edit', 'comment', 'delete', 'transfer', 'lock'].includes(action)) return ['ask', 'GitHub 이슈 변경'];
  if ((area === 'release' && ['create', 'edit', 'upload'].includes(action)) || (area === 'workflow' && ['run', 'enable', 'disable'].includes(action)) || (area === 'run' && ['rerun', 'cancel', 'delete'].includes(action))) return ['ask', 'GitHub 릴리스·워크플로 변경'];
  if (area === 'repo' && ['create', 'edit', 'rename', 'archive', 'fork', 'sync'].includes(action)) return ['ask', 'GitHub 저장소 변경'];
  if ((area === 'secret' || area === 'variable' || area === 'label') && ['set', 'delete', 'remove', 'create', 'edit'].includes(action)) return ['ask', 'GitHub 설정 변경'];
  if (area === 'api') {
    const index = args.findIndex(a => a === '-X' || a === '--method');
    const method = index >= 0 ? args[index + 1] : args.find(a => /^-X[A-Za-z]+$/.test(a))?.slice(2) ?? args.find(a => a.startsWith('--method='))?.split('=')[1];
    if ((method && MUTATING_METHOD.test(method)) || args.some(a => ['-f', '-F', '--field', '--raw-field', '--input'].includes(a))) return ['ask', 'GitHub API 쓰기'];
  }
  return null;
}

/** Program-specific decision for one simple command. Returns [decision, reason] or null. */
export function classifySegment(name, args, cwd = workspaceRoot) {
  switch (name) {
    case 'git':
      return gitDecision(args);
    case 'rm':
      return rmDecision(args, cwd);
    case 'docker':
    case 'docker-compose':
      return dockerDecision(name, args);
    case 'wrangler':
      return wranglerDecision(args);
    case 'cloudflared':
      return cloudflaredDecision(args);
    case 'curl':
    case 'wget':
      return requestDecision(name, args);
    case 'gh':
      return ghDecision(args);
    case 'npm':
    case 'pnpm':
    case 'yarn':
      return args[0] === 'publish' ? ['ask', '패키지 게시'] : null;
    case 'psql':
    case 'pgcli':
      return DESTRUCTIVE_SQL.test(args.join(' ')) ? ['block', 'DB 객체 삭제'] : null;
    case 'find':
      return args.includes('-delete') || args.some((a, index) => ['-exec', '-execdir', '-ok'].includes(a) && ['rm', 'unlink'].includes(basename(args[index + 1] ?? ''))) ? ['ask', '파일 일괄 삭제(find -delete/-exec rm)'] : null;
    default:
      return null;
  }
}

const operands = args => args.filter(a => !a.startsWith('-'));
const lastOperand = args => operands(args).slice(-1);
const WRITE_COMMANDS = {
  tee: operands,
  cp: lastOperand,
  install: lastOperand,
  ln: lastOperand,
  rsync: lastOperand,
  mv: operands,
  sed: args => (args.some(a => /^-i/.test(a) || a.startsWith('--in-place')) ? lastOperand(args) : []),
  perl: args => (args.some(a => /^-[a-zA-Z]*i/.test(a)) ? lastOperand(args) : []),
};

function redirectTargets(tokens) {
  const targets = [];
  tokens.forEach((token, index) => {
    const match = token.match(/^\d*>>?\|?(.*)$/);
    if (!match) return;
    const target = match[1] || tokens[index + 1];
    if (target && !target.startsWith('&')) targets.push(target);
  });
  return targets;
}

/** Shell writes into a protected path: ask, never block. */
export function shellWriteDecision(tokens, name, args, cwd = workspaceRoot) {
  for (const target of [...redirectTargets(tokens), ...(WRITE_COMMANDS[name]?.(args) ?? [])]) {
    const result = classifyPath(target, {cwd});
    if (result) return ['ask', `${result[1]} (셸 쓰기: ${target})`];
  }
  return null;
}

/** Command substitutions run even inside double quotes, so they are classified as commands of their own. */
function substitutions(command) {
  return [...command.matchAll(/\$\(([^()]*)\)/g), ...command.matchAll(/`([^`]*)`/g)].map(match => match[1]);
}

/** Most severe decision over every simple command in the line. Tracks `cd` between segments. */
export function decideShell(command, {cwd = workspaceRoot} = {}) {
  const text = String(command);
  const reasons = {block: [], ask: []};
  for (const part of [text, ...substitutions(text)]) {
    let current = cwd;
    for (const tokens of segments(part)) {
      const {name, args} = program(tokens);
      if (name === 'cd' || name === 'pushd') {
        if (args[0] !== '-') current = args[0] ? resolve(current, expandHome(args[0])) : homedir();
        continue;
      }
      for (const result of [classifySegment(name, args, current), shellWriteDecision(tokens, name, args, current)]) {
        if (result && !reasons[result[0]].includes(result[1])) reasons[result[0]].push(result[1]);
      }
    }
  }
  if (reasons.block.length) return {decision: 'block', reasons: reasons.block};
  if (reasons.ask.length) return {decision: 'ask', reasons: reasons.ask};
  return {decision: 'allow', reasons: []};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const input = readHookInput();
  const toolInput = toolInputOf(input);
  recordShape('guard-shell', input, toolInput);
  const command = toolInput.command ?? toolInput.cmd ?? input?.command;
  if (typeof command !== 'string' || !command.trim()) process.exit(0);
  const cwd = typeof toolInput.cwd === 'string' && toolInput.cwd.trim() ? resolve(workspaceRoot, toolInput.cwd) : workspaceRoot;
  const {decision, reasons} = decideShell(command, {cwd});
  if (decision === 'block') {
    process.stderr.write(`[guard-shell] 차단: ${reasons.join(', ')}. 되돌리기 어려운 명령이라 Kiro가 실행하지 않는다. 꼭 필요하면 이유와 정확한 명령을 사용자에게 보여 주고 직접 실행을 요청한다.\n`);
    process.exit(2);
  }
  if (decision === 'ask') emitAsk(`${reasons.join(', ')}: 사용자 확인 후 진행`);
  process.exit(0);
}
