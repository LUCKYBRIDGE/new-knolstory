#!/usr/bin/env node
/**
 * Mechanical checks for the Kiro harness under .kiro/.
 * Codex-owned files are only read: their paths are verified as targets, never edited.
 * Usage: node .kiro/scripts/check-kiro.mjs [--summary]
 */
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {basename, dirname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const kiro = join(root, '.kiro');
const self = '.kiro/scripts/check-kiro.mjs';
const problems = [];
const report = (file, line, message) => problems.push({file, line, message});
const rel = path => relative(root, path).split(sep).join('/');
const read = path => readFileSync(resolve(root, path), 'utf8');
const lineOf = (source, index) => source.slice(0, index).split('\n').length;

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, {withFileTypes: true}).flatMap(entry => (entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]));
}
const directories = dir => (existsSync(dir) ? readdirSync(dir, {withFileTypes: true}).filter(entry => entry.isDirectory()).map(entry => entry.name) : []);

function scalar(text) {
  const value = text.trim();
  if (value.startsWith('[') || value.startsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  if (/^'.*'$/.test(value)) return value.slice(1, -1).replace(/''/g, "'");
  return value;
}

/** Minimal front matter reader: key: value, inline arrays, one level of nested maps or lists. */
export function frontmatter(source) {
  if (!source.startsWith('---\n')) return null;
  const end = source.indexOf('\n---', 3);
  if (end < 0) return {invalid: 'closing --- missing'};
  const data = {};
  let parent = null;
  for (const raw of source.slice(4, end).split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const item = raw.match(/^\s+-\s+(.*)$/);
    if (item && parent) {
      data[parent] = Array.isArray(data[parent]) ? [...data[parent], scalar(item[1])] : [scalar(item[1])];
      continue;
    }
    const nested = raw.match(/^\s+([\w-]+):\s*(.*)$/);
    if (nested && parent) {
      data[parent] = {...(data[parent] && !Array.isArray(data[parent]) ? data[parent] : {}), [nested[1]]: scalar(nested[2])};
      continue;
    }
    const top = raw.match(/^([\w-]+):\s*(.*)$/);
    if (!top) return {invalid: raw};
    parent = top[2] === '' ? top[1] : null;
    data[top[1]] = top[2] === '' ? null : scalar(top[2]);
  }
  return {data};
}

function globToRegExp(glob) {
  let pattern = '';
  let braces = 0;
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      pattern += glob[i + 2] === '/' ? '(?:.*/)?' : '.*';
      i += glob[i + 2] === '/' ? 2 : 1;
    } else if (c === '*') pattern += '[^/]*';
    else if (c === '?') pattern += '[^/]';
    else if (c === '{') {
      braces++;
      pattern += '(?:';
    } else if (c === '}' && braces) {
      braces--;
      pattern += ')';
    } else if (c === ',' && braces) pattern += '|';
    else pattern += c.replace(/[.+^$|()[\]{}\\]/g, '\\$&');
  }
  return new RegExp(`^${pattern}$`);
}

let trackedFiles = null;
function tracked() {
  if (!trackedFiles) {
    try {
      trackedFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}).split('\n').filter(Boolean);
    } catch {
      trackedFiles = [];
    }
  }
  return trackedFiles;
}

const INCLUSION = new Set(['always', 'fileMatch', 'manual', 'auto']);

function checkSteering() {
  const files = walk(join(kiro, 'steering')).filter(file => file.endsWith('.md'));
  for (const file of files) {
    const path = rel(file);
    const source = readFileSync(file, 'utf8');
    const parsed = frontmatter(source);
    if (!parsed) {
      report(path, 1, 'front matter가 첫 줄에 없다. 없으면 always로 매 턴 로드된다');
      continue;
    }
    if (parsed.invalid) {
      report(path, 1, `front matter 해석 불가: ${parsed.invalid}`);
      continue;
    }
    const {data} = parsed;
    const inclusion = data.inclusion ?? 'always';
    if (!INCLUSION.has(inclusion)) report(path, 1, `inclusion 값 오류: ${inclusion}`);
    if (inclusion === 'fileMatch') {
      const patterns = typeof data.fileMatchPattern === 'string' ? [data.fileMatchPattern] : data.fileMatchPattern;
      if (!Array.isArray(patterns) || !patterns.length || !patterns.every(pattern => typeof pattern === 'string' && pattern)) report(path, 1, 'fileMatch에는 fileMatchPattern(문자열 또는 배열)이 필요하다');
      else {
        for (const pattern of patterns) {
          if (pattern.startsWith('.kiro/')) continue;
          const regex = globToRegExp(pattern);
          if (!tracked().some(candidate => regex.test(candidate))) report(path, 1, `fileMatchPattern이 저장소의 어떤 파일과도 맞지 않는다: ${pattern}`);
        }
      }
    }
    if (inclusion === 'auto') {
      const stem = basename(file, '.md');
      if (data.name !== stem) report(path, 1, `auto의 name은 파일 이름(${stem})과 같아야 한다`);
      if (!data.description) report(path, 1, 'auto에는 description이 필요하다');
    }
    for (const match of source.matchAll(/#\[\[(file|folder):([^\]]+?)\]\]/g)) {
      const target = match[1] === 'file' ? match[2].trim().replace(/:\d+(-\d+)?$/, '') : match[2].trim();
      if (!existsSync(resolve(root, target))) report(path, lineOf(source, match.index), `참조 대상 없음: ${match[0]}`);
    }
  }
  return files.map(file => basename(file, '.md'));
}

function checkCodexCoverage() {
  for (const name of directories(join(root, '.agents/skills'))) {
    if (!existsSync(join(root, '.agents/skills', name, 'SKILL.md'))) continue;
    const wrapper = `.kiro/steering/${name}.md`;
    if (!existsSync(resolve(root, wrapper))) {
      report(wrapper, 0, `Codex 절차 .agents/skills/${name}을 포함하는 스티어링이 없다`);
      continue;
    }
    if (!read(wrapper).includes(`#[[file:.agents/skills/${name}/SKILL.md]]`)) report(wrapper, 0, `#[[file:.agents/skills/${name}/SKILL.md]] 포함이 없다`);
  }
}

const SKILL_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);

function checkSkills() {
  const names = directories(join(kiro, 'skills'));
  for (const name of names) {
    const path = `.kiro/skills/${name}/SKILL.md`;
    if (!existsSync(resolve(root, path))) {
      report(path, 0, 'SKILL.md 없음');
      continue;
    }
    const parsed = frontmatter(read(path));
    if (!parsed || parsed.invalid) {
      report(path, 1, `front matter 없음 또는 오류${parsed?.invalid ? `: ${parsed.invalid}` : ''}`);
      continue;
    }
    const {data} = parsed;
    if (data.name !== name) report(path, 1, `name(${data.name})은 폴더 이름(${name})과 같아야 한다`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) report(path, 1, '스킬 이름은 소문자·숫자·하이픈, 64자 이하');
    if (!data.description || String(data.description).length > 1024) report(path, 1, 'description이 필요하다(1024자 이하)');
    for (const key of Object.keys(data)) if (!SKILL_KEYS.has(key)) report(path, 1, `문서에 없는 front matter 키: ${key}`);
    if (data.metadata && typeof data.metadata !== 'object') report(path, 1, 'metadata는 문자열 값의 map이어야 한다');
  }
  return names;
}

function checkAgents() {
  for (const file of walk(join(kiro, 'agents')).filter(path => path.endsWith('.md'))) {
    const path = rel(file);
    const parsed = frontmatter(readFileSync(file, 'utf8'));
    if (!parsed || parsed.invalid) {
      report(path, 1, 'front matter 없음 또는 오류');
      continue;
    }
    if (!parsed.data.description) report(path, 1, 'description이 필요하다');
    if ('hooks' in parsed.data) report(path, 1, 'IDE는 hooks 필드가 있는 에이전트를 무시한다');
  }
}

const TRIGGERS = new Set(['PreToolUse', 'PostToolUse', 'SessionStart', 'Stop', 'UserPromptSubmit', 'PreTaskExec', 'PostTaskExec', 'PostFileCreate', 'PostFileSave', 'PostFileDelete']);

function checkHooks() {
  for (const file of walk(join(kiro, 'hooks')).filter(path => path.endsWith('.json'))) {
    const path = rel(file);
    let data;
    try {
      data = JSON.parse(readFileSync(file, 'utf8'));
    } catch (error) {
      report(path, 1, `JSON 오류: ${error.message}`);
      continue;
    }
    if (data.version !== 'v1') report(path, 1, 'version은 v1이어야 한다');
    if (!Array.isArray(data.hooks) || !data.hooks.length) report(path, 1, 'hooks 배열이 비었다');
    for (const hook of data.hooks ?? []) {
      if (!hook.name) report(path, 1, 'hook name 없음');
      if (!TRIGGERS.has(hook.trigger)) report(path, 1, `trigger 값 오류: ${hook.trigger}`);
      const type = hook.action?.type;
      if (type !== 'command' && type !== 'agent') report(path, 1, `action.type 오류: ${type}`);
      if (type === 'command') {
        for (const match of String(hook.action.command ?? '').matchAll(/(\.kiro\/[\w./-]+\.(?:mjs|js|sh|py))/g)) if (!existsSync(resolve(root, match[1]))) report(path, 1, `스크립트 없음: ${match[1]}`);
      }
      if (type === 'agent' && !hook.action.prompt) report(path, 1, 'agent action에 prompt가 없다');
      if (hook.matcher) {
        try {
          new RegExp(hook.matcher);
        } catch {
          report(path, 1, `matcher 정규식 오류: ${hook.matcher}`);
        }
      }
    }
  }
}

const REPO_PATH = /^(\.kiro|\.agents|\.github|docs|scripts|apps|packages|server|renpy|spikes|tests|assets)\//;
const MAY_NOT_EXIST = [/^\.kiro\/specs\//];

function checkPathPointers(files) {
  for (const path of files) {
    let fenced = false;
    read(path).split('\n').forEach((line, index) => {
      if (/^\s*(```|~~~)/.test(line)) {
        fenced = !fenced;
        return;
      }
      if (fenced) return;
      for (const match of line.matchAll(/`([^`]+)`/g)) {
        for (const token of match[1].split(/\s+/)) {
          const candidate = token.replace(/[),.;:]+$/, '');
          if (!REPO_PATH.test(candidate) || /[<>*{}$]/.test(candidate) || MAY_NOT_EXIST.some(pattern => pattern.test(candidate))) continue;
          const target = candidate.split('#')[0];
          if (!existsSync(resolve(root, target))) report(path, index + 1, `경로 없음: ${candidate}`);
        }
      }
    });
  }
}

const ABSOLUTE = new RegExp(`/(${['Us', 'ers'].join('')}|home|Volumes)/[A-Za-z0-9._-]`);
const EM_DASH = String.fromCharCode(0x2014);

function checkAbsolutePaths() {
  for (const file of walk(kiro).filter(path => /\.(md|json|mjs|js|sh|py)$/.test(path))) {
    const path = rel(file);
    if (path === self || path.startsWith('.kiro/specs/')) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
      if (ABSOLUTE.test(line)) report(path, index + 1, '로컬 절대 경로 금지(ADR 0012): 저장소 루트 기준 상대 경로로 쓴다');
      if (path.endsWith('.md') && line.includes(EM_DASH)) report(path, index + 1, 'em dash 금지: 쉼표·마침표·괄호로 다시 쓴다');
    });
  }
}

function checkLists(skills, steering) {
  const readme = existsSync(join(kiro, 'README.md')) ? read('.kiro/README.md') : '';
  const routerPath = '.kiro/skills/knol-router/SKILL.md';
  const router = existsSync(resolve(root, routerPath)) ? read(routerPath) : '';
  if (!readme) report('.kiro/README.md', 0, 'README 없음');
  for (const name of skills) {
    if (!readme.includes(name)) report('.kiro/README.md', 0, `스킬 목록에 ${name}이 없다`);
    if (name !== 'knol-router' && !router.includes(name)) report(routerPath, 0, `안내도에 ${name}이 없다`);
  }
  for (const name of steering) if (!readme.includes(name)) report('.kiro/README.md', 0, `스티어링 목록에 ${name}이 없다`);
}

async function checkWithProjectTools(files) {
  try {
    const {checkMarkdownLinks} = await import(pathToFileURL(join(root, 'scripts/check-project-docs.mjs')).href);
    for (const error of checkMarkdownLinks(root, files)) report(error.path, error.line, `${error.message}: ${error.target}`);
  } catch (error) {
    report('scripts/check-project-docs.mjs', 0, `링크 검사기를 불러오지 못했다: ${error.message}`);
  }
  try {
    const {languageIssues} = await import(pathToFileURL(join(root, 'scripts/check-product-language.mjs')).href);
    for (const path of files) for (const issue of languageIssues(read(path))) report(path, issue.line, `이전 제품 용어 '${issue.term}' → '${issue.preferred}'`);
  } catch (error) {
    report('scripts/check-product-language.mjs', 0, `용어 검사기를 불러오지 못했다: ${error.message}`);
  }
}

async function checkGuards() {
  const {decideShell} = await import('./guard-shell.mjs');
  const {decideWrite} = await import('./guard-write.mjs');
  const shell = [
    ['git status', 'allow'], ['git push origin main', 'ask'], ['git push --force origin main', 'block'], ['git push origin +main', 'block'],
    ['git reset --hard HEAD~1', 'block'], ['git commit -m "avoid git reset --hard"', 'allow'], ['git clean -fd', 'block'], ['git clean -n', 'allow'],
    ['git branch -D old', 'block'], ['git checkout .', 'block'], ['git checkout -- apps/web/x.ts', 'ask'], ['git checkout main', 'allow'],
    ['git restore --staged .', 'allow'], ['git restore .', 'block'], ['git restore apps/web/x.ts', 'ask'], ['git stash drop', 'block'],
    ['rm -rf apps/web/out', 'allow'], ['rm -rf docs', 'block'], ['rm -rf .cache', 'ask'], ['rm -rf /', 'block'], ['rm -rf /tmp/knol-x', 'allow'],
    ['npx --yes wrangler@4 pages deploy out --project-name new-knolstory', 'ask'], ['npx --yes wrangler@4 pages deployment list --project-name new-knolstory --json', 'allow'],
    ['wrangler pages project delete new-knolstory', 'block'], ['docker compose -f server/compose.production.yml down -v', 'block'],
    ['docker compose -f server/compose.production.yml up -d', 'ask'], ['docker compose -f server/compose.production.yml logs api', 'allow'],
    ['gh pr merge 2', 'ask'], ['gh pr list', 'allow'], ['cd apps && git push', 'ask'], ['echo "$(git reset --hard)"', 'block'],
    ['psql -c "DROP TABLE x;"', 'block'], ['grep -rn "DROP TABLE" server/migrations', 'allow'], ['pnpm build && pnpm test', 'allow'],
    ['git stash', 'ask'], ['git stash list', 'allow'], ['git commit --amend --no-edit', 'ask'], ['git rm -r docs', 'ask'],
    ['cd apps && rm -rf web', 'ask'], ['echo hi > AGENTS.md', 'ask'], ['ls 2>/dev/null', 'allow'], ['sed -i "" "s/a/b/" AGENTS.md', 'ask'],
    ['find docs -name "*.tmp" -delete', 'ask'], ['docker restart knolstory-next-production-api-1', 'ask'], ['docker logs knolstory-next-production-api-1', 'allow'],
    ['curl -X POST https://story.knolquiz.com/api/v1/x', 'ask'], ['curl -sI https://new-knolstory.pages.dev/', 'allow'], ['cloudflared tunnel delete x', 'block'],
  ];
  for (const [command, expected] of shell) {
    const actual = decideShell(command).decision;
    if (actual !== expected) report('.kiro/scripts/guard-shell.mjs', 0, `판정 사례 실패: ${command} → ${actual} (기대 ${expected})`);
  }
  const evidence = walk(join(root, 'docs/architecture/evidence')).find(path => path.endsWith('checkpoint.json'));
  const writes = [
    ['AGENTS.md', 'ask'], ['.agents/skills/runtime-qa/SKILL.md', 'ask'], ['apps/web/AGENTS.md', 'ask'], ['apps/web/CLAUDE.md', 'ask'],
    ['.kiro/skills/knol-tdd/SKILL.md', 'allow'], ['.kiro/hooks/guard-shell.json', 'ask'], ['.kiro/scripts/guard-shell.mjs', 'ask'],
    ['STATUS.md', 'allow'], ['packages/compatibility/src/authoring-field-schema.json', 'ask'],
    ['docs/architecture/evidence/new-topic-2099-01-01/checkpoint.json', 'allow'], ...(evidence ? [[rel(evidence), 'ask']] : []),
  ];
  for (const [path, expected] of writes) {
    const actual = decideWrite({path}).decision;
    if (actual !== expected) report('.kiro/scripts/guard-write.mjs', 0, `판정 사례 실패: ${path} → ${actual} (기대 ${expected})`);
  }
  return shell.length + writes.length;
}

const steering = checkSteering();
checkCodexCoverage();
const skills = checkSkills();
checkAgents();
checkHooks();
const markdown = walk(kiro).filter(path => path.endsWith('.md')).map(rel).filter(path => !path.startsWith('.kiro/specs/'));
checkPathPointers(markdown);
checkAbsolutePaths();
checkLists(skills, steering);
await checkWithProjectTools(markdown);
const guardCases = await checkGuards();

if (!process.argv.includes('--summary')) for (const problem of problems) process.stderr.write(`${problem.file}${problem.line ? `:${problem.line}` : ''} ${problem.message}\n`);
process.stdout.write(`Kiro 하네스: 스티어링 ${steering.length} · 스킬 ${skills.length} · 문서 ${markdown.length} · hook 판정 사례 ${guardCases} · 문제 ${problems.length}\n`);
process.exitCode = problems.length ? 1 : 0;
