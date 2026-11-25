import { DatabaseSync } from 'node:sqlite';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.mjs';

const [source] = process.argv.slice(2);
const connectionString = process.env.DATABASE_URL;
if (!source || !connectionString) {
  console.error('Usage: set DATABASE_URL and pass a SQLite database path.');
  process.exit(1);
}

function readAccounts(path) {
  const database = new DatabaseSync(path, { readOnly: true });
  try {
    database.exec('BEGIN');
    const hasNicknames = database.prepare('PRAGMA table_info(users)').all()
      .some(column => column.name === 'display_name');
    const users = database.prepare(hasNicknames
      ? 'SELECT id, display_name AS "displayName" FROM users'
      : 'SELECT id, NULL AS "displayName" FROM users').all();
    const identities = database.prepare(
      'SELECT provider, subject, user_id AS "userId" FROM identities',
    ).all();
    database.exec('COMMIT');
    return { users, identities };
  } finally {
    database.close();
  }
}

let prisma;
try {
  const databaseUrl = new URL(connectionString);
  const schema = databaseUrl.searchParams.get('schema') ?? undefined;
  databaseUrl.searchParams.delete('schema');
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl.href }, { schema }),
  });
  const { users, identities } = readAccounts(source);
  await prisma.$transaction(async transaction => {
    await transaction.user.createMany({ data: users, skipDuplicates: true });
    await transaction.identity.createMany({ data: identities, skipDuplicates: true });

    const matchedUsers = await transaction.user.findMany({
      where: { id: { in: users.map(user => user.id) } },
      select: { id: true, displayName: true },
    });
    const names = new Map(matchedUsers.map(user => [user.id, user.displayName]));
    if (users.some(user => names.get(user.id) !== user.displayName)) {
      throw new Error('USER_CONFLICT');
    }
    const matchedIdentities = await transaction.identity.findMany({
      where: { userId: { in: users.map(user => user.id) } },
    });
    const owners = new Map(matchedIdentities.map(identity => [
      JSON.stringify([identity.provider, identity.subject]), identity.userId,
    ]));
    if (identities.some(identity =>
      owners.get(JSON.stringify([identity.provider, identity.subject])) !== identity.userId)) {
      throw new Error('IDENTITY_CONFLICT');
    }
  });
  console.log('Verified %d users and %d social identities in PostgreSQL.', users.length, identities.length);
} catch (error) {
  const reason = error instanceof Error && error.message === 'USER_CONFLICT' ? 'accounts or nicknames conflict'
    : error instanceof Error && error.message === 'IDENTITY_CONFLICT' ? 'social identities conflict'
    : 'check the SQLite path, DATABASE_URL and applied PostgreSQL migrations';
  console.error('SQLite import failed: %s.', reason);
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect();
}
