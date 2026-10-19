# Authentication boundary evidence origin

The initial missing-module RED run and initial 20-test GREEN/scoped coverage run were observed in agent tool output but were not redirected to repository log artifacts. No original filesystem logs exist for those runs; they must not be cited as saved artifacts.

The adapter review correction has preserved evidence from actual subsequent executions:

- `adapter-red.log`: 9 new regression cases failed against the existing implementation, before the correction.
- `adapter-green-coverage.log`: all 29 tests passed after correction, scoped V8 coverage 100% statements/branches/functions/lines.
- `adapter-typecheck.log`: direct strict TypeScript command completed with exit 0 (empty successful output).
- `adapter-lint.log`: ESLint completed with exit 0; repository React auto-detection warning remains.

Commands: `pnpm exec vitest run server/auth/identity-links.test.ts`, then the same with `--coverage --coverage.include='server/auth/identity-links.ts' --coverage.reporter=text --coverage.reportsDirectory=/tmp/knolstory-identity-coverage`; `pnpm exec tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck server/auth/identity-links.ts server/auth/identity-links.test.ts`; `pnpm exec eslint server/auth/identity-links.ts server/auth/identity-links.test.ts`.

The tests use an isolated in-memory serial transaction harness, not real OAuth, HTTP, sessions or PostgreSQL. Transaction-port promises of database rollback and serialization require separate implementation and integration verification.
