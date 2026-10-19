# ADR 0024: Personal document service ownership and concurrency

- Status: Accepted implementation decision
- Date: 2026-10-16
- Scope: PC-04; follows ADR0023 identity/hosting and the authoring storage contract

## Decision

Keep service ownership outside StoryDocument. Generate server record UUIDs and
derive owner scopes from authenticated internal accounts. Migration006 adds
private document metadata and owner-scoped creation idempotency receipts beside
the existing records. Do not infer ownership or adopt unowned rows from content,
client project IDs or scope strings.

Expose authenticated create/list/read/update. Create starts revision1; updates
preserve the stored format/client project identity and use expected revision plus
idempotency key. Hash the full validated command for replay identity. Read snapshot,
revision and metadata under the same transaction/target locking boundary.

Hold session-family root, current session/account and target locks through commit.
Use the ordering already shared with login/logout, and recheck expiry before
commit. Atomically commit document, ownership, projection/blob and receipt changes.
Another owner's record has the same404 response as a missing record.

Use the asset-registry media gate once for both Web and new server writes. Reads
restore prior private content without applying the new-import gate. Do not strip
bytes or silently migrate authored content to obtain acceptance.

## Consequences

Online creation is an explicit future Web action; login alone does not upload or
claim guest works. Service IDs/revisions/permissions never enter authored formats.
Teacher access, sharing, ownership transfer, deletion/retention and publication
remain separately undecided. These endpoints do not grant those capabilities.

The API/transaction contract and verification evidence are owned by the
[storage contract](../architecture/authoring-storage-contract.md#소유자-전용-작품-api-2026-10-16).
Live provider login and Web synchronization require their own implementation and
actual environment evidence.
