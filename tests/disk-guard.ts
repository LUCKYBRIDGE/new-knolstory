// Disk guard for long Playwright runs. See .agents/skills/dev-disk/SKILL.md.
// On 2026-11-25 Playwright output filled the internal disk, Docker Desktop stopped on ENOSPC and
// production returned 502 for 10 hours. Every Playwright config here uses this module so a run
// (1) writes its output under KNOL_TEST_OUTPUT_ROOT when set, and
// (2) refuses to start, or stops itself, when free space falls below KNOL_DISK_MIN_FREE_GB.
import { existsSync, statSync, statfsSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import type { FullConfig } from '@playwright/test';

const GB = 1024 ** 3;
const repoRoot = resolve(import.meta.dirname, '..');

/** Output folder for a config. `relative` is the old path, relative to the config file's folder. */
export function testOutputDir(configDir: string, relative: string): string {
  const root = process.env.KNOL_TEST_OUTPUT_ROOT;
  const local = resolve(configDir, relative);
  if (!root) return local;
  const inRepo = local.startsWith(repoRoot + '/') ? local.slice(repoRoot.length + 1) : basename(local);
  return resolve(root, basename(repoRoot), inRepo);
}

/** Absolute path of the global setup, for `globalSetup` in each config. */
export const diskGuardSetup = resolve(import.meta.dirname, 'disk-guard.ts');

function existingAncestor(path: string): string {
  let current = path;
  while (!existsSync(current) && dirname(current) !== current) current = dirname(current);
  return current;
}

function freeGb(path: string): number {
  const stat = statfsSync(existingAncestor(path));
  return (Number(stat.bavail) * Number(stat.bsize)) / GB;
}

export function lowDisks(paths: string[], minFreeGb: number): string[] {
  const seen = new Map<string, string>();
  for (const path of paths) {
    const device = String(statSync(existingAncestor(path)).dev);
    if (!seen.has(device)) seen.set(device, path);
  }
  return [...seen.values()]
    .map(path => ({ path, free: freeGb(path) }))
    .filter(disk => disk.free < minFreeGb)
    .map(disk => `${disk.path}: ${disk.free.toFixed(1)}GB free (minimum ${minFreeGb}GB)`);
}

function minimumFreeGb(): number {
  const configured = process.env.KNOL_DISK_MIN_FREE_GB;
  if (configured !== undefined) return Number(configured);
  return process.env.CI ? 0 : 25;
}

export default function diskGuard(config: FullConfig): (() => void) | undefined {
  const minFreeGb = minimumFreeGb();
  if (!(minFreeGb > 0)) return undefined;
  // The internal disk (home) always counts: Docker Desktop logs and the browsers' temp files live there.
  const paths = [homedir(), process.env.TMPDIR ?? '/tmp', ...config.projects.map(project => project.outputDir)];
  const before = lowDisks(paths, minFreeGb);
  if (before.length) {
    throw new Error(`[disk-guard] Not starting: free space is too low.\n${before.join('\n')}\n` +
      'Free space first (see .agents/skills/dev-disk/SKILL.md) or move output with KNOL_TEST_OUTPUT_ROOT.');
  }
  const intervalMs = Number(process.env.KNOL_DISK_CHECK_SECONDS ?? 30) * 1000;
  let stopping = false;
  const timer = setInterval(() => {
    if (stopping) return;
    const low = lowDisks(paths, minFreeGb);
    if (!low.length) return;
    stopping = true;
    console.error(`\n[disk-guard] Stopping the run: free space fell below the minimum.\n${low.join('\n')}`);
    // SIGINT lets Playwright stop tests, close browsers and shut the webServer down cleanly.
    process.kill(process.pid, 'SIGINT');
    setTimeout(() => process.kill(process.pid, 'SIGTERM'), 60_000).unref();
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
