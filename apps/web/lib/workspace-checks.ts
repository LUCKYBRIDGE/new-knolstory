/**
 * Remembers which stored works already passed the startup scene check in this exact build, so a later
 * visit skips only that check for unchanged works. Every work is still parsed on every start, and a
 * changed work, a new build, a missing or malformed record all fall back to the full check.
 * Optional device data: reading or writing it never blocks opening the library.
 */
export const WORKSPACE_CHECKS_KEY = 'knolstory-workspace-checks-v1';
const MAX_FINGERPRINTS = 200;
const FINGERPRINT = /^[0-9a-f]{16}$/;
/** One identity per production build (next.config.ts). Development and tests never reuse a check. */
export const workspaceCheckBuild = process.env.NODE_ENV === 'production' ? process.env.KNOLSTORY_BUILD_ID : undefined;

function hash32(text: string, seed: number) {
  let value = seed >>> 0;
  for (let index = 0; index < text.length; index++) value = Math.imul(value ^ text.charCodeAt(index), 0x01000193);
  value ^= value >>> 16; value = Math.imul(value, 0x85ebca6b); value ^= value >>> 13; value = Math.imul(value, 0xc2b2ae35); value ^= value >>> 16;
  return (value >>> 0).toString(16).padStart(8, '0');
}
/** The parse result depends only on these document fields, so equal fingerprints mean an equal checked project. */
export function workFingerprint(document: unknown): string | undefined {
  if (!document || typeof document !== 'object' || Array.isArray(document)) return undefined;
  const { documentType, schemaVersion, project } = document as Record<string, unknown>;
  const text = JSON.stringify([documentType ?? null, schemaVersion ?? null, project ?? null]);
  return hash32(text, 0x811c9dc5) + hash32(text, 0x9747b28c);
}
export function readWorkspaceChecks(storage: Pick<Storage, 'getItem'>, build: string | undefined): ReadonlySet<string> {
  if (!build) return new Set();
  try {
    const value: unknown = JSON.parse(storage.getItem(WORKSPACE_CHECKS_KEY) ?? 'null');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return new Set();
    const record = value as Record<string, unknown>;
    if (record.version !== 1 || record.build !== build || !Array.isArray(record.fingerprints) || record.fingerprints.length > MAX_FINGERPRINTS
      || !record.fingerprints.every(item => typeof item === 'string' && FINGERPRINT.test(item))) return new Set();
    return new Set(record.fingerprints as string[]);
  } catch {
    return new Set();
  }
}
/** Replaces the record with the works that passed now, which also forgets removed works. */
export function writeWorkspaceChecks(storage: Pick<Storage, 'setItem'>, build: string | undefined, fingerprints: Iterable<string>) {
  if (!build) return;
  const list = [...new Set(fingerprints)].filter(item => FINGERPRINT.test(item)).slice(0, MAX_FINGERPRINTS);
  try { storage.setItem(WORKSPACE_CHECKS_KEY, JSON.stringify({ version: 1, build, fingerprints: list })); }
  catch { /* Optional: the next start runs the full check instead. */ }
}
