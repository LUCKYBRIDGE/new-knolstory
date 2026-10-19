/**
 * Internal command boundary, never an HTTP request schema or a token verifier.
 * Callers must supply identities from a trusted provider-specific OIDC verifier
 * (issuer, audience, signature, expiry, nonce/state checked) and accounts from a
 * trusted authenticated session. TypeScript shapes do not prove authentication.
 * Email, display names and client-supplied account IDs are never identity keys.
 */
export type VerifiedIdentity = Readonly<{ provider: 'kakao' | 'google'; subject: string }>;
export type AuthenticatedAccount = Readonly<{ accountId: string }>;
export type Account = Readonly<{ id: string; status: 'active' | 'inactive' | 'deleted' }>;
export type LoginResult = Readonly<{ accountId: string; created: boolean }>;
export type LinkResult = Readonly<{ accountId: string; linked: boolean }>;

type ErrorCode = 'INVALID_IDENTITY' | 'SESSION_REQUIRED' | 'ACCOUNT_UNAVAILABLE'
  | 'GOOGLE_NOT_LINKED' | 'IDENTITY_ALREADY_LINKED' | 'STORAGE_CONTRACT_VIOLATION';

export class IdentityLinkError extends Error {
  readonly name = 'IdentityLinkError';
  constructor(readonly code: ErrorCode) {
    super(code);
  }
}

export interface IdentityTransaction {
  findIdentity(identity: VerifiedIdentity): Promise<string | null>;
  findAccount(accountId: string): Promise<Account | null>;
  /** Generates a new internal ID; never accepts an ID or email from the caller. */
  createAccount(): Promise<Account>;
  /** Enforces UNIQUE(provider, subject) without transferring an existing link. */
  insertIdentity(identity: VerifiedIdentity, accountId: string): Promise<'inserted' | 'already-linked' | 'conflict'>;
}

export interface IdentityLinkPort {
  /**
   * Runs atomically, rolling back ALL writes on rejection. Must serialize account
   * status and identity reads/writes, or retry serialization/uniqueness conflicts
   * with a fresh transaction. Concurrent signups must return the single persisted
   * account. A lock only in one application process is insufficient for a DB port.
   * Identity and account rows cannot change after a read before this commit.
   */
  transaction<T>(action: (tx: IdentityTransaction) => Promise<T>): Promise<T>;
}

function checkedIdentity(value: VerifiedIdentity): VerifiedIdentity {
  if (!value || (value.provider !== 'kakao' && value.provider !== 'google')
    || typeof value.subject !== 'string' || !value.subject.trim()) {
    throw new IdentityLinkError('INVALID_IDENTITY');
  }
  // Preserve opaque, case-sensitive provider subjects; discard unrelated fields.
  return Object.freeze({ provider: value.provider, subject: value.subject });
}

async function activeAccount(tx: IdentityTransaction, accountId: string): Promise<Account> {
  const account = await tx.findAccount(accountId);
  if (!account || account.id !== accountId || account.status !== 'active') {
    throw new IdentityLinkError('ACCOUNT_UNAVAILABLE');
  }
  return { id: account.id, status: account.status };
}

async function insert(tx: IdentityTransaction, identity: VerifiedIdentity, accountId: string): Promise<boolean> {
  const result = await tx.insertIdentity({ ...identity }, accountId);
  if (result === 'conflict') throw new IdentityLinkError('IDENTITY_ALREADY_LINKED');
  if (result === 'inserted') return true;
  if (result === 'already-linked') return false;
  throw new IdentityLinkError('STORAGE_CONTRACT_VIOLATION');
}

/** Kakao creates accounts; Google login only resolves a previously explicit link. */
export async function resolveLogin(verified: VerifiedIdentity, port: IdentityLinkPort): Promise<LoginResult> {
  const identity = checkedIdentity(verified);
  return port.transaction(async (tx) => {
    const accountId = await tx.findIdentity({ ...identity });
    if (accountId !== null) {
      const account = await activeAccount(tx, accountId);
      return { accountId: account.id, created: false };
    }
    if (identity.provider === 'google') throw new IdentityLinkError('GOOGLE_NOT_LINKED');
    const createdAccountId = (await tx.createAccount()).id;
    await activeAccount(tx, createdAccountId);
    if (!await insert(tx, identity, createdAccountId)) {
      throw new IdentityLinkError('STORAGE_CONTRACT_VIOLATION');
    }
    return { accountId: createdAccountId, created: true };
  });
}

/** Explicit settings action; account identity comes exclusively from the session. */
export async function linkGoogle(
  authenticated: AuthenticatedAccount | null,
  verified: VerifiedIdentity,
  port: IdentityLinkPort,
): Promise<LinkResult> {
  if (!authenticated || typeof authenticated.accountId !== 'string' || !authenticated.accountId.trim()) {
    throw new IdentityLinkError('SESSION_REQUIRED');
  }
  const accountId = authenticated.accountId;
  const identity = checkedIdentity(verified);
  if (identity.provider !== 'google') throw new IdentityLinkError('INVALID_IDENTITY');
  return port.transaction(async (tx) => {
    const account = await activeAccount(tx, accountId);
    return { accountId: account.id, linked: await insert(tx, identity, account.id) };
  });
}
