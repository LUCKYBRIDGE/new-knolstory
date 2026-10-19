import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// The password stays in memory and the child process environment, never argv/logs.
const passwordFile = process.env.PGPASSWORD_FILE;
if (!passwordFile) throw new Error('Storage test password file is required.');
const env = { ...process.env, PGPASSWORD: readFileSync(passwordFile, 'utf8').trim() };
for (const args of [['run', 'typecheck'], ['run', 'test:integration']]) {
  const result = spawnSync('pnpm', args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
