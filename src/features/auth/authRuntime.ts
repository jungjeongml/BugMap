import type { AuthClient } from './authClient';

export type AuthRuntime =
  | { status: 'ready'; client: AuthClient }
  | { status: 'mobile-only' | 'missing-server' | 'expo-go' };

export const authRuntime: AuthRuntime = { status: 'mobile-only' };
