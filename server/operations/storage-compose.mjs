import { randomBytes } from 'node:crypto';
import { mkdirSync, openSync, closeSync, writeFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const secretDir = process.env.KNOLSTORY_STORAGE_SECRET_DIR ?? join(homedir(), '.local', 'share', 'knolstory-next-storage-test', 'secrets');
mkdirSync(secretDir, { recursive: true, mode: 0o700 });
const passwordFile = join(secretDir, 'storage-db-password');
try {
  const fd = openSync(passwordFile, 'wx', 0o600);
  try { writeFileSync(fd, `${randomBytes(32).toString('hex')}\n`); } finally { closeSync(fd); }
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
}
if ((statSync(passwordFile).mode & 0o077) !== 0) throw new Error('Storage test password permissions must be 0600.');
const args = process.argv.slice(2);
if (args.length === 0) args.push('config', '--quiet');
// Never forward destructive commands to any project; test data persists for reruns.
if (args.some(arg => ['down', 'rm', 'prune', '--volumes', '-v'].includes(arg))) {
  throw new Error('Destructive lifecycle commands are not supported by this test runner.');
}
const result = spawnSync('docker', ['compose', '--project-name', 'knolstory-next-storage-test', '--file', join(serverRoot, 'compose.storage-test.yml'), ...args], {
  stdio: 'inherit', env: { ...process.env, KNOLSTORY_STORAGE_SECRET_DIR: secretDir },
});
process.exit(result.status ?? 1);
