import type { AuthRuntime } from './authRuntime';
import { createWebAuthClient, getWebAuthConfig } from './webAuthClient';

function createAuthRuntime(): AuthRuntime {
  if (typeof window === 'undefined') return { status: 'mobile-only' };

  const config = getWebAuthConfig(
    process.env.EXPO_PUBLIC_BUGMAP_AUTH_API_URL,
    process.env.EXPO_PUBLIC_BUGMAP_WEB_AUTH_ORIGIN,
    window.location.origin,
  );
  if (config.status !== 'ready') return config;
  if (!window.crypto?.subtle) return { status: 'web-crypto-unavailable' };

  return {
    status: 'ready',
    client: createWebAuthClient(config, {
      crypto: window.crypto,
      now: Date.now,
      getStorage: () => window.sessionStorage,
      getLocation: () => window.location.href,
      replaceLocation: url => window.history.replaceState(window.history.state, '', url),
      navigate: url => window.location.assign(url),
      request: (path, options) => window.fetch(path, options),
    }),
  };
}

export const authRuntime = createAuthRuntime();
