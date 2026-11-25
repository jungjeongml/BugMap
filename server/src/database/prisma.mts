import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.mjs';

export { Prisma } from '../generated/prisma/client.mjs';
export type { PrismaClient } from '../generated/prisma/client.mjs';

export function createPrismaClient(connectionString: string): PrismaClient {
  const url = new URL(connectionString);
  const schema = url.searchParams.get('schema') ?? undefined;
  url.searchParams.delete('schema');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url.href }, { schema }) });
}
