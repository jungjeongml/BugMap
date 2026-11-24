import type { AuthProvider, AuthSession } from './authClient';

export type VerifiedAuthSession = Pick<AuthSession, 'userId' | 'displayName'> & Partial<Pick<AuthSession, 'accessToken'>>;

type CompletedSignIn = { kind: 'cancelled' } | { kind: 'authenticated'; session: VerifiedAuthSession };

type RuntimeClient = {
  signIn: (provider: AuthProvider) => Promise<CompletedSignIn | { kind: 'redirected' }>;
  completeSignIn?: () => Promise<CompletedSignIn | null>;
  restoreSession: () => Promise<VerifiedAuthSession | null>;
  saveNickname: (session: VerifiedAuthSession, displayName: string) => Promise<VerifiedAuthSession>;
  signOut: () => Promise<void>;
};

export type AuthRuntime =
  | { status: 'ready'; client: RuntimeClient }
  | { status: 'mobile-only' | 'missing-server' | 'expo-go' | 'missing-web-origin' | 'web-origin-mismatch' | 'web-crypto-unavailable' };

export const authRuntime: AuthRuntime = { status: 'mobile-only' };
