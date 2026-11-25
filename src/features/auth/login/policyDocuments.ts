export const policyDocuments = {
  terms: '이용약관',
  privacy: '개인정보처리방침',
} as const;

export type PolicyDocument = keyof typeof policyDocuments;

export async function openPolicyDocument(
  document: PolicyDocument,
  openUrl: (url: string) => Promise<unknown>,
): Promise<'opened' | 'pending' | 'failed'> {
  const configuredUrl = document === 'terms'
    ? process.env.EXPO_PUBLIC_BUGMAP_TERMS_URL
    : process.env.EXPO_PUBLIC_BUGMAP_PRIVACY_URL;
  const url = configuredUrl?.trim();

  if (!url) return 'pending';

  // React Native's URL implementation does not reject all malformed authorities.
  const authority = /^https:\/\/(?:[^/?#\\@:\s]+|\[[a-f\d:.]+\])(?::(\d{1,5}))?(?=[/?#]|$)/i.exec(url);
  if (!authority || Number(authority[1] ?? 0) > 65535) return 'failed';

  try {
    if (!new URL('https://' + url.slice(8)).hostname) return 'failed';
    await openUrl(url);
    return 'opened';
  } catch {
    return 'failed';
  }
}
