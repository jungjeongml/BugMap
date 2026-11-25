import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from './generated/prisma/client.mjs';

export type ProviderId = 'kakao' | 'google' | 'apple';

export interface Authorization {
  provider: ProviderId;
  appState: string;
  challenge: string;
  nonce: string;
  providerVerifier: string;
}

interface UserProfile {
  userId: string;
  displayName: string | null;
}

interface AppSession extends UserProfile {
  accessToken: string;
  refreshToken: string;
}

const minute = 60_000;
export const stateLifetime = 10 * minute;
const codeLifetime = minute;
const accessLifetime = 15 * minute;
export const sessionLifetime = 30 * 24 * 60 * minute;

export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

export function digest(value: string): string {
  return createHash('sha256').update(value).digest('base64url');
}

const readCommitted = { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted };
const profile = { select: { displayName: true } } as const;

export class AuthStore {
  private readonly db: PrismaClient;

  constructor(connectionString: string) {
    const schema = new URL(connectionString).searchParams.get('schema') ?? undefined;
    this.db = new PrismaClient({ adapter: new PrismaPg({ connectionString }, { schema }) });
  }

  async connect(): Promise<void> {
    await this.db.user.findFirst({ select: { id: true } });
  }

  close(): Promise<void> {
    return this.db.$disconnect();
  }

  async createAuthorization(state: string, browser: string, authorization: Authorization): Promise<void> {
    const now = new Date();
    await this.db.$transaction([
      this.db.authorization.deleteMany({ where: { expiresAt: { lte: now } } }),
      this.db.appCode.deleteMany({ where: { expiresAt: { lte: now } } }),
      this.db.session.deleteMany({ where: { expiresAt: { lte: now } } }),
      this.db.authorization.create({ data: {
        ...authorization, stateHash: digest(state), browserHash: digest(browser),
        expiresAt: new Date(now.getTime() + stateLifetime),
      } }),
    ]);
  }

  async consumeAuthorization(provider: ProviderId, state: string, browser: string): Promise<Authorization | undefined> {
    const where = { stateHash: digest(state), browserHash: digest(browser), provider, expiresAt: { gt: new Date() } };
    const row = await this.db.authorization.findFirst({ where });
    if (!row) return;
    const consumed = await this.db.authorization.deleteMany({ where });
    if (!consumed.count) return;
    return { provider, appState: row.appState, challenge: row.challenge, nonce: row.nonce, providerVerifier: row.providerVerifier };
  }

  async createCode(authorization: Authorization, subject: string): Promise<string> {
    const code = randomToken();
    await this.db.appCode.create({ data: {
      codeHash: digest(code), provider: authorization.provider, subject,
      challenge: authorization.challenge, expiresAt: new Date(Date.now() + codeLifetime),
    } });
    return code;
  }

  async exchange(provider: ProviderId, code: string, verifier: string, scope = ''): Promise<AppSession | undefined> {
    return this.db.$transaction(async tx => {
      const now = Date.now();
      const where = { codeHash: digest(code), provider, challenge: scope + digest(verifier), expiresAt: { gt: new Date(now) } };
      const appCode = await tx.appCode.findFirst({ where, select: { subject: true } });
      if (!appCode || !(await tx.appCode.deleteMany({ where })).count) return;

      const { subject } = appCode;
      // Serialize provisioning for each identity across auth server instances.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${provider}), hashtext(${subject}))`;
      const existing = await tx.identity.findUnique({
        where: { provider_subject: { provider, subject } }, select: { userId: true, user: profile },
      });
      const userId = existing?.userId ?? randomUUID();
      if (!existing) {
        await tx.user.create({ data: { id: userId, identities: { create: { provider, subject } } } });
      }

      const id = randomUUID();
      const accessToken = `${id}.${randomToken()}`;
      const refreshToken = randomToken();
      await tx.session.create({ data: {
        id, userId, accessHash: digest(scope + accessToken), accessExpiresAt: new Date(now + accessLifetime),
        refreshHash: digest(scope + refreshToken), expiresAt: new Date(now + sessionLifetime),
      } });
      return { accessToken, refreshToken, userId, displayName: existing?.user.displayName ?? null };
    }, readCommitted);
  }

  async rotate(previousToken: string): Promise<AppSession | undefined> {
    return this.db.$transaction(async tx => {
      const now = new Date();
      const previousHash = digest(previousToken);
      const where = { refreshHash: previousHash, revokedAt: null, expiresAt: { gt: now } };
      const row = await tx.session.findUnique({
        where, select: { id: true, userId: true, expiresAt: true, user: profile },
      });
      if (!row) return;
      const accessToken = `${row.id}.${randomToken()}`;
      const refreshToken = randomToken();
      const rotated = await tx.session.updateMany({ where, data: {
        accessHash: digest(accessToken),
        accessExpiresAt: new Date(Math.min(now.getTime() + accessLifetime, row.expiresAt.getTime())),
        refreshHash: digest(refreshToken),
      } });
      if (!rotated.count) return;
      await tx.spentRefreshToken.create({ data: { refreshHash: previousHash, sessionId: row.id } });
      return { accessToken, refreshToken, userId: row.userId, displayName: row.user.displayName };
    }, readCommitted);
  }

  async revoke(refreshToken: string, scope = ''): Promise<boolean> {
    const now = new Date();
    const refreshHash = digest(scope + refreshToken);
    const active = { revokedAt: null, expiresAt: { gt: now } };
    return this.db.$transaction(async tx => {
      const revoked = await tx.session.updateMany({ where: { ...active, refreshHash }, data: { revokedAt: now } });
      if (revoked.count) return true;

      // Take a fresh snapshot after the first update has waited for any concurrent rotation.
      const spent = await tx.spentRefreshToken.findUnique({ where: { refreshHash }, select: { sessionId: true } });
      if (!spent) return false;
      const revokedSpent = await tx.session.updateMany({
        where: { ...active, id: spent.sessionId }, data: { revokedAt: now },
      });
      return Boolean(revokedSpent.count);
    }, readCommitted);
  }

  async findSessionUser(refreshToken: string, scope: string): Promise<UserProfile | undefined> {
    const row = await this.db.session.findUnique({
      where: { refreshHash: digest(scope + refreshToken), expiresAt: { gt: new Date() }, revokedAt: null },
      select: { userId: true, user: profile },
    });
    return row ? { userId: row.userId, displayName: row.user.displayName } : undefined;
  }

  async findAccessUser(accessToken: string): Promise<UserProfile | undefined> {
    const now = new Date();
    const id = accessToken.split('.', 1)[0];
    const row = await this.db.session.findUnique({
      where: { id, accessHash: digest(accessToken), accessExpiresAt: { gt: now }, expiresAt: { gt: now }, revokedAt: null },
      select: { userId: true, user: profile },
    });
    return row ? { userId: row.userId, displayName: row.user.displayName } : undefined;
  }

  async setupNickname(userId: string, displayName: string): Promise<UserProfile | null> {
    try {
      const saved = await this.db.user.updateMany({ where: { id: userId, displayName: null }, data: { displayName } });
      if (saved.count) return { userId, displayName };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    }
    const user = await this.db.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    return user?.displayName ? { userId, displayName: user.displayName } : null;
  }
}
