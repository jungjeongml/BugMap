export function isDiscoveryMapPreview(isDevelopment: boolean, platform: string, search?: string): boolean {
  return isDevelopment && platform === 'web' && new URLSearchParams(search).get('preview') === 'discovery-map';
}
