# server

## New production replacement candidate (2026-10-17)

The [replacement decision](../docs/decisions/0025-legacy-server-replacement.md)
retires the legacy service after a verified Next cutover. The dedicated
`knolstory-next-production` Compose project contains a fresh PostgreSQL database,
least-privilege API role, and immutable static Web/Ren'Py ingress. This is separate
from both legacy databases and the existing Next test database. No legacy data is
imported. The candidate is currently local-only; it is not a public release.

From the repository root, the fixed operator commands are:

```sh
node server/operations/production-compose.mjs config
node server/operations/production-compose.mjs build
node server/operations/production-compose.mjs db
node server/operations/production-compose.mjs migrate
node server/operations/production-compose.mjs start
node server/operations/production-compose.mjs status
```

Build consumes the existing `apps/web/out` export. Build Web first when its sources
change; image creation does not rebuild it. The API image also contains an explicit
`migrate.mjs` command. API startup never applies migrations. Production migration
only accepts database `knolstory_next_production` at Docker host `db`. It applies
the existing immutable migrations and grants the app role data access without
superuser, DDL, role creation or migration-journal mutation rights. Each rerun
refreshes those grants; it does not reset data.

The helper creates independent private files under
`~/.local/share/knolstory-next-production/secrets`, with directory0700/files0600.
The owner credential stays in the sibling `secrets-owner` directory mounted only
into DB and one-off migration. API never receives the owner secret. Optional
`kakao-client-id`/`kakao-client-secret` and equivalent `google-` file pairs live in
the app secret directory; absent pairs disable providers and partial pairs fail.
The legacy Kakao app pair has been copied into the new private directory without
changing the source. No secret values belong in chat, Git, logs or evidence.
Provider file paths alone are passed through Compose. The helper accepts only
fixed lifecycle actions and provides no remove/prune or arbitrary command mode.

Only ingress is published: host loopback `15501` to container8080. API/DB have no
published host ports. Database and API service networks are internal; ingress has
a separate edge network so Docker Desktop can publish the loopback port. Public
origin defaults to `https://story.knolquiz.com`; an explicit HTTPS
`story-*.knolquiz.com` staging origin is supported. Every request must have that
exact Host. Local HTTP with a public Host is a transport probe, not HTTPS or real
OAuth evidence. Secure session cookies need the actual HTTPS origin.

`production-ingress.mjs` serves immutable static files with MIME/HEAD/byte ranges,
and streams `/api/*` to the fixed internal API service. Hidden paths, traversal,
symlinks, wrong Host and development websocket upgrades fail closed. It preserves
API cookies, Origin and observation headers without trusting forwarded headers.
The local development gateway at15401 remains separate.

`start --wait` confirms liveness only. Before any Cloudflare traffic change,
explicitly require API `/health/ready`=200 and verify the actual provider callback,
login/logout and owned document save/read at the chosen HTTPS origin. Readiness
checks configuration/journal/database; it does not perform provider authentication.

[Local production candidate evidence](../docs/architecture/evidence/production-candidate-2026-10-17/checkpoint.json)
records fresh accounts/identities0, migrations6, application privileges, owner
secret isolation, actual authorization redirect and static/API/WASM-range checks.
It does not prove live consent/callback, public TLS, whole native playback or
document mutation. Legacy services and Cloudflare resources remain unchanged.

KnolStory service backend preparation. The future service owns auth, roles,
classes, assignments, submissions, publication, permissions and online
StoryDocument storage. It does not render story scenes.

`storage/save-existing.ts` implements a provider/framework/DB-neutral boundary
for **existing-record save requests**. It reuses the shared archive/snapshot
validator, captures detached values, checks the full request fingerprint, then
requires explicit authorization and service catalog policy hooks before entering
any transaction. The full request hash includes scope, server record ID,
expected revision, idempotency key, and the complete validated snapshot (including
`savedAt` and `appVersion`, unlike `contentSha256`). JSON object key order does
not affect identity; array order does.

A transaction first looks up the receipt by `(scopeId, recordId, idempotencyKey)`.
The same request replays its receipt before checking the now-stale expected
revision. Different requests using the same key conflict. Without a receipt, the
record must exist and match the expected revision before the snapshot and receipt
are written together. Conflicts do not write. The port contract requires record
and receipt serialization, receipt uniqueness, atomic commit and rollback of both
writes. Its test harness demonstrates those requirements in memory; it is
**not a production adapter or evidence of actual DB transaction behavior**.

Hooks receive detached request values. They must explicitly return `true` and run
again on retries. A scope string is an identifier, not proof of identity or
ownership. The future host must bind real authenticated context and implement
catalog policy. Mutable permission changes require rechecking authorization in
the same transaction as the save; pretransaction hooks alone cannot guarantee
that. Production adapters must fulfill the documented locking/rollback contract.

This is implemented server preparation, **not an online storage service**.
This initial pure boundary provides no HTTP route or provider/session implementation.
The later section records the actual DB adapter added afterward. Login identity
policy is accepted in ADR 0023; visibility, retention, create/delete and no-op-save
policies remain open. This function accepts only an explicit existing-record save command; it
does not decide when the host should issue that command or suppress a no-op.

Focused checks from the repository root:

```sh
pnpm exec vitest run server/storage/save-existing.test.ts --maxWorkers=1
pnpm exec tsc -p server/tsconfig.json
```

Tests cover revision contention, concurrent retries, stale-revision receipt replay,
key scope isolation, full-request identity, shared snapshot integrity failures,
policy rejection, rollback of either write, and detached content/receipt values.
Future integration tests must exercise the chosen adapter against its actual DB.

## Actual isolated PostgreSQL storage adapter

The current Mac mini Docker host is the accepted target (ADR 0023). The dedicated
`knolstory-next-storage-test` Compose project runs PostgreSQL 16 on an internal
network with its own volume; no database host port is published. It does not reuse
legacy containers, volumes, credentials or tunnels. Dependencies are installed
with the isolated `server/pnpm-lock.yaml` inside the test image, not into the Web
workspace's dependency tree.

`storage/postgres-save-port.ts` implements the transaction port and guarded reads.
An advisory transaction lock serializes the record namespace before the receipt
lookup, so concurrent identical retries see the committed receipt. Record updates
also compare the locked revision. Snapshot projection, immutable audio blobs and
receipt are committed together. Authorization must be supplied after target
locking and before reads, including retries. A real host must lock mutable ACL
rows consistently with revocation; test hooks are not real authentication.
Failed rollback destroys the pooled connection rather than returning it for reuse.

`storage/snapshot-projection.ts` strips only embedded audio data into separate
blobs. Work-specific metadata and ordering remain in JSONB. Reads rehydrate bytes
and use the shared snapshot validator before returning content. This preserves
prior private material internally; it does not authorize new private uploads.

Migrations verify the dedicated database name, serialize execution, check the
journal and apply forward changes transactionally. Applied `001` is immutable;
`002` adds the immutable-blob trigger. Do not reset the journal, alter applied SQL,
or drop volumes to bypass a checksum error. These schema changes are intentionally
not automatically reversible because dropping tables would destroy saved work.

```sh
node server/operations/storage-compose.mjs config --quiet
node server/operations/storage-compose.mjs build runner
node server/operations/storage-compose.mjs up -d --wait db
node server/operations/storage-compose.mjs run --rm runner
```

The helper creates a new private password file outside the checkout and does not
print it. Test rows and the new volume persist; the disposable runner is removed.
The actual PostgreSQL integration suite is separate from the root unit suite.
A dedicated loopback API now runs separately as described below. Production
catalog enforcement, document API/Web synchronization, class/submission/share
workflows and backup restoration remain pending. Docker success is not product
or public deployment completion.

## Accepted identity policy

Kakao login creates or resolves an account. A logged-in account can explicitly
connect a verified Google identity; afterward Google resolves the same internal
account ID. Unlinked Google identities cannot register new accounts. Email is
never an automatic linking key. `auth/identity-links.ts` prepares that command
boundary with a transaction port. The real OIDC verifier, session/flow store, identity adapter and HTTP router are
connected. Tests use real PostgreSQL, HTTP and RSA signatures while replacing only
outbound provider transport; live provider login remains unverified.


## Local authentication API

`auth/oidc-provider.ts` verifies provider issuer/audience/RS256 signature, nonce,
expiry and authorization-code PKCE. Browser-bound one-use flows precede atomic
identity/link/session completion. Session rotation and ancestor logout serialize
on the oldest session root; expiry is checked again after lock waits. Only session
hashes are stored; Google connection requires the initiating active account.

The API image contains the bundle, SQL and production dependencies. It runs with
read-only root and a host loopback port, using the dedicated Next DB internal
network and its own outbound network. It never applies migrations automatically.

```sh
node server/operations/api-compose.mjs build api
node server/operations/api-compose.mjs up -d api
```

Secrets stay outside the checkout. The helper reuses only the dedicated Next DB
password and creates a new CSRF secret. Configure provider pairs with explicit
`KAKAO_CLIENT_ID_FILE`/`KAKAO_CLIENT_SECRET_FILE` and corresponding `GOOGLE_` file
variables, referring to files mounted beneath `/run/knolstory-next-secrets`.
Missing pairs disable providers; partial pairs reject startup. Provider application
configuration and external callback registration have not been performed.

`http://127.0.0.1:15400/health/live` confirms the process only. `/health/ready`
checks the database/migration journal and requires Kakao configuration. The
current disabled-provider candidate returns 503 there and on login start, while
`/api/v1/auth/config` exposes only availability booleans. It is not auth-ready.
Idle database errors log a fixed sanitized message without terminating the API.

Parsed HTTP requests receive a server-generated `X-Request-Id` and one JSON stdout
record on completion or premature connection close. Records contain only event,
generated request ID, allowlisted method, route family, status, outcome and duration.
Incoming IDs, raw URLs/queries, document/account IDs, IP addresses, cookies,
authorization, bodies and exception text are not recorded. A failed synchronous
log sink cannot change the response. This is request correlation, not a persistent
account audit trail; external forwarding and retention are not configured here.
Requests rejected by Node before dispatch are outside this observation boundary.

API termination shares one idempotent shutdown across SIGTERM/SIGINT and listener
failure. It stops accepting requests, drains HTTP connections including newly idle
keep-alive connections, then closes the PostgreSQL pool. One ten-second deadline
covers both phases; timeout force-closes HTTP connections and exits with failure.
Repeated signals do not call pool cleanup twice or turn a failure into success.
[Shutdown evidence](../docs/architecture/evidence/api-shutdown-2026-10-17/checkpoint.json)
separates controlled stuck-request/pool tests from ready local Docker termination.

The local gateway preserves API response request IDs, error bodies, status,
cache policy and retry headers. It does not invent an API request ID when an
upstream connection fails; that path returns the fixed502/504 gateway error.
Late websocket upgrades for an already closed client are destroyed immediately.
[Focused proxy and actual Docker correlation evidence](../docs/architecture/evidence/gateway-observation-2026-10-17/checkpoint.json)
distinguishes controlled429 responses from actual local200/401/503 requests.

Actual integration evidence and limitations are owned by the
[storage/account contract](../docs/architecture/authoring-storage-contract.md#실제-oidc세션http-및-로컬-api-2026-10-16).

### Same-origin local Web and API gateway

The local gateway binds `127.0.0.1:15401`, streams `/api/*` to the API on
`127.0.0.1:15400`, and streams other requests to the Web development server on
`127.0.0.1:3000`. Start the Web server separately, then run:

```sh
KNOLSTORY_AUTH_ORIGIN=http://127.0.0.1:15401 node server/operations/api-compose.mjs up -d api
node server/operations/web-api-proxy.mjs
```

Open `http://127.0.0.1:15401` for Web login, session cookies and CSRF requests to
share one origin. Provider callbacks must use that same origin when explicitly
configured. The gateway preserves Origin, cookie, redirect and CSRF headers,
rejects requests whose Host differs from its configured local origin, preserves that
Host upstream, removes hop-by-hop and forwarded
headers, and streams bodies with backpressure. Inactive upstreams return a
sanitized 504; unavailable upstreams return 502. Providers remain disabled until
real credential pairs are configured. This gateway does not configure public
routing or provider applications. Only the exact `/_next/hmr` WebSocket
upgrade is forwarded to the fixed Web upstream, with matching Host and Origin;
API and other upgrade paths are rejected.

`KNOLSTORY_GATEWAY_PORT`, `KNOLSTORY_API_PORT`, and `KNOLSTORY_WEB_PORT` can change
the three distinct loopback ports. Keep the API origin and browser URL aligned
with a changed gateway port. Verify the gateway independently with:

```sh
node --test server/operations/web-api-proxy.test.mjs
```


For a production-export local candidate, build Web once, serve the existing export
on a dedicated loopback port, then point the same gateway at that port. The API
origin remains the browser-facing gateway origin:

```sh
pnpm build
python3 scripts/serve-test-build.py --port 3126
# In another terminal, after the API origin is configured as above:
KNOLSTORY_WEB_PORT=3126 node server/operations/web-api-proxy.mjs
```

The verified candidate uses browser origin `15401`, static Web `3126` and API
`15400`. Provider availability remains false. Actual production-browser evidence
is linked from the storage/account contract; no public domain was changed.


## Owner-only document HTTP service

`documents/service.ts` and `http/document-routes.ts` implement authenticated
create/list/read/update with shared archive/catalog validation and atomic storage.
Migration006 adds owner metadata and create receipts without assigning unowned
records. Owner comes only from the session. Writes require exact Origin, CSRF
and Idempotency-Key. Snapshot/revision reads are atomic, retries replay receipts,
and conflicting edits return409. Another owner's record returns404.

Session SHARE locks follow the family-root order shared with login/logout;
expiry is checked immediately before commit. New private uploads are rejected;
existing owned private snapshots remain readable. Web synchronization, deletion,
retention, classroom and sharing remain separate work. See the
[storage contract](../docs/architecture/authoring-storage-contract.md#소유자-전용-작품-api-2026-10-16).


## Actual Web document browser verification

After building Web and starting the local static/gateway/API candidate, run:

```sh
node server/operations/verify-online-browser.mjs
```

This verifier uses only the named isolated Next test database. It creates a
synthetic account/session without live provider credentials, checks actual Web
create/copy/bound-update through the API, and revokes the test session and makes
the test account inactive at the end. Test documents remain in that dedicated DB;
it does not delete authored data or inspect legacy credentials. Evidence uses a
unique run suffix; KNOLSTORY_EVIDENCE_RUN can name a distinct run explicitly.
This proves the document service boundary, not live Kakao/Google login.


For ShortStory with two isolated browser storage contexts, run the current local
production candidate and execute:

```sh
node server/operations/verify-shortstory-browser.mjs
```

It verifies actual create/copy/update, a stale-context409 with local and remote
manuscripts preserved, and response loss after an actual server commit followed
by identical-key/body replay after reload. The response-loss route injects a
network failure after fetching the real API response; it does not fake the DB
commit. Separate browser contexts on one Mac are not physical-device evidence.
The dedicated synthetic session/account cleanup follows the same local verifier
boundary above. Run-suffixed evidence is kept under the ShortStory evidence folder.


## Isolated logical database backup and restore verification

```sh
node --test --experimental-test-coverage --test-coverage-include='server/operations/backup-restore.mjs' --test-coverage-lines=80 --test-coverage-branches=80 --test-coverage-functions=80 server/operations/backup-restore.test.mjs server/operations/backup-restore.integration.test.mjs
```

This explicit operator command connects only to the dedicated Next test container
and source database. It exports a repeatable-read snapshot, inventories that same
snapshot, creates a custom pg_dump archive, and restores into a fresh generated
knolstory_next_restore_UUID database. It never restores over the source, runs
DROP/--clean, or removes an existing database. Restore databases remain for review.

Private archives and detailed inventory are outside the checkout under the user's
.local/share/knolstory-next-storage-test/backups directory. Run directories use
0700 and files0600. Public evidence contains table counts/hashes and schema object
counts, not document content, session material, credentials or archive paths.
No automatic backup schedule, retention period, off-host copy or encryption key
policy is selected by this command.

A successful archive comparison is followed by read-only application validation
against the returned restore database name:

```sh
node server/operations/storage-compose.mjs build runner
# Substitute only the generated knolstory_next_restore_UUID name from the report.
node server/operations/storage-compose.mjs run --rm -e PGDATABASE=knolstory_next_restore_UUID runner sh -c 'export PGPASSWORD="$(cat "$PGPASSWORD_FILE")"; pnpm exec vitest run --config vitest.restore.config.ts'
```

The probe refuses other restore database names, checks immutable migration hashes,
and compares each restored snapshot/read outcome with the unchanged source using
shared validators. The exact blob-trigger code/message is checked inside a
rolled-back transaction. Existing malformed fixtures are matched and preserved;
a backup is not a repair operation. The focused config replaces test inclusion
instead of merging arrays, so ordinary fixture-seeding suites do not run here.

This verifies logical application data within the current isolated PostgreSQL16
host. Cluster roles/grants, service secrets, registered media/runtime files,
off-host durability and production traffic activation remain separate release
work. Before activating a historical restore, the operating procedure must address
sessions and pending flows captured before later revocations; this verifier keeps
an exact inactive copy and never activates restored credentials or traffic.

Evidence and limits are owned by the
[storage contract](../docs/architecture/authoring-storage-contract.md#next-전용-db-논리-백업복원-2026-10-16).


Snapshot exporter shutdown is bounded: ROLLBACK/close, SIGTERM, SIGKILL and a final
reap deadline. Pipe errors retain guards through eventual cleanup, and the remote
idle transaction has a five-minute timeout. The explicit Node test command covers
these failure cases with fake children as well as one actual dump/restore.


## Invalidate historical authentication in an offline restore copy

`operations/restore-session-fence.mjs` is an explicit restore maintenance action,
not an API route or startup migration. Use it only on a newly generated restore
copy while the candidate API process and traffic remain stopped. It checks the
exact database name and refuses other database clients, but that check does not
prevent later connections and is not a traffic isolation mechanism.

```sh
# Replace the placeholder only with the fresh copy name from verification.
node server/operations/storage-compose.mjs run --rm -e PGDATABASE=knolstory_next_restore_UUID -e KNOLSTORY_RESTORE_FENCE_CONFIRM=invalidate-restored-sessions runner node operations/restore-session-fence-cli.mjs
```

The operation atomically marks all historical sessions revoked and removes pending
login/link flows. Account IDs, provider links, works, assets, receipts and migration
history remain intact. Session ancestry rows are retained. Errors roll back both
changes; rollback failure evicts the connection. Re-running offline is idempotent.
It does not change provider credentials, route traffic or activate the candidate.

Core tests run with `node --test server/operations/restore-session-fence.test.mjs`.
The dedicated `vitest.restore-fence.config.ts` integration tests must run only on
a disposable offline copy: they create synthetic credentials, inject and remove
a test trigger, and invalidate that copy's authentication. Do not point them at an
exact archival inspection copy or the original application DB.

[Restore authentication evidence and constraints](../docs/architecture/authoring-storage-contract.md#복원본의-과거-인증-무효화-2026-10-16).


### Private static release rehearsal

From the repository root, `python3 server/operations/static_release.py` copies the
existing `apps/web/out` into a fresh private backup and restores it into another
fresh directory. It prints only run IDs, file/byte counts and manifest SHA256.
Files remain outside checkout under `~/.local/share/knolstory-next-releases`,
with directories0700/files0600. It never overwrites a release or activates traffic.
Keep the returned digest separately as the trust reference; a local hash is not
a release signature or an off-host backup. No automatic retention is configured.

To restore that backup again, use `--restore-run BACKUP_RUN --manifest-sha SHA256`.
To inspect an existing restored copy without copying it again:

```sh
python3 server/operations/serve_static_restore.py --restore-run RESTORE_RUN --manifest-sha SHA256 --port 3142
```

The server binds loopback only, verifies the entire manifest at startup, and serves
only listed files after checking their bytes against the manifest for each request.
It rejects changed files and links and does not provide a directory listing.
It has no API proxy; account requests can return404 during this offline rehearsal.
In another terminal, run only the restored-release browser gate:

```sh
KNOLSTORY_RESTORE_MANIFEST_SHA=SHA256 pnpm exec playwright test --config=server/operations/static-release.playwright.config.ts
```

The gate checks restored library files, actual Ren’Py WASM/scene acknowledgment
and cut advance, then ShortStory image bytes and page advance. It does not prove
live OAuth, physical-device behavior or a complete operating restore.
[Scope and evidence](../docs/architecture/authoring-storage-contract.md#정적-web자료runtime의-비활성-복원-2026-10-16).


### Active production origin (2026-10-17)

The final `https://story.knolquiz.com` now routes through the existing Tunnel to
Next ingress. The former Pages custom domain was detached; its project and staging
domain remain. The matching Kakao callback was already registered. Normal restart:

```sh
node server/operations/production-compose.mjs start
```

The helper defaults to the final origin and derives the optional
`https://story-next.knolquiz.com` redirect alias. Alias GET/HEAD requests receive308
with safe path/query preserved; alias writes are rejected. Public origin is the
single cookie/CSRF/callback boundary. Empty optional alias environment values mean
absent, permitting an explicitly selected staging rollback origin.

[Final-domain cutover evidence](../docs/architecture/evidence/production-cutover-2026-10-17/checkpoint.json)
records actual Kakao login/logout/relogin, the same online document read and
manuscript match, native scene rendering, visible canvas next-cut and return to
editing. The production DB retains the validation account and document. Original
legacy Docker resources, staging Pages/Worker and SSH access are still preserved;
permanent deletion requires the exact final inventory confirmation.

## 실제 온라인 휴지통·오프라인 파일 결합 검사

현재 정적 Web과 동일 출처의 로컬 게이트웨이, 제공자 로그인이 꺼진 전용 테스트 API/PostgreSQL을 준비한 뒤 다음을 실행한다. 운영용 컨테이너·실제 계정·보관 정책을 변경하는 명령이 아니다. API 이미지에 현재 휴지통 코드와007 migration이 포함되어 있어야 하며, 과거 이미지가 반환한 stateVersion 없는 목록을 현재 Web과 섞지 않는다.

```sh
KNOLSTORY_EVIDENCE_RUN=unique-new-run node server/operations/verify-online-trash-browser.mjs
```

고유 실행 폴더가 이미 있으면 실패해 이전 증거를 덮어쓰지 않는다. 두 제작 모드에서 실제 업로드·취소·휴지통·동일 ID/내용 revision 복구·휴지통 중 읽기 거절을 확인한다. 서버 처리 뒤 첫 응답만 버리는 전송 오류를 주입하고 같은 요청 키/본문으로 재시도되는지 확인한다. 브라우저를 잠시 오프라인으로 바꾸어 업로드 실패 시 원고 유지와 파일 다운로드도 확인한다. 파일 선택 API 미지원 분기를 명시해 다운로드를 검사하며 OS 파일 선택기의 검증을 대신하지 않는다. 작품 비교는 전체 원고/목록을 유지하고 재직렬화되는 문서 포장 savedAt만 제외한다. 끝나면 생성한 검사 계정만 비활성화하고 세션 폐기를 조회해 cleanup.json에 확인한다. 이는 장기 오프라인·실물 다중 기기·Google 로그인·자동 영구삭제 정책까지 증명하지 않는다.

[실제 결합 검증](../docs/architecture/evidence/online-trash-combined-2026-10-20/checkpoint.json).
