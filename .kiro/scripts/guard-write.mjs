#!/usr/bin/env node
/**
 * Kiro PreToolUse guard for file-writing tools (KnolStory Next).
 * Never blocks. Asks before changing Codex-owned instructions, existing evidence, generator output,
 * the guards themselves or files outside the workspace. The list lives in guard-common.mjs.
 * Unreadable hook input fails open.
 */
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {classifyPath, emitAsk, readHookInput, recordShape, toolInputOf} from './guard-common.mjs';

const PATH_KEYS = ['path', 'targetFile', 'sourcePath', 'destinationPath', 'filePath', 'file', 'target', 'targetPath'];

/** Every path-like value a write tool may touch. */
export function writeTargets(toolInput) {
  if (!toolInput || typeof toolInput !== 'object') return [];
  return PATH_KEYS.map(key => toolInput[key]).filter(value => typeof value === 'string' && value.trim());
}

/** First protected target of a write tool call. */
export function decideWrite(toolInput, options) {
  for (const target of writeTargets(toolInput)) {
    const result = classifyPath(target, options);
    if (result) return {decision: result[0], reason: result[1], target};
  }
  return {decision: 'allow', reason: '', target: null};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const input = readHookInput();
  const toolInput = toolInputOf(input);
  recordShape('guard-write', input, toolInput);
  const {decision, reason, target} = decideWrite(toolInput);
  if (decision === 'ask') emitAsk(`${target}: ${reason}`);
  process.exit(0);
}
