import { getPublicMapboxToken, seoulForestCamera as camera } from '../../config/mapbox.mjs';

export const loginMapAttribution = [
  { label: '© Mapbox', url: 'https://www.mapbox.com/about/maps' },
  { label: '© OpenStreetMap', url: 'https://www.openstreetmap.org/copyright' },
  { label: 'Improve this map', url: `https://apps.mapbox.com/feedback/#/${camera.longitude}/${camera.latitude}/${camera.zoom}` },
] as const;

export function getLoginMapUrl(token: string | undefined): string | null {
  const publicToken = getPublicMapboxToken(token);
  if (!publicToken) return null;

  const position = `${camera.longitude},${camera.latitude},${camera.zoom},0,0`;
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${position}/390x844@2x?access_token=${publicToken}&attribution=false&logo=false`;
}

export type LoginMapResult = { uri: string; status: 'loaded' | 'failed' };

export function selectLoginMap(uri: string | null, result: LoginMapResult | null) {
  return uri && result?.uri === uri && result.status === 'loaded' ? 'mapbox' : 'illustration';
}
