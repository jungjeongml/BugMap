/** @typedef {'callback' | 'expired' | 'network' | 'provider' | 'provider-unavailable' | 'session-unavailable' | 'storage' | 'unavailable'} AuthErrorKind */

export class AuthError extends Error {
  /** @param {AuthErrorKind} kind */
  constructor(kind) {
    super(kind);
    this.kind = kind;
  }
}

/** @param {string | undefined} value */
export function getAuthApiOrigin(value) {
  const url = value?.trim();
  if (!url || !/^https:\/\/[a-z\d.-]+(?::\d{1,5})?\/?$/i.test(url)) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname || (parsed.port && Number(parsed.port) > 65535)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

/** @param {Uint8Array} bytes */
export function hex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/** @param {string} value */
export function toBase64Url(value) {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
