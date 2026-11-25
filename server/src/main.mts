import { createAuthApp, parseWebOrigin } from './app.mjs';
import { createProviders } from './auth/providers.mjs';
import { AuthStore } from './auth/auth.store.mjs';

const origin = new URL(process.env.AUTH_PUBLIC_ORIGIN ?? '');
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.href !== origin.origin + '/') {
  throw new Error('AUTH_PUBLIC_ORIGIN must be an HTTPS origin');
}
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('Invalid PORT');
const webOrigin = parseWebOrigin(process.env.AUTH_WEB_ORIGIN);

const providers = await createProviders(origin, process.env);
if (!Object.keys(providers).length && process.env.AUTH_ALLOW_UNCONFIGURED !== 'true') {
  throw new Error('Configure at least one login provider');
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL must be configured');
const store = new AuthStore(databaseUrl);
try {
  await store.connect();
} catch (error) {
  await store.close();
  throw error;
}
const app = await createAuthApp(store, providers, webOrigin);
app.enableShutdownHooks();
await app.listen(port, '127.0.0.1');
console.info(`BugMap auth listening on 127.0.0.1:${port}`);
