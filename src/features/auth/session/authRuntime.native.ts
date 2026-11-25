import { isRunningInExpoGo } from 'expo';
import * as Crypto from 'expo-crypto';
import { fetch } from 'expo/fetch';
import * as SecureStore from 'expo-secure-store';
import { openAuthSessionAsync } from 'expo-web-browser';
import { Platform } from 'react-native';
import { createAuthClient, getAuthApiOrigin } from './authClient';
import type { AuthRuntime } from './authRuntime';

const refreshTokenKey = 'bugmap.auth.refreshToken';
const secureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

function createAuthRuntime(): AuthRuntime {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return { status: 'mobile-only' };
  if (isRunningInExpoGo()) return { status: 'expo-go' };

  const apiOrigin = getAuthApiOrigin(process.env.EXPO_PUBLIC_BUGMAP_AUTH_API_URL);
  if (!apiOrigin) return { status: 'missing-server' };

  return {
    status: 'ready',
    client: createAuthClient(apiOrigin, {
      randomBytes: Crypto.getRandomBytesAsync,
      sha256Base64: input => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, {
        encoding: Crypto.CryptoEncoding.BASE64,
      }),
      openAuthSession: openAuthSessionAsync,
      request: fetch,
      refreshTokens: {
        read: () => SecureStore.getItemAsync(refreshTokenKey, secureStoreOptions),
        write: token => SecureStore.setItemAsync(refreshTokenKey, token, secureStoreOptions),
        remove: () => SecureStore.deleteItemAsync(refreshTokenKey, secureStoreOptions),
      },
    }),
  };
}

export const authRuntime = createAuthRuntime();
