import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export type ProviderId = 'kakao' | 'google' | 'apple';

export interface Authorization {
  provider: ProviderId;
  appState: string;
  challenge: string;
  nonce: string;
  providerVerifier: string;
}

interface AppSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

const minute = 60_000;
export const stateLifetime = 10 * minute;
const codeLifetime = minute;
const accessLifetime = 15 * minute;
const sessionLifetime = 30 * 24 * 60 * minute;

export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

export function digest(value: string): string {
  return createHash('sha256').update(value).digest('base64url');
}

export class AuthStore {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA busy_timeout = 5000;
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS authorizations (
        state_hash TEXT PRIMARY KEY,
        browser_hash TEXT NOT NULL,
        provider TEXT NOT NULL,
        app_state TEXT NOT NULL,
        challenge TEXT NOT NULL,
        nonce TEXT NOT NULL,
        provider_verifier TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS authorizations_expiry ON authorizations(expires_at);
      CREATE TABLE IF NOT EXISTS app_codes (
        code_hash TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        subject TEXT NOT NULL,
        challenge TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS app_codes_expiry ON app_codes(expires_at);
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY) STRICT;
      CREATE TABLE IF NOT EXISTS identities (
        provider TEXT NOT NULL,
        subject TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id),
        PRIMARY KEY (provider, subject)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        access_hash TEXT NOT NULL,
        access_expires_at INTEGER NOT NULL,
        refresh_hash TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        revoked_at INTEGER
      ) STRICT;
      CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
      CREATE TABLE IF NOT EXISTS spent_refresh_tokens (
        refresh_hash TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE
      ) STRICT;
      CREATE INDEX IF NOT EXISTS spent_refresh_session ON spent_refresh_tokens(session_id);
    `);
  }

  close(): void {
    this.db.close();
  }

  createAuthorization(state: string, browser: string, authorization: Authorization): void {
    const now = Date.now();
    this.db.prepare('DELETE FROM authorizations WHERE expires_at <= ?').run(now);
    this.db.prepare('DELETE FROM app_codes WHERE expires_at <= ?').run(now);
    this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
    this.db.prepare(`
      INSERT INTO authorizations (
        state_hash, browser_hash, provider, app_state, challenge, nonce, provider_verifier, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      digest(state), digest(browser), authorization.provider, authorization.appState,
      authorization.challenge, authorization.nonce, authorization.providerVerifier, now + stateLifetime,
    );
  }

  consumeAuthorization(provider: ProviderId, state: string, browser: string): Authorization | undefined {
    return this.db.prepare(`
      DELETE FROM authorizations
      WHERE state_hash = ? AND browser_hash = ? AND provider = ? AND expires_at > ?
      RETURNING provider, app_state AS appState, challenge, nonce, provider_verifier AS providerVerifier
    `).get(digest(state), digest(browser), provider, Date.now()) as Authorization | undefined;
  }

  createCode(authorization: Authorization, subject: string): string {
    const code = randomToken();
    this.db.prepare(`
      INSERT INTO app_codes (code_hash, provider, subject, challenge, expires_at) VALUES (?, ?, ?, ?, ?)
    `).run(digest(code), authorization.provider, subject, authorization.challenge, Date.now() + codeLifetime);
    return code;
  }

  exchange(provider: ProviderId, code: string, verifier: string): AppSession | undefined {
    return this.transaction(() => {
      const now = Date.now();
      const identity = this.db.prepare(`
        DELETE FROM app_codes WHERE code_hash = ? AND provider = ? AND challenge = ? AND expires_at > ?
        RETURNING subject
      `).get(digest(code), provider, digest(verifier), now) as { subject: string } | undefined;
      if (!identity) return;
      const existing = this.db.prepare(
        'SELECT user_id AS userId FROM identities WHERE provider = ? AND subject = ?',
      ).get(provider, identity.subject) as { userId: string } | undefined;

      const userId = existing?.userId ?? randomUUID();
      if (!existing) {
        this.db.prepare('INSERT INTO users (id) VALUES (?)').run(userId);
        this.db.prepare('INSERT INTO identities (provider, subject, user_id) VALUES (?, ?, ?)').run(
          provider, identity.subject, userId,
        );
      }

      const sessionId = randomUUID();
      const accessToken = `${sessionId}.${randomToken()}`;
      const refreshToken = randomToken();
      this.db.prepare(`
        INSERT INTO sessions (id, user_id, access_hash, access_expires_at, refresh_hash, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(sessionId, userId, digest(accessToken), now + accessLifetime, digest(refreshToken), now + sessionLifetime);
      return { accessToken, refreshToken, userId };
    });
  }

  rotate(previousToken: string): AppSession | undefined {
    return this.transaction(() => {
      const now = Date.now();
      const previousHash = digest(previousToken);
      const row = this.db.prepare(`
        SELECT id, user_id AS userId, expires_at AS expiresAt FROM sessions
        WHERE refresh_hash = ? AND revoked_at IS NULL AND expires_at > ?
      `).get(previousHash, now) as { id: string; userId: string; expiresAt: number } | undefined;
      if (!row) return;
      const accessToken = `${row.id}.${randomToken()}`;
      const refreshToken = randomToken();
      this.db.prepare('INSERT INTO spent_refresh_tokens (refresh_hash, session_id) VALUES (?, ?)').run(previousHash, row.id);
      this.db.prepare(`
        UPDATE sessions SET access_hash = ?, access_expires_at = ?, refresh_hash = ? WHERE id = ?
      `).run(digest(accessToken), Math.min(now + accessLifetime, row.expiresAt), digest(refreshToken), row.id);
      return { accessToken, refreshToken, userId: row.userId };
    });
  }

  revoke(refreshToken: string): boolean {
    const now = Date.now();
    const hash = digest(refreshToken);
    return Boolean(this.db.prepare(`
      UPDATE sessions SET revoked_at = ?
      WHERE revoked_at IS NULL AND expires_at > ?
        AND (refresh_hash = ? OR id = (SELECT session_id FROM spent_refresh_tokens WHERE refresh_hash = ?))
    `).run(now, now, hash, hash).changes);
  }

  findAccessUser(accessToken: string): { userId: string } | undefined {
    const now = Date.now();
    const sessionId = accessToken.split('.', 1)[0];
    return this.db.prepare(`
      SELECT user_id AS userId FROM sessions
      WHERE id = ? AND access_hash = ? AND access_expires_at > ? AND expires_at > ? AND revoked_at IS NULL
    `).get(sessionId, digest(accessToken), now, now) as { userId: string } | undefined;
  }

  private transaction<T>(run: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = run();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
