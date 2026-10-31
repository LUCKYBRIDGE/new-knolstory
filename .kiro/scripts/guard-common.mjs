/**
 * Shared pieces of the Kiro PreToolUse guards (KnolStory Next):
 * the protected path list used by both guards, and hook stdin/stdout handling.
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TEMP_ROOTS = [tmpdir(), '/tmp', '/private/tmp', '/var/folders', '/private/var/folders'].map(dir => resolve(dir));

export function expandHome(target) {
  if (target === '~' || target.startsWith('~/')) return join(homedir(), target.slice(1));
  return target.replace(/^\$\{?HOME\}?(?=\/|$)/, homedir());
}

export function isTemporary(absolute) {
  return TEMP_ROOTS.some(dir => absolute === dir || absolute.startsWith(dir + sep));
}

/** Workspace-relative POSIX path, or null when the path is outside the workspace. */
export function workspacePath(absolute, base = workspaceRoot) {
  const rel = relative(base, absolute);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return null;
  return rel.split(sep).join('/');
}

/** ['ask', reason] when changing this path needs the user's confirmation, otherwise null. */
export function classifyPath(target, {base = workspaceRoot, cwd = base, exists = existsSync} = {}) {
  const absolute = resolve(cwd, expandHome(target));
  if (absolute.startsWith('/dev/')) return null;
  const rel = workspacePath(absolute, base);
  if (rel === null) return isTemporary(absolute) ? null : ['ask', '작업 공간 밖 파일 변경(전역 설정일 수 있음)'];
  if (rel === 'AGENTS.md' || rel.endsWith('/AGENTS.md') || rel === 'apps/web/CLAUDE.md' || rel === '.agents' || rel.startsWith('.agents/')) {
    return ['ask', 'Codex 양식(정식 원본) 변경: 사용자가 이 파일의 변경을 요청한 범위인지 확인한다. Kiro 전용 내용은 .kiro/에 둔다'];
  }
  if (/^docs\/(architecture\/evidence|archive)\//.test(rel) && exists(absolute)) {
    return ['ask', '기존 근거·이력 기록 변경: 과거 기록은 당시 근거로 보존하고 새 결과는 새 checkpoint로 남긴다'];
  }
  if (rel === 'packages/compatibility/src/authoring-field-schema.json') {
    return ['ask', '생성기 출력 직접 변경: node scripts/generate-authoring-schema.mjs로 다시 만든다'];
  }
  if (rel === '.kiro/hooks' || rel.startsWith('.kiro/hooks/') || /^\.kiro\/scripts\/guard-[\w-]+\.mjs$/.test(rel)) {
    return ['ask', 'Kiro 안전 hook 변경: 안전장치를 약하게 하는 변경이 아닌지 확인한다'];
  }
  if (rel === '.git' || rel.startsWith('.git/')) return ['ask', 'Git 내부 파일 직접 변경'];
  return null;
}

export function readHookInput() {
  try {
    return JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return null;
  }
}

/** tool_input as an object, whether the IDE sends an object or a JSON string. */
export function toolInputOf(input) {
  const raw = input?.tool_input ?? input?.toolInput ?? input?.input;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // A plain string is treated as the command line itself.
    }
    return {command: raw};
  }
  return raw && typeof raw === 'object' ? raw : {};
}

/** Records only the payload's key names (never values) so the live hook format can be checked. */
export function recordShape(hook, input, toolInput) {
  try {
    const shape = {hook, at: new Date().toISOString(), toolName: input?.tool_name ?? input?.toolName ?? null, inputKeys: Object.keys(input ?? {}), toolInputKeys: Object.keys(toolInput ?? {})};
    writeFileSync(join(tmpdir(), `knol-kiro-${hook}-last.json`), `${JSON.stringify(shape)}\n`);
  } catch {
    // Recording is diagnostic only.
  }
}

export function emitAsk(reason) {
  process.stdout.write(`${JSON.stringify({hookSpecificOutput: {permissionDecision: 'ask', permissionDecisionReason: reason}})}\n`);
}
