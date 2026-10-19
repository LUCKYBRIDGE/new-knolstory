import { describe, expect, it } from 'vitest';
import {
  IdentityLinkError, linkGoogle, resolveLogin,
  type Account, type IdentityLinkPort, type IdentityTransaction, type VerifiedIdentity,
} from './identity-links';

const kakao = Object.freeze({ provider: 'kakao', subject: 'kakao-user' } as const);
const google = Object.freeze({ provider: 'google', subject: 'google-user' } as const);

/** Isolated serial transaction harness; deliberately not evidence of PostgreSQL isolation. */
function memoryPort(seed: readonly Account[] = [], failInsert = false) {
  let accounts = [...seed];
  let identities: { provider: string; subject: string; accountId: string }[] = [];
  let queue = Promise.resolve();
  const port: IdentityLinkPort = {
    async transaction<T>(action: (tx: IdentityTransaction) => Promise<T>) {
      const previous = queue;
      let release!: () => void;
      queue = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      let draftAccounts = [...accounts];
      let draftIdentities = [...identities];
      const tx: IdentityTransaction = {
        async findIdentity(identity) {
          return draftIdentities.find((row) => row.provider === identity.provider && row.subject === identity.subject)?.accountId ?? null;
        },
        async findAccount(id) { return draftAccounts.find((row) => row.id === id) ?? null; },
        async createAccount() {
          const account: Account = { id: `account-${draftAccounts.length + 1}`, status: 'active' };
          draftAccounts = [...draftAccounts, account];
          return account;
        },
        async insertIdentity(identity, accountId) {
          if (failInsert) throw new Error('injected storage failure');
          const existing = await tx.findIdentity(identity);
          if (existing) return existing === accountId ? 'already-linked' : 'conflict';
          draftIdentities = [...draftIdentities, { ...identity, accountId }];
          return 'inserted';
        },
      };
      try {
        const result = await action(tx);
        accounts = draftAccounts;
        identities = draftIdentities;
        return result;
      } finally { release(); }
    },
  };
  return { port, state: () => ({ accounts, identities }) };
}

async function rejectsCode(action: Promise<unknown>, code: IdentityLinkError['code']) {
  await expect(action).rejects.toMatchObject({ name: 'IdentityLinkError', code });
}

describe('provider identity boundary', () => {
  it('creates Kakao account and resolves repeat login to the same account', async () => {
    const { port, state } = memoryPort();
    const created = await resolveLogin(kakao, port);
    expect(created).toEqual({ accountId: 'account-1', created: true });
    expect(await resolveLogin(kakao, port)).toEqual({ accountId: created.accountId, created: false });
    expect(state().accounts).toHaveLength(1);
    expect(state().identities).toHaveLength(1);
    expect(kakao).toEqual({ provider: 'kakao', subject: 'kakao-user' });
  });

  it('never signs up an unknown Google identity', async () => {
    const { port, state } = memoryPort();
    await rejectsCode(resolveLogin(google, port), 'GOOGLE_NOT_LINKED');
    expect(state()).toEqual({ accounts: [], identities: [] });
  });

  it('links verified Google from a session, with both providers resolving the same account', async () => {
    const { port, state } = memoryPort();
    const { accountId } = await resolveLogin(kakao, port);
    const session = Object.freeze({ accountId });
    expect(await linkGoogle(session, google, port)).toEqual({ accountId, linked: true });
    expect(await linkGoogle(session, google, port)).toEqual({ accountId, linked: false });
    expect(await resolveLogin(google, port)).toEqual({ accountId, created: false });
    expect(await resolveLogin(kakao, port)).toEqual({ accountId, created: false });
    expect(state().accounts).toHaveLength(1);
  });

  it('denies missing sessions before touching storage', async () => {
    const { port } = memoryPort();
    await rejectsCode(linkGoogle(null, google, port), 'SESSION_REQUIRED');
    await rejectsCode(linkGoogle({ accountId: '' }, google, port), 'SESSION_REQUIRED');
  });

  it('does not move another account Google identity or merge accounts', async () => {
    const { port, state } = memoryPort();
    const first = await resolveLogin(kakao, port);
    const second = await resolveLogin({ ...kakao, subject: 'other' }, port);
    await linkGoogle(first, google, port);
    const before = state();
    await rejectsCode(linkGoogle(second, google, port), 'IDENTITY_ALREADY_LINKED');
    expect(state()).toEqual(before);
    expect((await resolveLogin(google, port)).accountId).toBe(first.accountId);
  });

  it.each(['inactive', 'deleted'] as const)('rejects %s accounts during login and linking', async (status) => {
    const { port } = memoryPort([{ id: 'blocked', status }]);
    await port.transaction(async (tx) => { await tx.insertIdentity(kakao, 'blocked'); });
    await rejectsCode(resolveLogin(kakao, port), 'ACCOUNT_UNAVAILABLE');
    await rejectsCode(linkGoogle({ accountId: 'blocked' }, google, port), 'ACCOUNT_UNAVAILABLE');
  });

  it('rejects dangling identities and missing session accounts', async () => {
    const { port } = memoryPort();
    await port.transaction(async (tx) => { await tx.insertIdentity(kakao, 'missing'); });
    await rejectsCode(resolveLogin(kakao, port), 'ACCOUNT_UNAVAILABLE');
    await rejectsCode(linkGoogle({ accountId: 'missing' }, google, port), 'ACCOUNT_UNAVAILABLE');
  });

  it.each([
    { provider: 'facebook', subject: 'id' },
    { provider: 'kakao', subject: '' },
    { provider: 'google', subject: '   ' },
    { provider: 'kakao', subject: 42 },
    null,
  ])('rejects invalid identity %#', async (identity) => {
    const { port } = memoryPort();
    await rejectsCode(resolveLogin(identity as VerifiedIdentity, port), 'INVALID_IDENTITY');
  });

  it('requires Google verification for the Google link command', async () => {
    const { port } = memoryPort();
    const account = await resolveLogin(kakao, port);
    await rejectsCode(linkGoogle(account, kakao, port), 'INVALID_IDENTITY');
  });

  it('keeps subjects opaque and provider-specific', async () => {
    const { port } = memoryPort();
    const account = await resolveLogin({ provider: 'kakao', subject: ' Case ' }, port);
    const other = await resolveLogin({ provider: 'kakao', subject: 'case' }, port);
    expect(other.accountId).not.toBe(account.accountId);
    await rejectsCode(resolveLogin({ provider: 'google', subject: ' Case ' }, port), 'GOOGLE_NOT_LINKED');
  });

  it('rolls back Kakao account creation when identity persistence fails', async () => {
    const { port, state } = memoryPort([], true);
    await expect(resolveLogin(kakao, port)).rejects.toThrow('injected storage failure');
    expect(state()).toEqual({ accounts: [], identities: [] });
  });

  it('makes concurrent repeated linking to the same account idempotent', async () => {
    const { port, state } = memoryPort();
    const account = await resolveLogin(kakao, port);
    const results = await Promise.all([linkGoogle(account, google, port), linkGoogle(account, google, port)]);
    expect(results).toEqual([
      { accountId: account.accountId, linked: true },
      { accountId: account.accountId, linked: false },
    ]);
    expect(state().identities).toHaveLength(2);
  });

  it('propagates transaction/lock failure without reporting login success', async () => {
    const port: IdentityLinkPort = { async transaction() { throw new Error('transaction unavailable'); } };
    await expect(resolveLogin(kakao, port)).rejects.toThrow('transaction unavailable');
    await expect(linkGoogle({ accountId: 'existing' }, google, port)).rejects.toThrow('transaction unavailable');
  });

  it('rolls back fresh account creation on a port-reported uniqueness conflict', async () => {
    const { port, state } = memoryPort();
    const conflicting: IdentityLinkPort = {
      transaction: (action) => port.transaction((tx) => action({
        ...tx, async insertIdentity() { return 'conflict'; },
      })),
    };
    await rejectsCode(resolveLogin(kakao, conflicting), 'IDENTITY_ALREADY_LINKED');
    expect(state()).toEqual({ accounts: [], identities: [] });
  });

  it.each([undefined, false, 'unexpected', 'already-linked'])('rolls back signup on non-insertion result %s', async (result) => {
    const { port, state } = memoryPort();
    const broken: IdentityLinkPort = {
      transaction: (action) => port.transaction((tx) => action({
        ...tx, async insertIdentity() { return result as 'inserted'; },
      })),
    };
    await rejectsCode(resolveLogin(kakao, broken), 'STORAGE_CONTRACT_VIOLATION');
    expect(state()).toEqual({ accounts: [], identities: [] });
  });

  it.each([undefined, false, 'unexpected'])('rejects invalid link adapter result %s', async (result) => {
    const { port, state } = memoryPort();
    const account = await resolveLogin(kakao, port);
    const before = state();
    const broken: IdentityLinkPort = {
      transaction: (action) => port.transaction((tx) => action({
        ...tx, async insertIdentity() { return result as 'inserted'; },
      })),
    };
    await rejectsCode(linkGoogle(account, google, broken), 'STORAGE_CONTRACT_VIOLATION');
    expect(state()).toEqual(before);
  });

  it('does not allow an adapter to mutate Google into a Kakao signup', async () => {
    const { port, state } = memoryPort();
    const mutating: IdentityLinkPort = {
      transaction: (action) => port.transaction((tx) => action({
        ...tx, async findIdentity(identity) {
          Object.assign(identity, { provider: 'kakao', subject: 'substituted' });
          return null;
        },
      })),
    };
    await rejectsCode(resolveLogin(google, mutating), 'GOOGLE_NOT_LINKED');
    expect(state()).toEqual({ accounts: [], identities: [] });
  });

  it('detaches Kakao identity and created account ID across awaited port calls', async () => {
    const { port, state } = memoryPort();
    let created: Account;
    const mutating: IdentityLinkPort = {
      transaction: (action) => port.transaction((tx) => action({
        ...tx,
        async findIdentity(identity) {
          Object.assign(identity, { subject: 'substituted' });
          return null;
        },
        async createAccount() { created = await tx.createAccount(); return created; },
        async findAccount(id) {
          const found = await tx.findAccount(id);
          Object.assign(created, { id: 'substituted-account' });
          return found ? { id, status: found.status } : null;
        },
        async insertIdentity(identity, accountId) {
          const result = await tx.insertIdentity(identity, accountId);
          Object.assign(identity, { subject: 'changed-again' });
          return result;
        },
      })),
    };
    expect(await resolveLogin(kakao, mutating)).toEqual({ accountId: 'account-1', created: true });
    expect(state().identities).toEqual([{ ...kakao, accountId: 'account-1' }]);
  });

  it('serializes concurrent Kakao signup and conflicting Google links', async () => {
    const { port, state } = memoryPort();
    const logins = await Promise.all([resolveLogin(kakao, port), resolveLogin(kakao, port)]);
    expect(logins.map((result) => result.accountId)).toEqual(['account-1', 'account-1']);
    const other = await resolveLogin({ ...kakao, subject: 'other' }, port);
    const results = await Promise.allSettled([linkGoogle(logins[0], google, port), linkGoogle(other, google, port)]);
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
    expect(state().identities.filter((identity) => identity.provider === 'google')).toHaveLength(1);
    expect(state().accounts).toHaveLength(2);
  });
});
